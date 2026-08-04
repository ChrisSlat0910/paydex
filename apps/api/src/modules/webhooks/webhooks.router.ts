import { Router } from 'express';

import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { ingestWebhookHandler } from './webhooks.controller';

const router = Router();

router.post(
  '/:gateway',
  (req, res, next) => {
    void idempotencyMiddleware(req, res, next);
  },
  (req, res, next) => {
    void ingestWebhookHandler(req, res, next);
  },
);

export { router as webhooksRouter };
