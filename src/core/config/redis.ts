import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('✅  Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export async function checkRedisConnection(): Promise<void> {
  await redis.connect();
  await redis.ping();
}

// ── Key helpers ────────────────────────────────────────────────────────────────
export const KEYS = {
  refreshToken: (hash: string) => `rt:${hash}`,
  userPerms: (userId: string) => `perm:${userId}`,
  tenant: (tenantId: string) => `tenant:${tenantId}`,
};

export const TTL = {
  refreshToken: 60 * 60 * 24 * 30, // 30 days (seconds)
  userPerms: 60 * 60,               // 1 hour
  tenant: 60 * 5,                   // 5 minutes
};
