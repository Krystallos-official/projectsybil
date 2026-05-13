import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { getConfig } from './config';
import { verifyConnectivity } from './neo4j/driver';
import { initializeSchema } from './neo4j/schema';
import { initializeScheduler } from './scheduler';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { apiRateLimiter } from './middleware/rateLimiter';
import healthRouter from './routes/health';
import ingestRouter from './routes/ingest';
import graphRouter from './routes/graph';
import analysisRouter from './routes/analysis';
import pino from 'pino';

const logger = pino({ name: 'sybil-ingestion' });

async function main(): Promise<void> {
  const config = getConfig();
  const app = express();

  // Global middleware
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(morgan('short'));
  app.use(express.json({ limit: '10mb' }));
  app.use(apiRateLimiter);

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/ingest', authMiddleware, ingestRouter);
  app.use('/api/graph', authMiddleware, graphRouter);
  app.use('/api/analysis', authMiddleware, analysisRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Initialize Neo4j
  logger.info('Connecting to Neo4j...');
  const connected = await verifyConnectivity();
  if (!connected) {
    logger.error('Failed to connect to Neo4j. Exiting.');
    process.exit(1);
  }

  // Initialize schema
  await initializeSchema();

  // Initialize scheduler
  if (config.NODE_ENV !== 'test') {
    initializeScheduler();
  }

  // Start server — bind to 0.0.0.0 for cloud deployment (Render, etc.)
  app.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`
╔══════════════════════════════════════════╗
║  ◈ SYBIL — Ingestion Service            ║
║  Port: ${config.PORT}                            ║
║  Mode: ${config.NODE_ENV.padEnd(32)}║
║  Neo4j: ${config.NEO4J_URI.padEnd(31)}║
╚══════════════════════════════════════════╝`);
  });
}

main().catch((error) => {
  logger.error({ error: error instanceof Error ? error.message : error }, 'Fatal startup error');
  process.exit(1);
});
