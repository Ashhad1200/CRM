/**
 * Manufacturing module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/manufacturing/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import {
  uuidParamSchema,
  paginationSchema,
  createBOMSchema,
  updateBOMSchema,
  listBOMsQuerySchema,
  createWorkCenterSchema,
  listWorkCentersQuerySchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
  listWorkOrdersQuerySchema,
  recordMaterialConsumptionSchema,
  recordProductionOutputSchema,
  runMRPSchema,
  listMRPRunsQuerySchema,
} from './validators.js';
import type {
  ListBOMsQuery,
  ListWorkOrdersQuery,
  CreateBOMInput,
  UpdateBOMInput,
  CreateWorkCenterInput,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  RecordMaterialConsumptionInput,
  RecordProductionOutputInput,
  RunMRPInput,
} from './validators.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Router ────────────────────────────────────────────────────────────────────

export const manufacturingRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Bills of Material ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

manufacturingRouter.get(
  '/boms',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ query: listBOMsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, productId, isActive, search } =
      req.query as unknown as ListBOMsQuery;

    const result = await svc.listBOMs(
      tenantId,
      { productId, isActive, search },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

manufacturingRouter.post(
  '/boms',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'create' }),
  validate({ body: createBOMSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const bom = await svc.createBOM(tenantId, req.body as CreateBOMInput, actorId);
    res.status(201).json({ data: bom });
  }),
);

manufacturingRouter.get(
  '/boms/:id',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const bom = await svc.getBOM(tenantId, id);
    res.json({ data: bom });
  }),
);

manufacturingRouter.put(
  '/boms/:id',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateBOMSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const bom = await svc.updateBOM(tenantId, id, req.body as UpdateBOMInput, actorId);
    res.json({ data: bom });
  }),
);

manufacturingRouter.get(
  '/boms/:id/lines',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const bom = await svc.getBOM(tenantId, id);
    res.json({ data: bom.lines });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Work Centers ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

manufacturingRouter.get(
  '/work-centers',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ query: listWorkCentersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status } = req.query as unknown as z.infer<
      typeof listWorkCentersQuerySchema
    >;

    const result = await svc.listWorkCenters(
      tenantId,
      { page, limit, sortBy, sortDir },
      status,
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

manufacturingRouter.post(
  '/work-centers',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'create' }),
  validate({ body: createWorkCenterSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const wc = await svc.createWorkCenter(tenantId, req.body as CreateWorkCenterInput);
    res.status(201).json({ data: wc });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Work Orders ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

manufacturingRouter.get(
  '/work-orders',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ query: listWorkOrdersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status, productId, bomId } =
      req.query as unknown as ListWorkOrdersQuery;

    const result = await svc.listWorkOrders(
      tenantId,
      { status, productId, bomId },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

manufacturingRouter.post(
  '/work-orders',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'create' }),
  validate({ body: createWorkOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const wo = await svc.createWorkOrder(
      tenantId,
      req.body as CreateWorkOrderInput,
      actorId,
    );
    res.status(201).json({ data: wo });
  }),
);

manufacturingRouter.get(
  '/work-orders/:id',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const wo = await svc.getWorkOrder(tenantId, id);
    res.json({ data: wo });
  }),
);

manufacturingRouter.put(
  '/work-orders/:id',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateWorkOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const wo = await svc.updateWorkOrder(
      tenantId,
      id,
      req.body as UpdateWorkOrderInput,
      actorId,
    );
    res.json({ data: wo });
  }),
);

manufacturingRouter.post(
  '/work-orders/:id/release',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const wo = await svc.releaseWorkOrder(tenantId, id, actorId);
    res.json({ data: wo });
  }),
);

manufacturingRouter.post(
  '/work-orders/:id/complete',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const wo = await svc.completeWorkOrder(tenantId, id, actorId);
    res.json({ data: wo });
  }),
);

manufacturingRouter.post(
  '/work-orders/:id/material-consumption',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema, body: recordMaterialConsumptionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const record = await svc.recordMaterialConsumption(
      tenantId,
      id,
      req.body as RecordMaterialConsumptionInput,
      actorId,
    );
    res.status(201).json({ data: record });
  }),
);

manufacturingRouter.post(
  '/work-orders/:id/production-output',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'update' }),
  validate({ params: uuidParamSchema, body: recordProductionOutputSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const record = await svc.recordProductionOutput(
      tenantId,
      id,
      req.body as RecordProductionOutputInput,
      actorId,
    );
    res.status(201).json({ data: record });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── MRP Runs ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

manufacturingRouter.get(
  '/mrp-runs',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ query: listMRPRunsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status } = req.query as unknown as z.infer<
      typeof listMRPRunsQuerySchema
    >;

    const result = await svc.listMRPRuns(
      tenantId,
      { page, limit, sortBy, sortDir },
      status,
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

manufacturingRouter.post(
  '/mrp-runs',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'create' }),
  validate({ body: runMRPSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const run = await svc.runMRP(tenantId, req.body as RunMRPInput, actorId);
    res.status(201).json({ data: run });
  }),
);

manufacturingRouter.get(
  '/mrp-runs/:id',
  requirePermission({ module: 'manufacturing', entity: 'work_order', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const run = await svc.getMRPRun(tenantId, id);
    res.json({ data: run });
  }),
);
