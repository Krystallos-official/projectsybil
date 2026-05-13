import { runQuery, runBatchedWrite } from '../driver';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisScoreInput {
  employeeId: string;
  betweenness_centrality: number;
  pagerank_score: number;
  degree_centrality: number;
  redundancy_score: number;
  fragility_score: number;
  risk_tier: string;
  community_id: number;
  community_label: string;
  structural_hole_score?: number;
}

export interface SnapshotInput {
  employee_count: number;
  critical_spofs: number;
  high_risk_nodes: number;
  avg_fragility: number;
  top_spof_id: string;
  algorithm_versions: Record<string, string>;
}

/**
 * Write analysis scores to employee nodes and create snapshot relationships.
 */
export async function writeAnalysisScores(
  scores: AnalysisScoreInput[],
  snapshotId: string
): Promise<number> {
  return runBatchedWrite(
    `
    UNWIND $batch AS score
    MATCH (e:Employee {id: score.employeeId})
    SET e.betweenness_centrality = score.betweenness_centrality,
        e.pagerank_score = score.pagerank_score,
        e.degree_centrality = score.degree_centrality,
        e.redundancy_score = score.redundancy_score,
        e.fragility_score = score.fragility_score,
        e.risk_tier = score.risk_tier,
        e.community_id = score.community_id,
        e.community_label = score.community_label,
        e.last_analyzed = datetime()
    WITH e, score
    MATCH (s:AnalysisSnapshot {id: $snapshotId})
    MERGE (e)-[r:SNAPSHOT_SCORE]->(s)
    SET r.fragility_score = score.fragility_score,
        r.betweenness = score.betweenness_centrality,
        r.risk_tier = score.risk_tier
    `,
    scores.map((s) => ({ ...s, snapshotId })),
    500
  );
}

/**
 * Create an AnalysisSnapshot node to record a point-in-time analysis.
 */
export async function createSnapshot(input: SnapshotInput): Promise<string> {
  const id = uuidv4();
  await runQuery(
    `
    CREATE (s:AnalysisSnapshot {
      id: $id,
      created_at: datetime(),
      employee_count: $employee_count,
      critical_spofs: $critical_spofs,
      high_risk_nodes: $high_risk_nodes,
      avg_fragility: $avg_fragility,
      top_spof_id: $top_spof_id,
      algorithm_versions: $algorithm_versions
    })
    `,
    {
      id,
      employee_count: input.employee_count,
      critical_spofs: input.critical_spofs,
      high_risk_nodes: input.high_risk_nodes,
      avg_fragility: input.avg_fragility,
      top_spof_id: input.top_spof_id,
      algorithm_versions: JSON.stringify(input.algorithm_versions),
    }
  );
  return id;
}

/**
 * Get all snapshots ordered by creation time descending.
 */
export async function getSnapshots(limit = 50): Promise<Record<string, unknown>[]> {
  return runQuery(
    `
    MATCH (s:AnalysisSnapshot)
    RETURN s
    ORDER BY s.created_at DESC
    LIMIT $limit
    `,
    { limit }
  );
}

/**
 * Get temporal fragility data for a specific employee across snapshots.
 */
export async function getTemporalScores(
  employeeId: string,
  limit = 12
): Promise<Record<string, unknown>[]> {
  return runQuery(
    `
    MATCH (e:Employee {id: $employeeId})-[r:SNAPSHOT_SCORE]->(s:AnalysisSnapshot)
    RETURN 
      s.id AS snapshot_id,
      s.created_at AS date,
      r.fragility_score AS fragility_score,
      r.betweenness AS betweenness,
      r.risk_tier AS risk_tier
    ORDER BY s.created_at DESC
    LIMIT $limit
    `,
    { employeeId, limit }
  );
}

/**
 * Get graph state at a specific snapshot point in time.
 */
export async function getGraphAtSnapshot(snapshotId: string): Promise<Record<string, unknown>[]> {
  return runQuery(
    `
    MATCH (e:Employee)-[r:SNAPSHOT_SCORE]->(s:AnalysisSnapshot {id: $snapshotId})
    RETURN 
      e.id AS id,
      e.name AS name,
      e.department AS department,
      e.role AS role,
      r.fragility_score AS fragility_score,
      r.betweenness AS betweenness,
      r.risk_tier AS risk_tier,
      e.community_id AS community_id,
      e.community_label AS community_label
    ORDER BY r.fragility_score DESC
    `,
    { snapshotId }
  );
}

/**
 * Get summary statistics for the dashboard metrics bar.
 */
export async function getMetricsSummary(): Promise<Record<string, unknown>> {
  const results = await runQuery(`
    MATCH (e:Employee)
    WITH count(e) AS total_nodes,
         count(CASE WHEN e.risk_tier = 'critical' THEN 1 END) AS critical_count,
         count(CASE WHEN e.risk_tier = 'high' THEN 1 END) AS high_count,
         count(CASE WHEN e.risk_tier = 'medium' THEN 1 END) AS medium_count,
         count(CASE WHEN e.risk_tier = 'low' THEN 1 END) AS low_count,
         avg(e.fragility_score) AS avg_fragility
    OPTIONAL MATCH (s:AnalysisSnapshot)
    WITH total_nodes, critical_count, high_count, medium_count, low_count, avg_fragility, s
    ORDER BY s.created_at DESC
    LIMIT 1
    RETURN 
      total_nodes,
      critical_count,
      high_count,
      medium_count,
      low_count,
      COALESCE(avg_fragility, 0) AS avg_fragility,
      s.created_at AS last_analysis
  `);

  return results.length > 0
    ? results[0]
    : {
        total_nodes: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        avg_fragility: 0,
        last_analysis: null,
      };
}
