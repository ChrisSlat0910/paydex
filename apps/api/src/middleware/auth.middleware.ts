import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';

// Full implementation in issue #13
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Missing or invalid authorization header', 'UNAUTHORIZED', 401));
    return;
  }

  next(new AppError('Auth middleware not yet implemented', 'UNAUTHORIZED', 401));
}

export function optionalAuthMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
