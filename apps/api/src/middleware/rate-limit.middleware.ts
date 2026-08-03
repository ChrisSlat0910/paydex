import type { Request, Response, NextFunction } from 'express';

// Full implementation in issue #15
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Placeholder headers — real implementation in issue #15
  res.setHeader('X-RateLimit-Limit', '1000');
  res.setHeader('X-RateLimit-Remaining', '999');
  res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60));

  next();
}
