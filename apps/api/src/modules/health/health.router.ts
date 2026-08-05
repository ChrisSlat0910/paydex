import { Router } from 'express';
import type { Request, Response } from 'express';

import { pool } from '../../db/pool';
import { redisConnection } from '../../queue/bullmq.config';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [ok, degraded, down]
 *                     db:
 *                       type: string
 *                       enum: [ok, error]
 *                     redis:
 *                       type: string
 *                       enum: [ok, error]
 *                     uptime:
 *                       type: number
 *                     version:
 *                       type: string
 *                     timestamp:
 *                       type: string
 */
router.get('/', async (_req: Request, res: Response) => {
  const [dbResult, redisResult] = await Promise.allSettled([
    pool.query('SELECT 1'),
    redisConnection.ping(),
  ]);

  const db = dbResult.status === 'fulfilled' ? 'ok' : 'error';
  const redis = redisResult.status === 'fulfilled' ? 'ok' : 'error';

  const status =
    db === 'ok' && redis === 'ok'
      ? 'ok'
      : db === 'error' && redis === 'error'
        ? 'down'
        : 'degraded';

  res.status(200).json({
    success: true,
    data: {
      status,
      db,
      redis,
      uptime: process.uptime(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      timestamp: new Date().toISOString(),
    },
    error: null,
    meta: null,
  });
});

export { router as healthRouter };
