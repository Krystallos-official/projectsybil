import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getConfig } from '../config';
import { getSnapshots, getTemporalScores } from '../neo4j/queries/scores';
import { analysisRateLimiter } from '../middleware/rateLimiter';
import pino from 'pino';

const logger = pino({ name: 'routes:analysis' });
const router = Router();

router.post('/run', analysisRateLimiter, async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    logger.info('Triggering analysis run');
    const response = await axios.post(`${config.ANALYSIS_SERVICE_URL}/run`, {}, { timeout: 300000 });
    res.json({ success: true, result: response.data });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Analysis run failed');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Analysis run failed' });
  }
});

router.get('/snapshots', async (_req: Request, res: Response) => {
  try {
    const snapshots = await getSnapshots();
    res.json({ snapshots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

router.get('/whatif/:nodeId', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    const response = await axios.get(`${config.ANALYSIS_SERVICE_URL}/whatif/${req.params.nodeId}`, { timeout: 60000 });
    res.json(response.data);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'What-if failed');
    res.status(500).json({ error: 'What-if simulation failed' });
  }
});

router.get('/temporal/:nodeId', async (req: Request, res: Response) => {
  try {
    const scores = await getTemporalScores(req.params.nodeId);
    res.json({ scores });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch temporal data' });
  }
});

export default router;
