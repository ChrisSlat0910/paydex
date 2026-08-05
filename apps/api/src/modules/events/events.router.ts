import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { getDeliveryLogsHandler, getEventHandler, listEventsHandler } from './events.controller';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List webhook events with cursor pagination
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, DELIVERED, FAILED, DUPLICATE]
 *       - in: query
 *         name: gatewayId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of events
 */
router.get('/', (req, res, next) => {
  void listEventsHandler(req, res, next);
});

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details with raw and normalized payload
 *       404:
 *         description: Event not found
 */
router.get('/:id', (req, res, next) => {
  void getEventHandler(req, res, next);
});

/**
 * @swagger
 * /events/{id}/delivery-logs:
 *   get:
 *     summary: Get delivery logs for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All delivery attempts for the event
 *       404:
 *         description: Event not found
 */
router.get('/:id/delivery-logs', (req, res, next) => {
  void getDeliveryLogsHandler(req, res, next);
});

export { router as eventsRouter };
