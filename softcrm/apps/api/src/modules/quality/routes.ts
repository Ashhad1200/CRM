/**
 * Quality Control module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/quality/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import {
  uuidParamSchema,
  supplierIdParamSchema,
  paginationSchema,
  createInspectionTemplateSchema,
  updateInspectionTemplateSchema,
  listInspectionTemplatesQuerySchema,
  createInspectionSchema,
  listInspectionsQuerySchema,
  recordResultsSchema,
  createNcrSchema,
  updateNcrSchema,
  resolveNcrSchema,
  listNcrsQuerySchema,
  createCorrectiveActionSchema,
  updateCorrectiveActionSchema,
  completeCorrectiveActionSchema,
  listCorrectiveActionsQuerySchema,
  calculateQualityScoreSchema,
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const qualityRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Inspection Templates ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /inspection-templates — list templates with filters and pagination. */
qualityRouter.get(
  '/inspection-templates',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ query: listInspectionTemplatesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, type, isActive } =
      req.query as unknown as z.infer<typeof listInspectionTemplatesQuerySchema>;

    const result = await svc.listInspectionTemplates(
      tenantId,
      { type, isActive },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /inspection-templates — create a new template. */
qualityRouter.post(
  '/inspection-templates',
  requirePermission({ module: 'quality', action: 'create' }),
  validate({ body: createInspectionTemplateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const template = await svc.createInspectionTemplate(
      tenantId,
      req.body,
      actorId,
    );
    res.status(201).json({ data: template });
  }),
);

/** GET /inspection-templates/:id — get a single template. */
qualityRouter.get(
  '/inspection-templates/:id',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    // Leverage repository directly via service (no wrapping needed)
    const { findInspectionTemplate } = await import('./repository.js');
    const template = await findInspectionTemplate(tenantId, id);
    res.json({ data: template });
  }),
);

/** PUT /inspection-templates/:id — update a template. */
qualityRouter.put(
  '/inspection-templates/:id',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateInspectionTemplateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const template = await svc.updateInspectionTemplate(tenantId, id, req.body);
    res.json({ data: template });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Inspections ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /inspections — list inspections with filters and pagination. */
qualityRouter.get(
  '/inspections',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ query: listInspectionsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } =
      req.query as unknown as z.infer<typeof listInspectionsQuerySchema>;

    const result = await svc.listInspections(
      tenantId,
      filters,
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /inspections — create a new inspection. */
qualityRouter.post(
  '/inspections',
  requirePermission({ module: 'quality', action: 'create' }),
  validate({ body: createInspectionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const inspection = await svc.createInspection(tenantId, req.body, actorId);
    res.status(201).json({ data: inspection });
  }),
);

/** GET /inspections/:id — get a single inspection with results. */
qualityRouter.get(
  '/inspections/:id',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const inspection = await svc.getInspection(tenantId, id);
    res.json({ data: inspection });
  }),
);

/** POST /inspections/:id/start — start an inspection. */
qualityRouter.post(
  '/inspections/:id/start',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const inspection = await svc.startInspection(tenantId, id, actorId);
    res.json({ data: inspection });
  }),
);

/** POST /inspections/:id/results — record inspection results. */
qualityRouter.post(
  '/inspections/:id/results',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: recordResultsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { results, conductedDate, notes } = req.body as z.infer<
      typeof recordResultsSchema
    >;

    const inspection = await svc.recordResults(
      tenantId,
      id,
      results,
      actorId,
      { conductedDate, notes },
    );
    res.json({ data: inspection });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Non-Conformance Reports ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /ncrs — list NCRs with filters and pagination. */
qualityRouter.get(
  '/ncrs',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ query: listNcrsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } =
      req.query as unknown as z.infer<typeof listNcrsQuerySchema>;

    const result = await svc.listNCRs(
      tenantId,
      filters,
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /ncrs — create a new NCR. */
qualityRouter.post(
  '/ncrs',
  requirePermission({ module: 'quality', action: 'create' }),
  validate({ body: createNcrSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const ncr = await svc.createNCR(tenantId, req.body, actorId);
    res.status(201).json({ data: ncr });
  }),
);

/** GET /ncrs/:id — get a single NCR with corrective actions. */
qualityRouter.get(
  '/ncrs/:id',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { findNcr } = await import('./repository.js');
    const ncr = await findNcr(tenantId, id);
    res.json({ data: ncr });
  }),
);

/** PUT /ncrs/:id — update an NCR. */
qualityRouter.put(
  '/ncrs/:id',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateNcrSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const ncr = await svc.updateNCR(tenantId, id, req.body);
    res.json({ data: ncr });
  }),
);

/** POST /ncrs/:id/resolve — resolve an NCR. */
qualityRouter.post(
  '/ncrs/:id/resolve',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: resolveNcrSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const ncr = await svc.resolveNCR(tenantId, id, req.body, actorId);
    res.json({ data: ncr });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Corrective Actions ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /ncrs/:id/corrective-actions — list CAPAs for an NCR. */
qualityRouter.get(
  '/ncrs/:id/corrective-actions',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: uuidParamSchema, query: listCorrectiveActionsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const ncrId = param(req, 'id');
    const { page, limit, sortBy, sortDir, status, assignedTo } =
      req.query as unknown as z.infer<typeof listCorrectiveActionsQuerySchema>;

    const result = await svc.listCorrectiveActions(
      tenantId,
      { ncrId, status, assignedTo },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /ncrs/:id/corrective-actions — add a CAPA to an NCR. */
qualityRouter.post(
  '/ncrs/:id/corrective-actions',
  requirePermission({ module: 'quality', action: 'create' }),
  validate({ params: uuidParamSchema, body: createCorrectiveActionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const ncrId = param(req, 'id');
    const ca = await svc.createCorrectiveAction(
      tenantId,
      ncrId,
      req.body,
      actorId,
    );
    res.status(201).json({ data: ca });
  }),
);

/** GET /corrective-actions/:id — get a single CAPA. */
qualityRouter.get(
  '/corrective-actions/:id',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { findCorrectiveAction } = await import('./repository.js');
    const ca = await findCorrectiveAction(tenantId, id);
    res.json({ data: ca });
  }),
);

/** PUT /corrective-actions/:id — update a CAPA. */
qualityRouter.put(
  '/corrective-actions/:id',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateCorrectiveActionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const ca = await svc.updateCorrectiveAction(tenantId, id, req.body);
    res.json({ data: ca });
  }),
);

/** POST /corrective-actions/:id/complete — complete a CAPA. */
qualityRouter.post(
  '/corrective-actions/:id/complete',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: uuidParamSchema, body: completeCorrectiveActionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { completedDate } = req.body as z.infer<
      typeof completeCorrectiveActionSchema
    >;
    const ca = await svc.completeCorrectiveAction(
      tenantId,
      id,
      completedDate,
    );
    res.json({ data: ca });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Supplier Quality Scores ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /supplier-quality/:supplierId — get supplier quality scores. */
qualityRouter.get(
  '/supplier-quality/:supplierId',
  requirePermission({ module: 'quality', action: 'read' }),
  validate({ params: supplierIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const supplierId = param(req, 'supplierId');
    const period = req.query['period'] as string | undefined;
    const scores = await svc.getSupplierQualityScore(
      tenantId,
      supplierId,
      period,
    );
    res.json({ data: scores });
  }),
);

/** POST /supplier-quality/:supplierId/calculate — calculate and store quality score. */
qualityRouter.post(
  '/supplier-quality/:supplierId/calculate',
  requirePermission({ module: 'quality', action: 'update' }),
  validate({ params: supplierIdParamSchema, body: calculateQualityScoreSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const supplierId = param(req, 'supplierId');
    const { period } = req.body as z.infer<typeof calculateQualityScoreSchema>;
    const score = await svc.calculateSupplierQualityScore(
      tenantId,
      supplierId,
      period,
    );
    res.json({ data: score });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Quality Summary ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /summary — get aggregate quality summary for the tenant. */
qualityRouter.get(
  '/summary',
  requirePermission({ module: 'quality', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const summary = await svc.getQualitySummary(tenantId);
    res.json({ data: summary });
  }),
);
