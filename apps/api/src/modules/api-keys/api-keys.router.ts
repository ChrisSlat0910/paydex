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

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Generate a new API key
 *     tags: [API Keys]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               environment:
 *                 type: string
 *                 enum: [live, test]
 *                 default: live
 *     responses:
 *       201:
 *         description: API key created — plaintext shown once only
 *   get:
 *     summary: List API keys
 *     tags: [API Keys]
 *     responses:
 *       200:
 *         description: List of API keys (no plaintext)
 */
router.post('/', (req, res, next) => {
  void createApiKeyHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listApiKeysHandler(req, res, next);
});

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 *       404:
 *         description: API key not found
 */
router.delete('/:id', (req, res, next) => {
  void revokeApiKeyHandler(req, res, next);
});

/**
 * @swagger
 * /api-keys/{id}/rotate:
 *   post:
 *     summary: Rotate an API key
 *     tags: [API Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New API key generated — plaintext shown once only
 */
router.post('/:id/rotate', (req, res, next) => {
  void rotateApiKeyHandler(req, res, next);
});

export { router as apiKeysRouter };
