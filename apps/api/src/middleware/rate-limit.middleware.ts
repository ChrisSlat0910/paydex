import type { Request, Response, NextFunction } from 'express';

import { logger } from '../config/logger';
import { redisConnection } from '../queue/bullmq.config';
import { AppError } from '../errors/app-error';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 1000;

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const identifier = req.user?.apiKeyId ?? req.user?.id ?? req.ip ?? 'anonymous';
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const pipeline = redisConnection.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, 60);

    const results = await pipeline.exec();

    if (!results) {
      next();
      return;
    }

    const count = results[2]?.[1] as number;
    const resetTime = Math.ceil((now + WINDOW_MS) / 1000);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count));
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (count > MAX_REQUESTS) {
      const retryAfter = Math.ceil(WINDOW_MS / 1000);
      res.setHeader('Retry-After', retryAfter);
      next(new AppError('Too many requests', 'RATE_LIMIT_EXCEEDED', 429));
      return;
    }

    next();
  } catch (err) {
    logger.warn('Rate limit Redis error, failing open', { error: err });
    next();
  }
}
