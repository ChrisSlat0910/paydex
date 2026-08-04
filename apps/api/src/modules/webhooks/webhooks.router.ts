import { Router } from 'express';

import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { ingestWebhookHandler } from './webhooks.controller';

const router = Router();

/**
 * @swagger
 * /webhook/{gateway}:
 *   post:
 *     summary: Receive webhook from payment gateway
 *     tags: [Webhooks]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: gateway
 *         required: true
 *         schema:
 *           type: string
 *           enum: [midtrans]
 *         description: Gateway adapter name
 *       - in: header
 *         name: x-transaction-id
 *         schema:
 *           type: string
 *         description: External transaction ID for idempotency
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw gateway payload
 *     responses:
 *       200:
 *         description: Event received and queued for delivery
 *       401:
 *         description: Invalid signature
 *       404:
 *         description: Gateway not found
 */
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
