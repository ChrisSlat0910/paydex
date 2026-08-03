import type { Request, Response, NextFunction } from 'express';

import { logger } from '../config/logger';
import { AppError } from '../errors/app-error';

export { AppError };

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const correlationId = req.correlationId;

  if (err instanceof AppError) {
    logger.warn('Application error', {
      correlationId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message },
      meta: null,
    });
    return;
  }

  logger.error('Unhandled error', {
    correlationId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    meta: null,
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    meta: null,
  });
}
