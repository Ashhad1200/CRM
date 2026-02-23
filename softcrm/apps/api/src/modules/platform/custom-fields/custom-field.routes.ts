import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express';
import { ValidationError } from '@softcrm/shared-kernel';
import * as cfService from './custom-field.service.js';

/** Safely extract a single string param from Express 5 params. */
function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const customFieldRouter: RouterType = Router();

// ── GET /defs — list field definitions ─────────────────────────────────────────

customFieldRouter.get('/defs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const query = req.query as Record<string, string | undefined>;
    const module = query['module'];
    const entity = query['entity'];

    if (!module || !entity) {
      throw new ValidationError('Query parameters "module" and "entity" are required');
    }

    const defs = await cfService.getFieldDefs(req.user.tid, module, entity);
    res.json({ data: defs });
  } catch (err) {
    next(err);
  }
});

// ── POST /defs — create field definition ───────────────────────────────────────

customFieldRouter.post('/defs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const body = req.body as Record<string, unknown>;
    const module = body['module'];
    const entity = body['entity'];
    const fieldName = body['fieldName'];
    const fieldType = body['fieldType'];
    const label = body['label'];
    const required = body['required'];
    const options = body['options'];
    const sortOrder = body['sortOrder'];

    if (typeof module !== 'string' || typeof entity !== 'string' ||
        typeof fieldName !== 'string' || typeof fieldType !== 'string' ||
        typeof label !== 'string') {
      throw new ValidationError('module, entity, fieldName, fieldType, and label are required strings');
    }

    const def = await cfService.createFieldDef(req.user.tid, {
      module,
      entity,
      fieldName,
      fieldType,
      label,
      required: typeof required === 'boolean' ? required : undefined,
      options: options ?? undefined,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
    });

    res.status(201).json({ data: def });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /defs/:id — update field definition ──────────────────────────────────

customFieldRouter.patch('/defs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const id = param(req, 'id');

    const body = req.body as Record<string, unknown>;
    const updateData: {
      label?: string;
      required?: boolean;
      options?: unknown;
      sortOrder?: number;
    } = {};

    if (typeof body['label'] === 'string') {
      updateData.label = body['label'];
    }
    if (typeof body['required'] === 'boolean') {
      updateData.required = body['required'];
    }
    if (body['options'] !== undefined) {
      updateData.options = body['options'];
    }
    if (typeof body['sortOrder'] === 'number') {
      updateData.sortOrder = body['sortOrder'];
    }

    const def = await cfService.updateFieldDef(req.user.tid, id, updateData);
    res.json({ data: def });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /defs/:id — delete field definition ─────────────────────────────────

customFieldRouter.delete('/defs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const id = param(req, 'id');
    await cfService.deleteFieldDef(req.user.tid, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── GET /values/:recordId — get field values for a record ──────────────────────

customFieldRouter.get('/values/:recordId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const recordId = param(req, 'recordId');
    const values = await cfService.getFieldValues(recordId);
    res.json({ data: values });
  } catch (err) {
    next(err);
  }
});

// ── PUT /values/:recordId/:fieldDefId — set a field value ──────────────────────

customFieldRouter.put('/values/:recordId/:fieldDefId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const recordId = param(req, 'recordId');
    const fieldDefId = param(req, 'fieldDefId');

    const body = req.body as Record<string, unknown>;
    const value = body['value'];

    if (typeof value !== 'string') {
      throw new ValidationError('"value" must be a string');
    }

    const result = await cfService.setFieldValue(fieldDefId, recordId, value);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
