import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/index.js';
import { UnauthorizedError } from '@softcrm/shared-kernel';

/** Routes that skip authentication. */
const PUBLIC_ROUTES = new Set([
  '/health',
  '/ready',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
]);

export interface JwtPayload {
  sub: string;   // userId
  tid: string;   // tenantId
  roles: string[]; // role IDs
  jti: string;   // token ID
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Auth middleware — verifies JWT from Authorization: Bearer header.
 * Populates req.user with decoded payload.
 * Skips for public routes.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Skip public routes
  if (PUBLIC_ROUTES.has(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7);
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}
