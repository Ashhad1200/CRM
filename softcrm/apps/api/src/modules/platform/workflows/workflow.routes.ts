/**
 * Workflow Builder module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/workflows/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../../middleware/validate.js';
import { requirePermission } from '../../../middleware/rbac.js';

import * as svc from './workflow.service.js';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  listWorkflowsQuerySchema,
  paginationSchema,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Safely extract a single string param from Express 5's `string | string[]`. */
function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
}

/** Wrap an async route handler so rejected promises forward to Express error middleware. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ── Inline param schemas ───────────────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const router: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── List workflows ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/',
  requirePermission({ module: 'workflows', action: 'read' }),
  validate({ query: listWorkflowsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, pageSize, ...filters } = req.query as unknown as z.infer<
      typeof listWorkflowsQuerySchema
    >;
    const result = await svc.listWorkflows(tenantId, filters, { page, pageSize });
    res.json(result);
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Create workflow ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/',
  requirePermission({ module: 'workflows', action: 'create' }),
  validate({ body: createWorkflowSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const workflow = await svc.createWorkflow(tenantId, actorId, req.body);
    res.status(201).json({ data: workflow });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Get workflow ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id',
  requirePermission({ module: 'workflows', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const workflow = await svc.getWorkflow(tenantId, id);
    res.json({ data: workflow });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Update workflow ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  '/:id',
  requirePermission({ module: 'workflows', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateWorkflowSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const workflow = await svc.updateWorkflow(tenantId, id, req.body);
    res.json({ data: workflow });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Delete workflow ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  '/:id',
  requirePermission({ module: 'workflows', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    await svc.deleteWorkflow(tenantId, id);
    res.status(204).send();
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Activate / Deactivate ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/:id/activate',
  requirePermission({ module: 'workflows', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const workflow = await svc.activateWorkflow(tenantId, id);
    res.json({ data: workflow });
  }),
);

router.post(
  '/:id/deactivate',
  requirePermission({ module: 'workflows', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const workflow = await svc.deactivateWorkflow(tenantId, id);
    res.json({ data: workflow });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Executions ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id/executions',
  requirePermission({ module: 'workflows', action: 'read' }),
  validate({ params: uuidParamSchema, query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const id = param(req, 'id');
    const { page, pageSize } = req.query as unknown as z.infer<typeof paginationSchema>;
    const result = await svc.getExecutions(id, { page, pageSize });
    res.json(result);
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════

export const workflowRouter = router;
