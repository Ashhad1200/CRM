/**
 * Comms module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/comms/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import * as emailSyncSvc from './email-sync.service.js';
import {
  paginationSchema,
  createActivitySchema,
  logCallSchema,
  sendEmailSchema,
  createTemplateSchema,
  updateTemplateSchema,
  connectEmailSyncSchema,
  listActivitiesQuerySchema,
  timelineQuerySchema,
  listTemplatesQuerySchema,
  disconnectEmailSyncSchema,
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

// ── Inline query schemas ───────────────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const activityIdParamSchema = z.object({
  activityId: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const commsRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Activities ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.get(
  '/activities',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ query: listActivitiesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listActivitiesQuerySchema
    >;
    const result = await svc.getActivities(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

commsRouter.post(
  '/activities',
  requirePermission({ module: 'comms', action: 'create' }),
  validate({ body: createActivitySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const activity = await svc.createActivity(tenantId, req.body, actorId);
    res.status(201).json({ data: activity });
  }),
);

commsRouter.get(
  '/activities/:id',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const activity = await svc.getActivity(tenantId, id);
    res.json({ data: activity });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Timeline ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.get(
  '/timeline',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ query: timelineQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof timelineQuerySchema
    >;
    const result = await svc.getTimeline(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Calls ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.post(
  '/calls',
  requirePermission({ module: 'comms', action: 'create' }),
  validate({ body: logCallSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const result = await svc.logCall(tenantId, req.body, actorId);
    res.status(201).json({ data: result });
  }),
);

commsRouter.get(
  '/calls/:activityId',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ params: activityIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const activityId = param(req, 'activityId');
    const callLog = await svc.getCallLog(tenantId, activityId);
    res.json({ data: callLog });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Email Templates ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.get(
  '/email-templates',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ query: listTemplatesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listTemplatesQuerySchema
    >;
    const result = await svc.getEmailTemplates(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

commsRouter.post(
  '/email-templates',
  requirePermission({ module: 'comms', action: 'create' }),
  validate({ body: createTemplateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const template = await svc.createEmailTemplate(tenantId, req.body, actorId);
    res.status(201).json({ data: template });
  }),
);

commsRouter.get(
  '/email-templates/:id',
  requirePermission({ module: 'comms', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const template = await svc.getEmailTemplate(tenantId, id);
    res.json({ data: template });
  }),
);

commsRouter.patch(
  '/email-templates/:id',
  requirePermission({ module: 'comms', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateTemplateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const template = await svc.updateEmailTemplate(tenantId, id, req.body, actorId);
    res.json({ data: template });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Send Email ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.post(
  '/emails/send',
  requirePermission({ module: 'comms', action: 'create' }),
  validate({ body: sendEmailSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const activity = await svc.sendEmail(tenantId, req.body, actorId);
    res.status(201).json({ data: activity });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Email Sync ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

commsRouter.get(
  '/email-sync',
  requirePermission({ module: 'comms', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: userId } = req.user!;
    const syncs = await svc.getEmailSyncs(tenantId, userId);
    res.json({ data: syncs });
  }),
);

commsRouter.post(
  '/email-sync/connect',
  requirePermission({ module: 'comms', action: 'create' }),
  validate({ body: connectEmailSyncSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: userId } = req.user!;
    const sync = await svc.connectEmailSync(tenantId, userId, req.body);
    res.status(201).json({ data: sync });
  }),
);

commsRouter.post(
  '/email-sync/disconnect',
  requirePermission({ module: 'comms', action: 'update' }),
  validate({ body: disconnectEmailSyncSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: userId } = req.user!;
    const { provider } = req.body;
    const sync = await svc.disconnectEmailSync(tenantId, userId, provider);
    res.json({ data: sync });
  }),
);

commsRouter.get(
  '/email-sync/gmail/auth-url',
  requirePermission({ module: 'comms', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: userId } = req.user!;
    const url = emailSyncSvc.getGmailAuthUrl(tenantId, userId);
    res.json({ data: { url } });
  }),
);

commsRouter.get(
  '/email-sync/outlook/auth-url',
  requirePermission({ module: 'comms', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: userId } = req.user!;
    const url = emailSyncSvc.getOutlookAuthUrl(tenantId, userId);
    res.json({ data: { url } });
  }),
);
