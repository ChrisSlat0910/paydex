import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';

type Role = 'admin' | 'developer';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 'FORBIDDEN', 403));
      return;
    }

    next();
  };
}
