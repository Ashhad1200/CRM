import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express';
import { z } from 'zod';
import { ValidationError, UnauthorizedError } from '@softcrm/shared-kernel';
import { getConfig } from '../../../config/index.js';
import * as authService from './auth.service.js';

// ── Validation Schemas ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRefreshCookieOptions() {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  };
}

function extractRefreshToken(req: Request): string | undefined {
  // Prefer cookie, fall back to body
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.['refreshToken'];
  if (fromCookie) return fromCookie;

  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body?.['refreshToken'];
  return typeof fromBody === 'string' && fromBody.length > 0 ? fromBody : undefined;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const authRouter: RouterType = Router();

// ── POST /login ────────────────────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join('; '),
      );
    }

    const { email, password, tenantSlug } = parsed.data;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const result = await authService.login(email, password, tenantSlug, userAgent, ip);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /register (requires auth — admin) ────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Require admin role (auth enforced by global middleware)
    const roles = req.user?.roles ?? [];
    if (!roles.includes('Admin') && !roles.includes('Super-Admin')) {
      throw new UnauthorizedError('Admin privileges required to register users');
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join('; '),
      );
    }

    const user = await authService.register(parsed.data, req.user?.sub);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// ── POST /refresh ──────────────────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Allow body validation (refreshToken is optional when cookie is present)
    refreshBodySchema.parse(req.body);

    const token = extractRefreshToken(req);
    if (!token) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const result = await authService.refresh(token, userAgent, ip);

    // Rotate cookie
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /logout ───────────────────────────────────────────────────────────────

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logoutBodySchema.parse(req.body);

    const token = extractRefreshToken(req);
    if (token) {
      await authService.logout(token);
    }

    // Clear cookie regardless
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: getConfig().NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
    });

    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ── POST /logout-all (requires auth) ──────────────────────────────────────────

authRouter.post('/logout-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    await authService.logoutAll(req.user.sub);

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: getConfig().NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
    });

    res.status(200).json({ message: 'All sessions revoked' });
  } catch (err) {
    next(err);
  }
});
