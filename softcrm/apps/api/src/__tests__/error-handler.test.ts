import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } from '@softcrm/shared-kernel';

vi.mock('../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { errorHandler } from '../middleware/error-handler.js';

function mockReq(requestId = 'test-req-id'): Request {
  return { requestId } as unknown as Request;
}

function mockRes(): Response & { statusCode?: number } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  };
  return res as unknown as Response & { statusCode?: number };
}

function mockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

describe('errorHandler', () => {
  it('handles NotFoundError → 404', () => {
    const err = new NotFoundError('Contact', 'contact-123');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          statusCode: 404,
          requestId: 'test-req-id',
        }),
      }),
    );
  });

  it('handles ForbiddenError → 403', () => {
    const err = new ForbiddenError('Access denied');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          statusCode: 403,
        }),
      }),
    );
  });

  it('handles ValidationError → 400', () => {
    const err = new ValidationError('Invalid email', { email: 'must be valid' });
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }),
      }),
    );
  });

  it('handles UnauthorizedError → 401', () => {
    const err = new UnauthorizedError('Token expired');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          statusCode: 401,
        }),
      }),
    );
  });

  it('handles unknown Error → 500 with generic message', () => {
    const err = new Error('Something broke internally');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          requestId: 'test-req-id',
        }),
      }),
    );
  });

  it('uses "unknown" when requestId is missing', () => {
    const err = new NotFoundError('Deal', 'deal-1');
    const req = { requestId: undefined } as unknown as Request;
    const res = mockRes();

    errorHandler(err, req, res, mockNext());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          requestId: 'unknown',
        }),
      }),
    );
  });
});
