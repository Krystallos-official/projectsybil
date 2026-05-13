import cron from 'node-cron';
import { scheduleJobs } from './jobs';
import pino from 'pino';

const logger = pino({ name: 'scheduler' });

export function initializeScheduler(): void {
  logger.info('Initializing job scheduler');
  scheduleJobs();
  logger.info('Job scheduler initialized');
}

export { cron };
