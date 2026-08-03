import type { Request, Response, NextFunction } from 'express';

// Full implementation in issue #16
export function idempotencyMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Placeholder — replaced in issue #16
  next();
}
