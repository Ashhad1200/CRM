/**
 * Marketing module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/marketing/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import * as repo from './repository.js';
import {
  createSegmentSchema,
  updateSegmentSchema,
  createCampaignSchema,
  updateCampaignSchema,
  scheduleCampaignSchema,
  sendCampaignSchema,
  processWebhookSchema,
  recordTouchSchema,
  attributionQuerySchema,
  listSegmentsQuerySchema,
  listCampaignsQuerySchema,
  listUnsubscribesQuerySchema,
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
// ── Segments ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/segments',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ query: listSegmentsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listSegmentsQuerySchema
    >;
    const result = await svc.getSegments(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

router.post(
  '/segments',
  requirePermission({ module: 'marketing', action: 'create' }),
  validate({ body: createSegmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const segment = await svc.createSegment(tenantId, req.body, actorId);
    res.status(201).json({ data: segment });
  }),
);

router.get(
  '/segments/:id',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const segment = await svc.getSegment(tenantId, id);
    res.json({ data: segment });
  }),
);

router.patch(
  '/segments/:id',
  requirePermission({ module: 'marketing', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateSegmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const segment = await svc.updateSegment(tenantId, id, req.body);
    res.json({ data: segment });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Campaigns ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/campaigns',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ query: listCampaignsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listCampaignsQuerySchema
    >;
    const result = await svc.getCampaigns(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

router.post(
  '/campaigns',
  requirePermission({ module: 'marketing', action: 'create' }),
  validate({ body: createCampaignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const campaign = await svc.buildCampaign(tenantId, req.body, actorId);
    res.status(201).json({ data: campaign });
  }),
);

router.get(
  '/campaigns/:id',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const campaign = await svc.getCampaign(tenantId, id);
    res.json({ data: campaign });
  }),
);

router.patch(
  '/campaigns/:id',
  requirePermission({ module: 'marketing', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateCampaignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const campaign = await svc.updateCampaign(tenantId, id, req.body);
    res.json({ data: campaign });
  }),
);

router.post(
  '/campaigns/:id/schedule',
  requirePermission({ module: 'marketing', action: 'update' }),
  validate({ params: uuidParamSchema, body: scheduleCampaignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { sendAt } = req.body as { sendAt: Date };
    const campaign = await svc.scheduleCampaign(tenantId, id, sendAt, actorId);
    res.json({ data: campaign });
  }),
);

router.post(
  '/campaigns/:id/send',
  requirePermission({ module: 'marketing', action: 'create' }),
  validate({ params: uuidParamSchema, body: sendCampaignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { contactIds } = req.body as { contactIds: string[] };
    const campaign = await svc.sendCampaign(tenantId, id, contactIds, actorId);
    res.json({ data: campaign });
  }),
);

router.get(
  '/campaigns/:id/metrics',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const metrics = await svc.getCampaignMetrics(tenantId, id);
    res.json({ data: metrics });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Webhooks ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/webhooks',
  requirePermission({ module: 'marketing', action: 'create' }),
  validate({ body: processWebhookSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { recipientId, event } = req.body as { recipientId: string; event: string };
    await svc.processWebhook(tenantId, recipientId, event);
    res.json({ data: { success: true } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Attribution ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/attribution',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ query: attributionQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, startDate, endDate, model } = req.query as unknown as z.infer<
      typeof attributionQuerySchema
    >;
    const result = await svc.generateAttributionReport(
      tenantId,
      { startDate, endDate },
      model,
      { page, limit },
    );
    res.json(result);
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Touches ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/touches',
  requirePermission({ module: 'marketing', action: 'create' }),
  validate({ body: recordTouchSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const touch = await svc.recordTouch(tenantId, req.body, actorId);
    res.status(201).json({ data: touch });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Unsubscribes ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/unsubscribes',
  requirePermission({ module: 'marketing', action: 'read' }),
  validate({ query: listUnsubscribesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listUnsubscribesQuerySchema
    >;
    const { data, total } = await repo.findUnsubscribes(tenantId, filters, { page, limit });
    res.json({
      data,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

export const marketingRouter = router;
