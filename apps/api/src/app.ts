import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { apiKeysRouter } from './modules/api-keys/api-keys.router';
import { auditRouter } from './modules/audit/audit.router';
import { authRouter } from './modules/auth/auth.router';
import { deliveryRouter } from './modules/delivery/delivery.router';
import { endpointsRouter } from './modules/endpoints/endpoints.router';
import { eventsRouter } from './modules/events/events.router';
import { gatewaysRouter } from './modules/gateways/gateways.router';
import { healthRouter } from './modules/health/health.router';
import { webhooksRouter } from './modules/webhooks/webhooks.router';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

app.use('/health', healthRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/webhook', express.raw({ type: 'application/json' }), webhooksRouter);

app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/api-keys', apiKeysRouter);
app.use('/api/v1/gateways', gatewaysRouter);
app.use('/api/v1/endpoints', endpointsRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/delivery', deliveryRouter);
app.use('/api/v1/audit-log', auditRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
