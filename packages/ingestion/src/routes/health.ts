import { Router, Request, Response } from 'express';
import { verifyConnectivity } from '../neo4j/driver';
import { isConnectorConfigured } from '../config';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const neo4jOk = await verifyConnectivity();
  const connectors = {
    github: isConnectorConfigured('github'),
    slack: isConnectorConfigured('slack'),
    jira: isConnectorConfigured('jira'),
    notion: isConnectorConfigured('notion'),
    mock: true,
  };

  res.json({
    status: neo4jOk ? 'ok' : 'degraded',
    service: 'sybil-ingestion',
    version: '1.0.0',
    neo4j: neo4jOk,
    connectors,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
