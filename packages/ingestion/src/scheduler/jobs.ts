import cron from 'node-cron';
import axios from 'axios';
import { getConfig, isConnectorConfigured } from '../config';
import { GitHubConnector } from '../connectors/github';
import { SlackConnector } from '../connectors/slack';
import { JiraConnector } from '../connectors/jira';
import pino from 'pino';

const logger = pino({ name: 'scheduler:jobs' });

export function scheduleJobs(): void {
  // GitHub sync: every 4 hours
  if (isConnectorConfigured('github')) {
    cron.schedule('0 */4 * * *', async () => {
      logger.info('CRON: Starting GitHub sync');
      try {
        const connector = new GitHubConnector();
        await connector.connect();
        const result = await connector.executeSyncWithTracking({
          since: new Date(Date.now() - 4 * 60 * 60 * 1000),
        });
        logger.info({ nodes: result.nodes_created, rels: result.relationships_created }, 'CRON: GitHub sync complete');
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : error }, 'CRON: GitHub sync failed');
      }
    });
    logger.info('Scheduled: GitHub sync every 4 hours');
  }

  // Slack sync: every 2 hours
  if (isConnectorConfigured('slack')) {
    cron.schedule('0 */2 * * *', async () => {
      logger.info('CRON: Starting Slack sync');
      try {
        const connector = new SlackConnector();
        await connector.connect();
        const result = await connector.executeSyncWithTracking({
          since: new Date(Date.now() - 2 * 60 * 60 * 1000),
        });
        logger.info({ nodes: result.nodes_created, rels: result.relationships_created }, 'CRON: Slack sync complete');
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : error }, 'CRON: Slack sync failed');
      }
    });
    logger.info('Scheduled: Slack sync every 2 hours');
  }

  // Jira sync: every 6 hours
  if (isConnectorConfigured('jira')) {
    cron.schedule('0 */6 * * *', async () => {
      logger.info('CRON: Starting Jira sync');
      try {
        const connector = new JiraConnector();
        await connector.connect();
        const result = await connector.executeSyncWithTracking({
          since: new Date(Date.now() - 6 * 60 * 60 * 1000),
        });
        logger.info({ nodes: result.nodes_created, rels: result.relationships_created }, 'CRON: Jira sync complete');
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : error }, 'CRON: Jira sync failed');
      }
    });
    logger.info('Scheduled: Jira sync every 6 hours');
  }

  // Full analysis run: every day at 2am
  cron.schedule('0 2 * * *', async () => {
    logger.info('CRON: Starting daily analysis run');
    try {
      const config = getConfig();
      await axios.post(`${config.ANALYSIS_SERVICE_URL}/run`);
      logger.info('CRON: Daily analysis run complete');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'CRON: Analysis run failed');
    }
  });
  logger.info('Scheduled: Full analysis daily at 2am');
}
