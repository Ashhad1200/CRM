import type { Request, Response, NextFunction } from 'express';
import { tenantContext } from '@softcrm/db';
import { ForbiddenError } from '@softcrm/shared-kernel';

/** Routes that skip tenant resolution (auth routes, health, etc.) */
const SKIP_TENANT_ROUTES = new Set([
  '/health',
  '/ready',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
]);

/**
 * Tenant middleware — extracts tenantId from JWT (req.user.tid),
 * runs the rest of the request inside AsyncLocalStorage tenant context,
 * and sets the Prisma RLS session variable.
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_TENANT_ROUTES.has(req.path) || !req.user) {
    next();
    return;
  }

  const tenantId = req.user.tid;
  if (!tenantId) {
    next(new ForbiddenError('No tenant associated with this user'));
    return;
  }

  // Run remainder of the request inside the tenant context
  tenantContext.run(tenantId, () => {
    next();
  });
}
