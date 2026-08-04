import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import {
  createEndpointHandler,
  deactivateEndpointHandler,
  listEndpointsHandler,
} from './endpoints.controller';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

router.post('/', (req, res, next) => {
  void createEndpointHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listEndpointsHandler(req, res, next);
});
router.delete('/:id', (req, res, next) => {
  void deactivateEndpointHandler(req, res, next);
});

export { router as endpointsRouter };
