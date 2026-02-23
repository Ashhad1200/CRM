import type { Request, Response, NextFunction } from 'express';
import { generateId } from '@softcrm/shared-kernel';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Correlation middleware — assigns a unique request ID (UUID v7) to every request.
 * If `x-request-id` is already present, reuses it.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id'];
  const requestId = typeof existing === 'string' && existing.length > 0 ? existing : generateId();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
