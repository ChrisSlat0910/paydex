import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../config/logger';
import { AppError } from '../errors/app-error';
import { redisConnection } from '../queue/bullmq.config';
import { query } from '../db/pool';

const TTL_SECONDS = 24 * 60 * 60;

export async function idempotencyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const gatewayName = (req.params['gateway'] as string | undefined) ?? 'unknown';
  const externalId = (req.headers['x-transaction-id'] as string | undefined) ?? uuidv4();
  const idempotencyKey = `${gatewayName}:${externalId}`;

  req.gatewayName = gatewayName;
  req.externalId = externalId;

  try {
    const result = await redisConnection.set(
      `idempotency:${idempotencyKey}`,
      '1',
      'EX',
      TTL_SECONDS,
      'NX',
    );

    if (result === null) {
      req.isDuplicate = true;
      logger.info('Duplicate event detected via Redis', { idempotencyKey });
      next();
      return;
    }

    req.isDuplicate = false;
    next();
  } catch (redisErr) {
    logger.warn('Redis unavailable for idempotency check, falling back to DB', {
      error: redisErr,
    });

    try {
      const existing = await query('SELECT id FROM idempotency_keys WHERE key = $1 FOR UPDATE', [
        idempotencyKey,
      ]);

      if (existing.rows.length > 0) {
        req.isDuplicate = true;
        logger.info('Duplicate event detected via DB fallback', { idempotencyKey });
        next();
        return;
      }

      const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
      await query(
        'INSERT INTO idempotency_keys (id, key, event_id, expires_at) VALUES ($1, $2, $3, $4)',
        [uuidv4(), idempotencyKey, uuidv4(), expiresAt],
      );

      req.isDuplicate = false;
      next();
    } catch {
      next(new AppError('Idempotency check failed', 'INTERNAL_ERROR', 500));
    }
  }
}
