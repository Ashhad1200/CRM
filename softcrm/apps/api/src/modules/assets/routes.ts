/**
 * Asset Management module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/assets/` by server.ts.
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
  createAssetCategorySchema,
  updateAssetCategorySchema,
  createAssetSchema,
  updateAssetSchema,
  listAssetsQuerySchema,
  runDepreciationSchema,
  disposeAssetSchema,
  scheduleMaintenanceSchema,
  completeMaintenanceSchema,
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

// ── Maintenance :id param schema ───────────────────────────────────────────────

const maintenanceParamSchema = z.object({
  id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const assetsRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Categories ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/categories',
  requirePermission({ module: 'assets', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const data = await svc.listAssetCategories(tenantId);
    res.json({ data });
  }),
);

assetsRouter.post(
  '/categories',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: createAssetCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const category = await svc.createAssetCategory(tenantId, req.body);
    res.status(201).json({ data: category });
  }),
);

assetsRouter.get(
  '/categories/:id',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const category = await svc.getAssetCategory(tenantId, id);
    res.json({ data: category });
  }),
);

assetsRouter.put(
  '/categories/:id',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateAssetCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const category = await svc.updateAssetCategory(tenantId, id, req.body);
    res.json({ data: category });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Register (placed before /:id to avoid route conflicts) ──────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/register',
  requirePermission({ module: 'assets', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const register = await svc.getAssetRegister(tenantId);
    res.json({ data: register });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Depreciation Run (placed before /:id to avoid route conflicts) ─────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.post(
  '/depreciation/run',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ body: runDepreciationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { period } = req.body as z.infer<typeof runDepreciationSchema>;
    const result = await svc.runMonthlyDepreciation(tenantId, period, actorId);
    res.json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Maintenance complete (placed before /:id to avoid route conflicts) ─────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.put(
  '/maintenance/:id/complete',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: maintenanceParamSchema, body: completeMaintenanceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const record = await svc.completeMaintenance(tenantId, id, req.body);
    res.json({ data: record });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Fixed Assets ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/assets',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ query: listAssetsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const {
      page,
      limit,
      sortBy,
      sortDir,
      ...filters
    } = req.query as unknown as z.infer<typeof listAssetsQuerySchema>;
    const result = await svc.listAssets(
      tenantId,
      { categoryId: filters.categoryId, status: filters.status },
      { page, limit, sortDir: sortDir ?? 'desc', sortBy },
    );
    res.json(result);
  }),
);

assetsRouter.post(
  '/assets',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: createAssetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const asset = await svc.createAsset(tenantId, req.body, actorId);
    res.status(201).json({ data: asset });
  }),
);

assetsRouter.get(
  '/assets/:id',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const asset = await svc.getAsset(tenantId, id);
    res.json({ data: asset });
  }),
);

assetsRouter.put(
  '/assets/:id',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateAssetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const asset = await svc.updateAsset(tenantId, id, req.body);
    res.json({ data: asset });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Depreciation Schedule ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.post(
  '/assets/:id/depreciation-schedule',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const schedule = await svc.generateDepreciationSchedule(tenantId, id);
    res.status(201).json({ data: schedule });
  }),
);

assetsRouter.get(
  '/assets/:id/depreciation-schedule',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const schedule = await svc.getDepreciationSchedule(tenantId, id);
    res.json({ data: schedule });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Disposal ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.post(
  '/assets/:id/dispose',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: uuidParamSchema, body: disposeAssetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const result = await svc.disposeAsset(tenantId, id, req.body, actorId);
    res.status(201).json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Maintenance ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/assets/:id/maintenance',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: uuidParamSchema, query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { page, limit, sortDir } = req.query as unknown as z.infer<typeof paginationSchema>;
    const result = await svc.listMaintenanceSchedule(tenantId, id, { page, limit, sortDir: sortDir ?? 'desc' });
    res.json(result);
  }),
);

assetsRouter.post(
  '/assets/:id/maintenance',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ params: uuidParamSchema, body: scheduleMaintenanceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const record = await svc.scheduleAssetMaintenance(tenantId, id, req.body, actorId);
    res.status(201).json({ data: record });
  }),
);
