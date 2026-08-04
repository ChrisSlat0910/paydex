import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import {
  createGatewayHandler,
  deactivateGatewayHandler,
  getGatewayHandler,
  listGatewaysHandler,
  updateGatewayHandler,
} from './gateways.controller';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

router.post('/', (req, res, next) => {
  void createGatewayHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listGatewaysHandler(req, res, next);
});
router.get('/:id', (req, res, next) => {
  void getGatewayHandler(req, res, next);
});
router.patch('/:id', (req, res, next) => {
  void updateGatewayHandler(req, res, next);
});
router.delete('/:id', (req, res, next) => {
  void deactivateGatewayHandler(req, res, next);
});

export { router as gatewaysRouter };
