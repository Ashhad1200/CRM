import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret-at-least-16';

vi.mock('../config/index.js', () => ({
  getConfig: () => ({
    JWT_SECRET: TEST_SECRET,
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-16',
  }),
  loadConfig: vi.fn(),
}));

import { authMiddleware, type JwtPayload } from '../middleware/auth.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockNext(): NextFunction & { mock: { calls: unknown[][] } } {
  return vi.fn() as unknown as NextFunction & { mock: { calls: unknown[][] } };
}

function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '15m' });
}

describe('authMiddleware', () => {
  it('skips auth for /health', () => {
    const req = mockReq({ path: '/health' });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });

  it('skips auth for /ready', () => {
    const req = mockReq({ path: '/ready' });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('skips auth for /api/v1/auth/login', () => {
    const req = mockReq({ path: '/api/v1/auth/login' });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('returns 401 when no Authorization header is present', () => {
    const req = mockReq({ path: '/api/contacts' });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]![0] as Error;
    expect(err).toBeDefined();
    expect(err.message).toContain('Missing or invalid');
  });

  it('returns 401 for invalid token', () => {
    const req = mockReq({
      path: '/api/contacts',
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    const err = next.mock.calls[0]![0] as Error;
    expect(err).toBeDefined();
    expect(err.message).toContain('Invalid token');
  });

  it('populates req.user with a valid JWT', () => {
    const token = signToken({ sub: 'user-123', tid: 'tenant-456', roles: ['admin'], jti: 'jti-1' });
    const req = mockReq({
      path: '/api/contacts',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user!.sub).toBe('user-123');
    expect(req.user!.tid).toBe('tenant-456');
    expect(req.user!.roles).toEqual(['admin']);
  });

  it('returns 401 for expired token', () => {
    const token = jwt.sign(
      { sub: 'user-123', tid: 'tenant-456', roles: [], jti: 'jti-2' },
      TEST_SECRET,
      { expiresIn: '0s' }, // Immediately expired
    );

    const req = mockReq({
      path: '/api/contacts',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = mockNext();

    // Wait a tick for expiration
    setTimeout(() => {
      authMiddleware(req, res, next);
      const err = next.mock.calls[0]![0] as Error;
      expect(err).toBeDefined();
      expect(err.message).toContain('expired');
    }, 1100);
  });
});
