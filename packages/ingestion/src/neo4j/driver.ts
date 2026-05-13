import neo4j, { Driver, Session, ManagedTransaction } from 'neo4j-driver';
import { getConfig } from '../config';
import pino from 'pino';

const logger = pino({ name: 'neo4j-driver' });
let _driver: Driver | null = null;

export function getDriver(): Driver {
  if (!_driver) {
    const config = getConfig();
    _driver = neo4j.driver(
      config.NEO4J_URI,
      neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        maxTransactionRetryTime: 30000,
      }
    );
    logger.info('Neo4j driver initialized');
  }
  return _driver;
}

// Fixed: Takes zero arguments to prevent the 'Expected 0, got 1' error
export function getSession(): Session {
  return getDriver().session();
}

export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj: Record<string, unknown> = {};
      record.keys.forEach((key) => {
        const value = record.get(key);
        obj[key as string] = convertNeo4jValue(value);
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

// Fixed: Removed the 'database' argument entirely
export async function runWriteTransaction(
  work: (tx: any) => Promise<void>
): Promise<void> {
  const session = getSession();
  try {
    await session.executeWrite(work);
  } finally {
    await session.close();
  }
}

// Fixed: Removed the database parameter and added : any to tx
export async function runBatchedWrite(
  cypher: string,
  items: any[],
  batchSize = 500
): Promise<number> {
  let totalProcessed = 0;
  const session = getSession();

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await session.executeWrite(async (tx: any) => {
        await tx.run(cypher, { batch });
      });
      totalProcessed += batch.length;
    }
    return totalProcessed;
  } finally {
    await session.close();
  }
}

export async function verifyConnectivity(): Promise<boolean> {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    logger.info('Neo4j connectivity verified');
    return true;
  } catch (error) {
    logger.error({ error }, 'Neo4j connectivity check failed');
    return false;
  }
}

export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
    logger.info('Neo4j driver closed');
  }
}

// --- Helper function kept below ---
function convertNeo4jValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return (value as any).toNumber();
  if (neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isLocalDateTime(value)) return value.toString();
  if (neo4j.isDuration(value)) return value.toString();
  if (typeof value === 'object' && value !== null && 'properties' in value && 'labels' in value) {
    const node = value as any;
    const converted: any = {};
    for (const [k, v] of Object.entries(node.properties)) converted[k] = convertNeo4jValue(v);
    converted._labels = node.labels;
    return converted;
  }
  if (typeof value === 'object' && value !== null && 'properties' in value && 'type' in value) {
    const rel = value as any;
    const converted: any = {};
    for (const [k, v] of Object.entries(rel.properties)) converted[k] = convertNeo4jValue(v);
    converted._type = rel.type;
    return converted;
  }
  if (Array.isArray(value)) return value.map(convertNeo4jValue);
  if (typeof value === 'object' && value !== null) {
    const converted: any = {};
    for (const [k, v] of Object.entries(value as any)) converted[k] = convertNeo4jValue(v);
    return converted;
  }
  return value;
}