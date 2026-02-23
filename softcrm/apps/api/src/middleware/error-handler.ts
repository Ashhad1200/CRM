import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@softcrm/shared-kernel';
import { logger } from '../logger.js';

/** Check if an error is a Prisma known-request error by duck-typing. */
function isPrismaKnownRequestError(
  err: unknown,
): err is Error & { code: string; meta?: Record<string, unknown> } {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as Record<string, unknown>)['code'] === 'string' &&
    (err as Record<string, unknown>)['code']?.toString().startsWith('P')
  );
}

/** Check if an error is a Prisma validation error by constructor name. */
function isPrismaValidationError(err: unknown): err is Error {
  return err instanceof Error && err.constructor.name === 'PrismaClientValidationError';
}

/**
 * Global error handler — must be registered last in the middleware stack.
 * Maps AppError subclasses to their HTTP status codes.
 * Maps known Prisma errors to appropriate HTTP responses.
 * Logs full error details with Pino; returns error envelope to client.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    logger.warn(
      { err, requestId, statusCode: err.statusCode, code: err.code },
      `AppError: ${err.message}`,
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        requestId,
      },
    });
    return;
  }

  // Prisma known request errors (P2002 = unique constraint, P2025 = not found)
  if (isPrismaKnownRequestError(err)) {
    if (err.code === 'P2002') {
      const target = (err.meta?.['target'] as string[])?.join(', ') ?? 'unknown fields';
      logger.warn({ err, requestId }, `Unique constraint violation on ${target}`);
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `A record with the same value already exists (${target})`,
          statusCode: 409,
          requestId,
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      logger.warn({ err, requestId }, 'Record not found');
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record was not found',
          statusCode: 404,
          requestId,
        },
      });
      return;
    }
  }

  // Prisma validation errors (bad query arguments)
  if (isPrismaValidationError(err)) {
    logger.warn({ err, requestId }, `Prisma validation: ${err.message.slice(0, 200)}`);
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid query parameters',
        statusCode: 400,
        requestId,
      },
    });
    return;
  }

  // Unknown errors → 500
  logger.error({ err, requestId }, `Unhandled error: ${err.message}`);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      requestId,
    },
  });
}
