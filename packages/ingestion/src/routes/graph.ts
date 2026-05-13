import { Router, Request, Response } from 'express';
import { runQuery } from '../neo4j/driver';
import { getAllRelationships, getEmployeeRelationships } from '../neo4j/queries/relationships';
import { getMetricsSummary, getGraphAtSnapshot } from '../neo4j/queries/scores';
import pino from 'pino';

const logger = pino({ name: 'routes:graph' });
const router = Router();

router.get('/full', async (_req: Request, res: Response) => {
  try {
    const [nodesResult, relationships, metrics] = await Promise.all([
      runQuery(`
        MATCH (e:Employee)
        RETURN e.id AS id, e.name AS name, e.department AS department, e.role AS role,
          e.avatar_url AS avatar_url, e.fragility_score AS fragility_score,
          e.risk_tier AS risk_tier, e.betweenness_centrality AS betweenness_centrality,
          e.pagerank_score AS pagerank_score, e.degree_centrality AS degree_centrality,
          e.redundancy_score AS redundancy_score, e.community_id AS community_id,
          e.community_label AS community_label, e.last_analyzed AS last_analyzed
        ORDER BY e.fragility_score DESC
      `),
      getEmployeeRelationships(),
      getMetricsSummary(),
    ]);

    res.json({ nodes: nodesResult, edges: relationships, metrics });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Failed to fetch graph');
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

router.get('/node/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [nodeResult, relsResult, projectsResult, reposResult] = await Promise.all([
      runQuery(`MATCH (e:Employee {id: $id}) RETURN e`, { id }),
      runQuery(`
        MATCH (e:Employee {id: $id})-[r]-(other)
        RETURN type(r) AS rel_type, COALESCE(r.weight, 1) AS weight,
          COALESCE(other.id, other.name, other.url) AS other_id,
          labels(other)[0] AS other_type, other.name AS other_name
        ORDER BY r.weight DESC
      `, { id }),
      runQuery(`MATCH (e:Employee {id: $id})-[:ASSIGNED_TO]->(p:Project) RETURN p`, { id }),
      runQuery(`MATCH (e:Employee {id: $id})-[:COMMITS_TO|OWNS]->(r:Repository) RETURN r`, { id }),
    ]);

    if (nodeResult.length === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json({ node: nodeResult[0], relationships: relsResult, projects: projectsResult, repositories: reposResult });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Failed to fetch node');
    res.status(500).json({ error: 'Failed to fetch node data' });
  }
});

router.get('/snapshot/:snapshotId', async (req: Request, res: Response) => {
  try {
    const data = await getGraphAtSnapshot(req.params.snapshotId);
    const relationships = await getEmployeeRelationships();
    res.json({ nodes: data, edges: relationships });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Failed to fetch snapshot');
    res.status(500).json({ error: 'Failed to fetch snapshot data' });
  }
});

export default router;
