import { createApp } from './app';
import { checkDbConnection } from './core/config/database';
import { checkRedisConnection } from './core/config/redis';
import { config } from './core/config';
import { logger } from './core/utils/logger';

async function bootstrap() {
  await checkDbConnection();
  await checkRedisConnection();

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀  Performex API running on http://localhost:${config.PORT}`);
    logger.info(`📖  Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
