import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { getDeliveryLogsHandler, getEventHandler, listEventsHandler } from './events.controller';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

router.get('/', (req, res, next) => {
  void listEventsHandler(req, res, next);
});
router.get('/:id', (req, res, next) => {
  void getEventHandler(req, res, next);
});
router.get('/:id/delivery-logs', (req, res, next) => {
  void getDeliveryLogsHandler(req, res, next);
});

export { router as eventsRouter };
