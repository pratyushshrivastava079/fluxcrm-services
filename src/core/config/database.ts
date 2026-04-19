import Knex from 'knex';
import { config } from './index';
import { logger } from '../utils/logger';

export const db = Knex({
  client: 'pg',
  connection: config.DATABASE_URL,
  pool: { min: config.DB_POOL_MIN, max: config.DB_POOL_MAX },
  acquireConnectionTimeout: 10_000,
  debug: config.NODE_ENV === 'development' && config.LOG_LEVEL === 'debug',
});

export async function checkDbConnection(): Promise<void> {
  await db.raw('SELECT 1');
  logger.info('✅  PostgreSQL connected');
}
