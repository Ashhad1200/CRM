import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

vi.mock('../logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { validate } from '../middleware/validate.js';

function mockReq(body = {}, query = {}, params = {}): Request {
  return { body, query, params } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockNext(): NextFunction & { mock: { calls: unknown[][] } } {
  return vi.fn() as unknown as NextFunction & { mock: { calls: unknown[][] } };
}

describe('validate middleware', () => {
  it('passes with valid body', () => {
    const schema = z.object({ name: z.string().min(1), email: z.string().email() });
    const middleware = validate({ body: schema });
    const req = mockReq({ name: 'John', email: 'john@example.com' });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('throws ValidationError for invalid body', () => {
    const schema = z.object({ name: z.string().min(1), email: z.string().email() });
    const middleware = validate({ body: schema });
    const req = mockReq({ name: '', email: 'not-an-email' });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]![0] as Error;
    expect(err).toBeDefined();
    expect(err.message).toContain('body: name:');
  });

  it('validates query parameters', () => {
    const schema = z.object({ page: z.coerce.number().int().positive() });
    const middleware = validate({ query: schema });
    const req = mockReq({}, { page: '5' });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 5 });
  });

  it('validates params', () => {
    const schema = z.object({ id: z.string().uuid() });
    const middleware = validate({ params: schema });
    const req = mockReq({}, {}, { id: '550e8400-e29b-41d4-a716-446655440000' });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
  });

  it('rejects invalid params', () => {
    const schema = z.object({ id: z.string().uuid() });
    const middleware = validate({ params: schema });
    const req = mockReq({}, {}, { id: 'not-a-uuid' });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    const err = next.mock.calls[0]![0] as Error;
    expect(err).toBeDefined();
    expect(err.message).toContain('params: id:');
  });
});
