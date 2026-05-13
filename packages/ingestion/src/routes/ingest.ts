import { Router, Request, Response } from 'express';
import { MockConnector } from '../connectors/mock';
import { GitHubConnector } from '../connectors/github';
import { SlackConnector } from '../connectors/slack';
import { JiraConnector } from '../connectors/jira';
import { NotionConnector } from '../connectors/notion';
import { isConnectorConfigured } from '../config';
import { syncRateLimiter } from '../middleware/rateLimiter';
import pino from 'pino';

const logger = pino({ name: 'routes:ingest' });
const router = Router();

router.post('/mock', async (req: Request, res: Response) => {
  try {
    const { scenario = 'enterprise_1000' } = req.body;
    logger.info({ scenario }, 'Starting mock data generation');
    const connector = new MockConnector();
    connector.setScenario(scenario);
    await connector.connect();
    const result = await connector.executeSyncWithTracking();
    res.json({ success: true, scenario, result });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Mock generation failed');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Mock generation failed' });
  }
});

router.post('/sync/:connector', syncRateLimiter, async (req: Request, res: Response) => {
  const connectorName = req.params.connector;
  if (!isConnectorConfigured(connectorName)) {
    res.status(400).json({ error: `Connector '${connectorName}' is not configured. Set required env vars.` });
    return;
  }

  try {
    let connector;
    switch (connectorName) {
      case 'github': connector = new GitHubConnector(); break;
      case 'slack': connector = new SlackConnector(); break;
      case 'jira': connector = new JiraConnector(); break;
      case 'notion': connector = new NotionConnector(); break;
      default:
        res.status(400).json({ error: `Unknown connector: ${connectorName}` });
        return;
    }

    await connector.connect();
    const since = req.body.since ? new Date(req.body.since) : undefined;
    const result = await connector.executeSyncWithTracking({ since });
    res.json({ success: true, result });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, `Sync failed: ${connectorName}`);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Sync failed' });
  }
});

router.get('/connectors', (_req: Request, res: Response) => {
  const connectors = ['github', 'slack', 'jira', 'notion', 'mock'].map((name) => ({
    name,
    configured: isConnectorConfigured(name),
    version: '1.0.0',
  }));
  res.json({ connectors });
});

export default router;
