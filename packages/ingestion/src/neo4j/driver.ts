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
        logging: {
          level: 'warn',
          logger: (level, message) => {
            if (level === 'error') logger.error(message);
            else if (level === 'warn') logger.warn(message);
          },
        },
      }
    );
    logger.info('Neo4j driver initialized');
  }
  return _driver;
}

export function getSession(database = 'neo4j'): Session {
  return getDriver().session({ database });
}

export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
  database = 'neo4j'
): Promise<T[]> {
  const session = getSession(database);
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

export async function runWriteTransaction(
  work: (tx: ManagedTransaction) => Promise<void>,
  database = 'neo4j'
): Promise<void> {
  const session = getSession(database);
  try {
    await session.executeWrite(work);
  } finally {
    await session.close();
  }
}

export async function runBatchedWrite(
  cypher: string,
  items: Record<string, unknown>[] | object[],
  batchSize = 500,
  database = 'neo4j'
): Promise<number> {
  let totalProcessed = 0;
  const session = getSession(database);

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await session.executeWrite(async (tx) => {
        await tx.run(cypher, { batch });
      });
      totalProcessed += batch.length;
    }
  } finally {
    await session.close();
  }

  return totalProcessed;
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

function convertNeo4jValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Neo4j Integer
  if (neo4j.isInt(value)) {
    return (value as { toNumber(): number }).toNumber();
  }

  // Neo4j Date/DateTime
  if (neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isLocalDateTime(value)) {
    return (value as { toString(): string }).toString();
  }

  // Neo4j Duration
  if (neo4j.isDuration(value)) {
    return (value as { toString(): string }).toString();
  }

  // Node
  if (typeof value === 'object' && value !== null && 'properties' in value && 'labels' in value) {
    const node = value as { properties: Record<string, unknown>; labels: string[] };
    const converted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node.properties)) {
      converted[k] = convertNeo4jValue(v);
    }
    converted._labels = node.labels;
    return converted;
  }

  // Relationship
  if (typeof value === 'object' && value !== null && 'properties' in value && 'type' in value) {
    const rel = value as { properties: Record<string, unknown>; type: string };
    const converted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rel.properties)) {
      converted[k] = convertNeo4jValue(v);
    }
    converted._type = rel.type;
    return converted;
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(convertNeo4jValue);
  }

  // Plain object
  if (typeof value === 'object' && value !== null) {
    const converted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      converted[k] = convertNeo4jValue(v);
    }
    return converted;
  }

  return value;
}
