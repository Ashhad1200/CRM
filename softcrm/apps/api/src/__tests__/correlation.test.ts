import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock getConfig so we don't need a .env
vi.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    PORT: 4000,
    API_URL: 'http://localhost:4000',
    WEB_URL: 'http://localhost:5173',
    JWT_SECRET: 'test-jwt-secret-at-least-16',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-16',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    REDIS_URL: 'redis://localhost:6379',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 1000,
    DATABASE_URL: 'postgresql://test:test@localhost:5433/test',
    MEILI_HOST: 'http://localhost:7700',
    MEILI_MASTER_KEY: '',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY: 'test',
    S3_SECRET_KEY: 'test',
    S3_BUCKET: 'test',
    S3_REGION: 'us-east-1',
    EMAIL_PROVIDER: 'console' as const,
    SENDGRID_API_KEY: '',
    RESEND_API_KEY: '',
    EMAIL_FROM: 'noreply@test.local',
    LOG_LEVEL: 'silent',
    OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
    OTEL_SERVICE_NAME: 'test',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    MICROSOFT_CLIENT_ID: '',
    MICROSOFT_CLIENT_SECRET: '',
    SSO_SAML_CERT: '',
    SSO_SAML_ENTRY_POINT: '',
    SSO_OIDC_ISSUER: '',
    SSO_OIDC_CLIENT_ID: '',
    SSO_OIDC_CLIENT_SECRET: '',
    PLAID_CLIENT_ID: '',
    PLAID_SECRET: '',
    PLAID_ENV: 'sandbox' as const,
  }),
  loadConfig: vi.fn(),
}));

import { correlationMiddleware } from '../middleware/correlation.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

describe('correlationMiddleware', () => {
  it('generates a request ID when none is present', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    correlationMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses existing x-request-id header value', () => {
    const req = mockReq({ headers: { 'x-request-id': 'existing-id-123' } });
    const res = mockRes();
    const next = mockNext();

    correlationMiddleware(req, res, next);

    expect(req.requestId).toBe('existing-id-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-id-123');
    expect(next).toHaveBeenCalled();
  });
});
