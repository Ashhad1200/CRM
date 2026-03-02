/**
 * Asset Management module — HTTP route definitions (V2 Enhanced).
 *
 * All routes are mounted under `/api/v1/assets/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 *
 * V2 additions:
 * - Asset images (upload, delete, set primary)
 * - Asset transfers with approval workflow
 * - Asset audits with line verification
 * - Enhanced disposal with approval workflow
 * - Maintenance schedules (recurring)
 * - Write-off endpoint
 * - Enhanced reporting
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
  // V2 additions
  createTransferSchema,
  approveTransferSchema,
  completeTransferSchema,
  cancelTransferSchema,
  listTransfersQuerySchema,
  createAuditSchema,
  updateAuditSchema,
  verifyAuditLineSchema,
  bulkVerifyAuditLinesSchema,
  listAuditsQuerySchema,
  addAssetImageSchema,
  setImagePrimarySchema,
  createMaintenanceScheduleSchema,
  updateMaintenanceScheduleSchema,
  requestDisposalSchema,
  approveDisposalSchema,
  completeDisposalSchema,
  writeOffAssetSchema,
  maintenanceDueQuerySchema,
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

// ── Additional param schemas ──────────────────────────────────────────────────

const maintenanceParamSchema = z.object({
  id: z.string().uuid(),
});

const transferParamSchema = z.object({
  transferId: z.string().uuid(),
});

const auditParamSchema = z.object({
  auditId: z.string().uuid(),
});

const auditLineParamSchema = z.object({
  auditId: z.string().uuid(),
  lineId: z.string().uuid(),
});

const imageParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

const scheduleParamSchema = z.object({
  scheduleId: z.string().uuid(),
});

const disposalParamSchema = z.object({
  disposalId: z.string().uuid(),
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

assetsRouter.delete(
  '/categories/:id',
  requirePermission({ module: 'assets', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    await svc.deleteAssetCategory(tenantId, id);
    res.status(204).send();
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
// ── Maintenance Complete (placed before /:id to avoid route conflicts) ─────────
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
// ── Maintenance Due Report ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/maintenance/due',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ query: maintenanceDueQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { daysAhead, includeOverdue } = req.query as unknown as z.infer<
      typeof maintenanceDueQuerySchema
    >;
    const report = await svc.getMaintenanceDueReport(tenantId, {
      daysAhead,
      includeOverdue,
    });
    res.json({ data: report });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Transfers ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

assetsRouter.get(
  '/transfers',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ query: listTransfersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const query = req.query as unknown as z.infer<typeof listTransfersQuerySchema>;
    const result = await svc.listTransfers(tenantId, query);
    res.json(result);
  }),
);

assetsRouter.post(
  '/transfers',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: createTransferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const transfer = await svc.createTransfer(tenantId, req.body, actorId);
    res.status(201).json({ data: transfer });
  }),
);

assetsRouter.get(
  '/transfers/:transferId',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: transferParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const transferId = param(req, 'transferId');
    const transfer = await svc.getTransfer(tenantId, transferId);
    res.json({ data: transfer });
  }),
);

assetsRouter.post(
  '/transfers/:transferId/approve',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: transferParamSchema, body: approveTransferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const transferId = param(req, 'transferId');
    const transfer = await svc.approveTransfer(
      tenantId,
      transferId,
      req.body,
      actorId,
    );
    res.json({ data: transfer });
  }),
);

assetsRouter.post(
  '/transfers/:transferId/complete',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: transferParamSchema, body: completeTransferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const transferId = param(req, 'transferId');
    const transfer = await svc.completeTransfer(
      tenantId,
      transferId,
      req.body,
      actorId,
    );
    res.json({ data: transfer });
  }),
);

assetsRouter.post(
  '/transfers/:transferId/cancel',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: transferParamSchema, body: cancelTransferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const transferId = param(req, 'transferId');
    const transfer = await svc.cancelTransfer(
      tenantId,
      transferId,
      req.body,
      actorId,
    );
    res.json({ data: transfer });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Audits ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

assetsRouter.get(
  '/audits',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ query: listAuditsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const query = req.query as unknown as z.infer<typeof listAuditsQuerySchema>;
    const result = await svc.listAudits(tenantId, query);
    res.json(result);
  }),
);

assetsRouter.post(
  '/audits',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: createAuditSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const audit = await svc.createAudit(tenantId, req.body, actorId);
    res.status(201).json({ data: audit });
  }),
);

assetsRouter.get(
  '/audits/:auditId',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: auditParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const auditId = param(req, 'auditId');
    const audit = await svc.getAudit(tenantId, auditId);
    res.json({ data: audit });
  }),
);

assetsRouter.put(
  '/audits/:auditId',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditParamSchema, body: updateAuditSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const auditId = param(req, 'auditId');
    const audit = await svc.updateAudit(tenantId, auditId, req.body);
    res.json({ data: audit });
  }),
);

assetsRouter.post(
  '/audits/:auditId/start',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const auditId = param(req, 'auditId');
    const audit = await svc.startAudit(tenantId, auditId, actorId);
    res.json({ data: audit });
  }),
);

assetsRouter.post(
  '/audits/:auditId/complete',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const auditId = param(req, 'auditId');
    const audit = await svc.completeAudit(tenantId, auditId, actorId);
    res.json({ data: audit });
  }),
);

assetsRouter.post(
  '/audits/:auditId/cancel',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const auditId = param(req, 'auditId');
    const audit = await svc.cancelAudit(tenantId, auditId, actorId);
    res.json({ data: audit });
  }),
);

assetsRouter.get(
  '/audits/:auditId/summary',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: auditParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const auditId = param(req, 'auditId');
    const summary = await svc.getAuditSummary(tenantId, auditId);
    res.json({ data: summary });
  }),
);

// ── Audit Lines ───────────────────────────────────────────────────────────────

assetsRouter.get(
  '/audits/:auditId/lines',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: auditParamSchema, query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const auditId = param(req, 'auditId');
    const pagination = req.query as unknown as z.infer<typeof paginationSchema>;
    const result = await svc.listAuditLines(tenantId, auditId, pagination);
    res.json(result);
  }),
);

assetsRouter.put(
  '/audits/:auditId/lines/:lineId/verify',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditLineParamSchema, body: verifyAuditLineSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const auditId = param(req, 'auditId');
    const lineId = param(req, 'lineId');
    const line = await svc.verifyAuditLine(
      tenantId,
      auditId,
      lineId,
      req.body,
      actorId,
    );
    res.json({ data: line });
  }),
);

assetsRouter.post(
  '/audits/:auditId/lines/bulk-verify',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: auditParamSchema, body: bulkVerifyAuditLinesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const auditId = param(req, 'auditId');
    const result = await svc.bulkVerifyAuditLines(
      tenantId,
      auditId,
      req.body,
      actorId,
    );
    res.json({ data: result });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance Schedules (Recurring) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

assetsRouter.get(
  '/maintenance-schedules',
  requirePermission({ module: 'assets', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const schedules = await svc.listMaintenanceSchedules(tenantId);
    res.json({ data: schedules, total: schedules.length });
  }),
);

assetsRouter.post(
  '/maintenance-schedules',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: createMaintenanceScheduleSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const schedule = await svc.createMaintenanceSchedule(
      tenantId,
      req.body,
      actorId,
    );
    res.status(201).json({ data: schedule });
  }),
);

assetsRouter.get(
  '/maintenance-schedules/:scheduleId',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: scheduleParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const scheduleId = param(req, 'scheduleId');
    const schedule = await svc.getMaintenanceSchedule(tenantId, scheduleId);
    res.json({ data: schedule });
  }),
);

assetsRouter.put(
  '/maintenance-schedules/:scheduleId',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: scheduleParamSchema, body: updateMaintenanceScheduleSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const scheduleId = param(req, 'scheduleId');
    const schedule = await svc.updateMaintenanceSchedule(
      tenantId,
      scheduleId,
      req.body,
    );
    res.json({ data: schedule });
  }),
);

assetsRouter.delete(
  '/maintenance-schedules/:scheduleId',
  requirePermission({ module: 'assets', action: 'delete' }),
  validate({ params: scheduleParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const scheduleId = param(req, 'scheduleId');
    await svc.deleteMaintenanceSchedule(tenantId, scheduleId);
    res.status(204).send();
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Fixed Assets ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

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
      { page, limit, sortBy, sortDir },
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
// ── Asset Images ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: AssetImage model is not yet implemented in the Prisma schema.
// These routes are stubbed out pending implementation.
//
// Planned routes:
// - GET /assets/:id/images - list asset images
// - POST /assets/:id/images - add asset image
// - DELETE /assets/:id/images/:imageId - delete asset image
// - PUT /assets/:id/images/:imageId/primary - set image as primary

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
// ── Asset Disposal (Legacy - Direct Disposal) ────────────────────────────────
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
// ── Asset Write-Off ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.post(
  '/assets/:id/write-off',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: uuidParamSchema, body: writeOffAssetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const result = await svc.writeOffAsset(tenantId, id, req.body, actorId);
    res.status(201).json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Asset Maintenance (Per-Asset) ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

assetsRouter.get(
  '/assets/:id/maintenance',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: uuidParamSchema, query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const pagination = req.query as unknown as z.infer<typeof paginationSchema>;
    const result = await svc.listMaintenanceSchedule(tenantId, id, pagination);
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Disposals (V2 - With Approval Workflow) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

assetsRouter.get(
  '/disposals',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ query: paginationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const pagination = req.query as unknown as z.infer<typeof paginationSchema>;
    const result = await svc.listDisposals(tenantId, pagination);
    res.json(result);
  }),
);

assetsRouter.post(
  '/disposals/request',
  requirePermission({ module: 'assets', action: 'create' }),
  validate({ body: requestDisposalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const disposal = await svc.requestDisposal(tenantId, req.body, actorId);
    res.status(201).json({ data: disposal });
  }),
);

assetsRouter.get(
  '/disposals/:disposalId',
  requirePermission({ module: 'assets', action: 'read' }),
  validate({ params: disposalParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const disposalId = param(req, 'disposalId');
    const disposal = await svc.getDisposal(tenantId, disposalId);
    res.json({ data: disposal });
  }),
);

assetsRouter.post(
  '/disposals/:disposalId/approve',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: disposalParamSchema, body: approveDisposalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const disposalId = param(req, 'disposalId');
    const disposal = await svc.approveDisposal(
      tenantId,
      disposalId,
      req.body,
      actorId,
    );
    res.json({ data: disposal });
  }),
);

assetsRouter.post(
  '/disposals/:disposalId/complete',
  requirePermission({ module: 'assets', action: 'update' }),
  validate({ params: disposalParamSchema, body: completeDisposalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const disposalId = param(req, 'disposalId');
    const disposal = await svc.completeDisposal(
      tenantId,
      disposalId,
      req.body,
      actorId,
    );
    res.json({ data: disposal });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Export Router ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default assetsRouter;
