import { runQuery } from './driver';
import pino from 'pino';

const logger = pino({ name: 'neo4j-schema' });

const CONSTRAINTS = [
  {
    name: 'employee_id',
    cypher: 'CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE',
  },
  {
    name: 'project_name',
    cypher: 'CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE',
  },
  {
    name: 'repo_url',
    cypher: 'CREATE CONSTRAINT repo_url IF NOT EXISTS FOR (r:Repository) REQUIRE r.url IS UNIQUE',
  },
  {
    name: 'tool_id',
    cypher: 'CREATE CONSTRAINT tool_id IF NOT EXISTS FOR (t:SaaS_Tool) REQUIRE t.id IS UNIQUE',
  },
  {
    name: 'department_id',
    cypher: 'CREATE CONSTRAINT department_id IF NOT EXISTS FOR (d:Department) REQUIRE d.id IS UNIQUE',
  },
  {
    name: 'snapshot_id',
    cypher: 'CREATE CONSTRAINT snapshot_id IF NOT EXISTS FOR (s:AnalysisSnapshot) REQUIRE s.id IS UNIQUE',
  },
];

const INDEXES = [
  {
    name: 'employee_department',
    cypher: 'CREATE INDEX employee_department IF NOT EXISTS FOR (e:Employee) ON (e.department)',
  },
  {
    name: 'employee_risk_tier',
    cypher: 'CREATE INDEX employee_risk_tier IF NOT EXISTS FOR (e:Employee) ON (e.risk_tier)',
  },
  {
    name: 'employee_fragility',
    cypher: 'CREATE INDEX employee_fragility IF NOT EXISTS FOR (e:Employee) ON (e.fragility_score)',
  },
  {
    name: 'snapshot_timestamp',
    cypher: 'CREATE INDEX snapshot_timestamp IF NOT EXISTS FOR (s:AnalysisSnapshot) ON (s.created_at)',
  },
];

export async function initializeSchema(): Promise<void> {
  logger.info('Initializing Neo4j schema...');

  // Create constraints
  for (const constraint of CONSTRAINTS) {
    try {
      await runQuery(constraint.cypher);
      logger.info(`Constraint created/verified: ${constraint.name}`);
    } catch (error) {
      // Constraint may already exist — that's fine
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('already exists') && !message.includes('An equivalent constraint already exists')) {
        logger.error({ error, constraint: constraint.name }, 'Failed to create constraint');
        throw error;
      }
      logger.debug(`Constraint already exists: ${constraint.name}`);
    }
  }

  // Create indexes
  for (const index of INDEXES) {
    try {
      await runQuery(index.cypher);
      logger.info(`Index created/verified: ${index.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('already exists') && !message.includes('An equivalent index already exists')) {
        logger.error({ error, index: index.name }, 'Failed to create index');
        throw error;
      }
      logger.debug(`Index already exists: ${index.name}`);
    }
  }

  logger.info(`Schema initialization complete: ${CONSTRAINTS.length} constraints, ${INDEXES.length} indexes`);
}
