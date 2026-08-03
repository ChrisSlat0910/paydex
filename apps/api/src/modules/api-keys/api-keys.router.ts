import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import {
  createApiKeyHandler,
  listApiKeysHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
} from './api-keys.controller';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

router.post('/', (req, res, next) => {
  void createApiKeyHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listApiKeysHandler(req, res, next);
});
router.delete('/:id', (req, res, next) => {
  void revokeApiKeyHandler(req, res, next);
});
router.post('/:id/rotate', (req, res, next) => {
  void rotateApiKeyHandler(req, res, next);
});

export { router as apiKeysRouter };
