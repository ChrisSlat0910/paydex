import { createServer } from 'http';

import { logger } from './config/logger';
import { env } from './config/env';
import { app } from './app';
import { initWebSocketServer } from './websocket/ws.server';
import { startDeliveryWorker } from './modules/delivery/delivery.worker';
import { startAuditWorker } from './modules/audit/audit.service';

const server = createServer(app);

initWebSocketServer(server);
startDeliveryWorker();
startAuditWorker();

server.listen(env.PORT, () => {
  logger.info('Paydex API server started', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
