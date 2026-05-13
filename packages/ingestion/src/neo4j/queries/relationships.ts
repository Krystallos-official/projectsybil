import { runQuery, runBatchedWrite } from '../driver';

export interface RelationshipInput {
  fromId: string;
  toId: string;
  type: string;
  weight: number;
  properties?: Record<string, unknown>;
}

/**
 * Merge a weighted relationship, accumulating weight idempotently.
 * Uses MERGE + SET weight = COALESCE(weight, 0) + increment.
 * This is how we accumulate interaction weights safely across multiple syncs.
 */
export async function mergeWeight(
  fromId: string,
  toId: string,
  relType: string,
  increment: number,
  extraProps?: Record<string, unknown>
): Promise<void> {
  // Build SET clause for extra properties
  let extraSetClause = '';
  const params: Record<string, unknown> = {
    fromId,
    toId,
    increment,
  };

  if (extraProps) {
    const setParts: string[] = [];
    for (const [key, value] of Object.entries(extraProps)) {
      const paramName = `extra_${key}`;
      params[paramName] = value;
      // For array properties like 'channels', we append rather than replace
      if (Array.isArray(value)) {
        setParts.push(
          `r.${key} = CASE WHEN r.${key} IS NULL THEN $${paramName} ` +
            `ELSE [x IN r.${key} WHERE NOT x IN $${paramName}] + $${paramName} END`
        );
      } else {
        setParts.push(`r.${key} = $${paramName}`);
      }
    }
    if (setParts.length > 0) {
      extraSetClause = ', ' + setParts.join(', ');
    }
  }

  // Dynamic relationship type requires string interpolation (safe — relType is from our code, not user input)
  const validRelTypes = [
    'COLLABORATES_WITH',
    'REVIEWS',
    'COMMITS_TO',
    'MESSAGES',
    'ASSIGNED_TO',
    'BLOCKS',
    'OWNS',
    'USES',
    'DEPENDS_ON',
    'PART_OF',
    'BELONGS_TO',
    'SNAPSHOT_SCORE',
  ];

  if (!validRelTypes.includes(relType)) {
    throw new Error(`Invalid relationship type: ${relType}. Allowed: ${validRelTypes.join(', ')}`);
  }

  // Determine target node type based on relationship
  let matchClause: string;
  if (relType === 'COMMITS_TO') {
    matchClause = `MATCH (a:Employee {id: $fromId})\nMATCH (b:Repository {url: $toId})`;
  } else if (relType === 'ASSIGNED_TO') {
    matchClause = `MATCH (a:Employee {id: $fromId})\nMATCH (b:Project {name: $toId})`;
  } else if (relType === 'USES') {
    matchClause = `MATCH (a:Employee {id: $fromId})\nMATCH (b:SaaS_Tool {id: $toId})`;
  } else if (relType === 'PART_OF') {
    matchClause = `MATCH (a:Repository {url: $fromId})\nMATCH (b:Project {name: $toId})`;
  } else if (relType === 'DEPENDS_ON') {
    matchClause = `MATCH (a:Project {name: $fromId})\nMATCH (b {name: $toId})`;
  } else {
    matchClause = `MATCH (a:Employee {id: $fromId})\nMATCH (b:Employee {id: $toId})`;
  }

  const cypher = `
    ${matchClause}
    MERGE (a)-[r:${relType}]->(b)
    SET r.weight = COALESCE(r.weight, 0) + $increment
    ${extraSetClause}
  `;

  await runQuery(cypher, params);
}

/**
 * Batch merge weighted relationships for high-throughput ingestion.
 */
export async function mergeWeightBatch(relationships: RelationshipInput[]): Promise<number> {
  // Group by relationship type for efficient batch processing
  const grouped = new Map<string, RelationshipInput[]>();

  for (const rel of relationships) {
    if (!grouped.has(rel.type)) {
      grouped.set(rel.type, []);
    }
    grouped.get(rel.type)!.push(rel);
  }

  let totalProcessed = 0;

  for (const [relType, rels] of grouped) {
    for (const rel of rels) {
      await mergeWeight(rel.fromId, rel.toId, relType, rel.weight, rel.properties);
      totalProcessed++;
    }
  }

  return totalProcessed;
}

/**
 * Set ownership relationship with ownership score.
 */
export async function setOwnership(
  employeeId: string,
  targetId: string,
  targetType: 'Project' | 'Repository',
  ownershipScore: number,
  source: string = 'inferred'
): Promise<void> {
  const targetMatch =
    targetType === 'Repository' ? `(b:Repository {url: $targetId})` : `(b:Project {name: $targetId})`;

  await runQuery(
    `
    MATCH (a:Employee {id: $employeeId})
    MATCH ${targetMatch}
    MERGE (a)-[r:OWNS]->(b)
    SET r.ownership_score = $ownershipScore,
        r.source = $source,
        r.since = COALESCE(r.since, date())
    `,
    { employeeId, targetId, ownershipScore, source }
  );
}

/**
 * Get all relationships for the full graph view.
 */
export async function getAllRelationships(): Promise<Record<string, unknown>[]> {
  return runQuery(`
    MATCH (a:Employee)-[r]->(b)
    WHERE type(r) IN ['COLLABORATES_WITH', 'REVIEWS', 'COMMITS_TO', 'MESSAGES', 'ASSIGNED_TO', 'BLOCKS', 'OWNS']
    RETURN 
      a.id AS source,
      b.id AS target,
      COALESCE(b.url, b.name, b.id) AS target_id,
      type(r) AS rel_type,
      COALESCE(r.weight, 1) AS weight,
      labels(b)[0] AS target_label
  `);
}

/**
 * Get all employee-to-employee relationships for graph analysis.
 */
export async function getEmployeeRelationships(): Promise<Record<string, unknown>[]> {
  return runQuery(`
    MATCH (a:Employee)-[r]->(b:Employee)
    WHERE type(r) IN ['COLLABORATES_WITH', 'REVIEWS', 'MESSAGES', 'BLOCKS']
    RETURN 
      a.id AS source,
      b.id AS target,
      type(r) AS rel_type,
      COALESCE(r.weight, 1) AS weight
  `);
}
