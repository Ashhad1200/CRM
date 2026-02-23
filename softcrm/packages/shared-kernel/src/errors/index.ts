/**
 * Base error classes for SoftCRM.
 *
 * Every custom error extends AppError and carries a machine-readable `code`,
 * an HTTP `statusCode`, and optional `details` for structured error responses.
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Serialize to a JSON-friendly envelope (for HTTP responses). */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ── Concrete Error Classes ─────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;

  constructor(entity: string, id?: string) {
    super(id ? `${entity} with id "${id}" not found` : `${entity} not found`, {
      entity,
      ...(id ? { id } : {}),
    });
  }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, fieldErrors ? { fields: fieldErrors } : undefined);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;

  constructor(retryAfterSeconds?: number) {
    super('Rate limit exceeded. Please try again later.', {
      ...(retryAfterSeconds !== undefined ? { retryAfter: retryAfterSeconds } : {}),
    });
  }
}

export class InternalError extends AppError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;

  constructor(message = 'An unexpected error occurred') {
    super(message);
  }
}
