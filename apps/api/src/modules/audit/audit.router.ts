import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { verifyAuditChain } from './audit.service';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware);

router.get('/verify', requireRole('admin'), (_req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const result = await verifyAuditChain();
      res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  })();
});

export { router as auditRouter };
