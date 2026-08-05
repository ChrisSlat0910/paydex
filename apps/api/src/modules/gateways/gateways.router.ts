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

/**
 * @swagger
 * /gateways:
 *   post:
 *     summary: Register a new gateway
 *     tags: [Gateways]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, adapterType, credentials]
 *             properties:
 *               name:
 *                 type: string
 *               adapterType:
 *                 type: string
 *                 enum: [midtrans, stripe, xendit]
 *               credentials:
 *                 type: string
 *                 description: Server key or secret — encrypted at rest
 *     responses:
 *       201:
 *         description: Gateway registered
 *   get:
 *     summary: List gateways
 *     tags: [Gateways]
 *     responses:
 *       200:
 *         description: List of gateways
 */
router.post('/', (req, res, next) => {
  void createGatewayHandler(req, res, next);
});
router.get('/', (req, res, next) => {
  void listGatewaysHandler(req, res, next);
});

/**
 * @swagger
 * /gateways/{id}:
 *   get:
 *     summary: Get gateway by ID
 *     tags: [Gateways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gateway details
 *       404:
 *         description: Gateway not found
 *   patch:
 *     summary: Update gateway
 *     tags: [Gateways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               credentials:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gateway updated
 *   delete:
 *     summary: Deactivate gateway
 *     tags: [Gateways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gateway deactivated
 */
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
