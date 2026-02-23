import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  RateLimitError,
  InternalError,
  AppError,
} from '../errors/index.js';

describe('Error Classes', () => {
  describe('NotFoundError', () => {
    it('sets correct code, statusCode, and message with id', () => {
      const err = new NotFoundError('Deal', 'abc-123');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Deal with id "abc-123" not found');
      expect(err.details).toEqual({ entity: 'Deal', id: 'abc-123' });
    });

    it('sets message without id', () => {
      const err = new NotFoundError('Tenant');
      expect(err.message).toBe('Tenant not found');
    });

    it('is an instance of AppError and Error', () => {
      const err = new NotFoundError('Deal');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('ForbiddenError', () => {
    it('defaults message', () => {
      const err = new ForbiddenError();
      expect(err.code).toBe('FORBIDDEN');
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('permission');
    });
  });

  describe('ConflictError', () => {
    it('carries details', () => {
      const err = new ConflictError('Duplicate email', { field: 'email' });
      expect(err.code).toBe('CONFLICT');
      expect(err.statusCode).toBe(409);
      expect(err.details).toEqual({ field: 'email' });
    });
  });

  describe('ValidationError', () => {
    it('includes field errors', () => {
      const err = new ValidationError('Validation failed', {
        email: ['Required', 'Must be a valid email'],
        name: ['Required'],
      });
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
      expect(err.fieldErrors).toBeDefined();
      expect(err.fieldErrors?.email).toHaveLength(2);
    });
  });

  describe('UnauthorizedError', () => {
    it('defaults message', () => {
      const err = new UnauthorizedError();
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.statusCode).toBe(401);
    });
  });

  describe('RateLimitError', () => {
    it('includes retryAfter in details', () => {
      const err = new RateLimitError(60);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(err.statusCode).toBe(429);
      expect(err.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('InternalError', () => {
    it('defaults', () => {
      const err = new InternalError();
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.statusCode).toBe(500);
    });
  });

  describe('toJSON() serialization', () => {
    it('serializes to an error envelope', () => {
      const err = new NotFoundError('Deal', 'abc');
      const json = err.toJSON();
      expect(json).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Deal with id "abc" not found',
          details: { entity: 'Deal', id: 'abc' },
        },
      });
    });

    it('omits details when not present', () => {
      const err = new ForbiddenError();
      const json = err.toJSON();
      expect(json.error).not.toHaveProperty('details');
    });
  });
});
