import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@softcrm/shared-kernel';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validate middleware factory — validates req.body, req.query, req.params
 * against Zod schemas. Returns 400 with structured validation errors on failure.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors['body'] = formatZodErrors(result.error);
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors['query'] = formatZodErrors(result.error);
      } else {
        // Express 5: req.query is a getter on the prototype — Object.assign
        // on the returned object is lost on next access.  Override with a
        // data-property so downstream handlers see the Zod-coerced values.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors['params'] = formatZodErrors(result.error);
      } else {
        // Express 5: req.params may be a getter — override with data property
        Object.defineProperty(req, 'params', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      const messages = Object.entries(errors)
        .flatMap(([source, msgs]) => msgs.map((m) => `${source}: ${m}`));
      next(new ValidationError(messages.join('; ')));
      return;
    }

    next();
  };
}

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
