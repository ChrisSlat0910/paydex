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

/**
 * @swagger
 * /endpoints:
 *   post:
 *     summary: Register a webhook delivery endpoint
 *     tags: [Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gatewayId, url]
 *             properties:
 *               gatewayId:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               secret:
 *                 type: string
 *                 description: Optional signing secret
 *     responses:
 *       201:
 *         description: Endpoint registered
 *   get:
 *     summary: List endpoints
 *     tags: [Endpoints]
 *     responses:
 *       200:
 *         description: List of endpoints
 */
router.post('/', (req, res, next) => {
  void createEndpointHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listEndpointsHandler(req, res, next);
});

/**
 * @swagger
 * /endpoints/{id}:
 *   delete:
 *     summary: Deactivate an endpoint
 *     tags: [Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Endpoint deactivated
 *       404:
 *         description: Endpoint not found
 */
router.delete('/:id', (req, res, next) => {
  void deactivateEndpointHandler(req, res, next);
});

export { router as endpointsRouter };
