/**
 * Sales module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/sales/` by server.ts.
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
  createContactSchema,
  updateContactSchema,
  listContactsQuerySchema,
  createAccountSchema,
  updateAccountSchema,
  createLeadSchema,
  convertLeadSchema,
  listLeadsQuerySchema,
  createDealSchema,
  updateDealSchema,
  moveDealStageSchema,
  listDealsQuerySchema,
  createQuoteSchema,
} from './validators.js';
import type { OwnershipScope } from './repository.js';

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

/** Build an OwnershipScope from the value set by rbac middleware (if any). */
function ownershipScope(req: Request): OwnershipScope | undefined {
  const raw = req.ownershipScope;
  if (!raw) return undefined;
  return { scope: raw as OwnershipScope['scope'], userId: req.user!.sub };
}

// ── Inline schema for account list query (not present in validators.ts) ────

const listAccountsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  industry: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const salesRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Contacts ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/contacts',
  requirePermission({ module: 'sales', entity: 'contact', action: 'read' }),
  validate({ query: listContactsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listContactsQuerySchema
    >;
    const result = await svc.getContacts(
      tenantId,
      { ...filters, tenantId },
      { page, limit, sortBy, sortDir },
      ownershipScope(req),
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

salesRouter.post(
  '/contacts',
  requirePermission({ module: 'sales', entity: 'contact', action: 'create' }),
  validate({ body: createContactSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const contact = await svc.createContact(tenantId, req.body, actorId);
    res.status(201).json({ data: contact });
  }),
);

salesRouter.get(
  '/contacts/:id',
  requirePermission({ module: 'sales', entity: 'contact', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const contact = await svc.getContact(tenantId, id);
    res.json({ data: contact });
  }),
);

salesRouter.patch(
  '/contacts/:id',
  requirePermission({ module: 'sales', entity: 'contact', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateContactSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const contact = await svc.updateContact(tenantId, id, req.body, actorId);
    res.json({ data: contact });
  }),
);

salesRouter.delete(
  '/contacts/:id',
  requirePermission({ module: 'sales', entity: 'contact', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (_req: Request, res: Response) => {
    // TODO: implement deleteContact service
    res.status(204).end();
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Accounts ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/accounts',
  requirePermission({ module: 'sales', entity: 'account', action: 'read' }),
  validate({ query: listAccountsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listAccountsQuerySchema
    >;
    const result = await svc.getAccounts(
      tenantId,
      filters,
      { page, limit, sortBy, sortDir },
      ownershipScope(req),
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

salesRouter.post(
  '/accounts',
  requirePermission({ module: 'sales', entity: 'account', action: 'create' }),
  validate({ body: createAccountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const account = await svc.createAccount(tenantId, req.body, actorId);
    res.status(201).json({ data: account });
  }),
);

salesRouter.get(
  '/accounts/:id',
  requirePermission({ module: 'sales', entity: 'account', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const account = await svc.getAccount(tenantId, id);
    res.json({ data: account });
  }),
);

salesRouter.patch(
  '/accounts/:id',
  requirePermission({ module: 'sales', entity: 'account', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateAccountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const account = await svc.updateAccount(tenantId, id, req.body, actorId);
    res.json({ data: account });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Leads ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/leads',
  requirePermission({ module: 'sales', entity: 'lead', action: 'read' }),
  validate({ query: listLeadsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listLeadsQuerySchema
    >;
    const result = await svc.getLeads(
      tenantId,
      { ...filters, tenantId },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

salesRouter.post(
  '/leads',
  requirePermission({ module: 'sales', entity: 'lead', action: 'create' }),
  validate({ body: createLeadSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const lead = await svc.captureLead(tenantId, req.body, actorId);
    res.status(201).json({ data: lead });
  }),
);

salesRouter.get(
  '/leads/:id',
  requirePermission({ module: 'sales', entity: 'lead', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const lead = await svc.getLead(tenantId, id);
    res.json({ data: lead });
  }),
);

salesRouter.post(
  '/leads/:id/convert',
  requirePermission({ module: 'sales', entity: 'lead', action: 'update' }),
  validate({ params: uuidParamSchema, body: convertLeadSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const result = await svc.convertLead(tenantId, id, req.body, actorId);
    res.json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Deals ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/deals',
  requirePermission({ module: 'sales', entity: 'deal', action: 'read' }),
  validate({ query: listDealsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listDealsQuerySchema
    >;
    const result = await svc.getDeals(
      tenantId,
      { ...filters, tenantId },
      { page, limit, sortBy, sortDir },
      ownershipScope(req),
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

salesRouter.post(
  '/deals',
  requirePermission({ module: 'sales', entity: 'deal', action: 'create' }),
  validate({ body: createDealSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const deal = await svc.createDeal(tenantId, req.body, actorId);
    res.status(201).json({ data: deal });
  }),
);

salesRouter.get(
  '/deals/:id',
  requirePermission({ module: 'sales', entity: 'deal', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const deal = await svc.getDeal(tenantId, id);
    res.json({ data: deal });
  }),
);

salesRouter.patch(
  '/deals/:id',
  requirePermission({ module: 'sales', entity: 'deal', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateDealSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const deal = await svc.updateDeal(tenantId, id, req.body, actorId);
    res.json({ data: deal });
  }),
);

salesRouter.post(
  '/deals/:id/stage',
  requirePermission({ module: 'sales', entity: 'deal', action: 'update' }),
  validate({ params: uuidParamSchema, body: moveDealStageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { stageId } = req.body as z.infer<typeof moveDealStageSchema>;
    const deal = await svc.moveDealStage(tenantId, id, stageId, actorId);
    res.json({ data: deal });
  }),
);

salesRouter.post(
  '/deals/:id/won',
  requirePermission({ module: 'sales', entity: 'deal', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const deal = await svc.markDealWon(tenantId, id, actorId);
    res.json({ data: deal });
  }),
);

const dealLostBodySchema = z.object({ reason: z.string().min(1).max(500) });

salesRouter.post(
  '/deals/:id/lost',
  requirePermission({ module: 'sales', entity: 'deal', action: 'update' }),
  validate({ params: uuidParamSchema, body: dealLostBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { reason } = req.body as z.infer<typeof dealLostBodySchema>;
    const deal = await svc.markDealLost(tenantId, id, reason, actorId);
    res.json({ data: deal });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Quotes ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/deals/:id/quotes',
  requirePermission({ module: 'sales', entity: 'quote', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const dealId = param(req, 'id');
    const quotes = await svc.getQuotes(tenantId, dealId);
    res.json({ data: quotes });
  }),
);

salesRouter.post(
  '/deals/:id/quotes',
  requirePermission({ module: 'sales', entity: 'quote', action: 'create' }),
  validate({ params: uuidParamSchema, body: createQuoteSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const dealId = param(req, 'id');
    // Override dealId from URL params to ensure consistency
    const body = { ...req.body, dealId } as z.infer<typeof createQuoteSchema>;
    const quote = await svc.createQuote(tenantId, body, actorId);
    res.status(201).json({ data: quote });
  }),
);

salesRouter.get(
  '/quotes/:id',
  requirePermission({ module: 'sales', entity: 'quote', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const quote = await svc.getQuote(tenantId, id);
    res.json({ data: quote });
  }),
);

salesRouter.post(
  '/quotes/:id/approve',
  requirePermission({ module: 'sales', entity: 'quote', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    // Default discount threshold; consider making configurable per-tenant
    const DISCOUNT_THRESHOLD = 20;
    const quote = await svc.submitForApproval(tenantId, id, DISCOUNT_THRESHOLD, actorId);
    res.json({ data: quote });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Pipelines ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/pipelines',
  requirePermission({ module: 'sales', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    // Pipeline listing comes from repository directly (no service wrapper yet)
    const { findPipelines } = await import('./repository.js');
    const pipelines = await findPipelines(tenantId);
    res.json({ data: pipelines });
  }),
);

salesRouter.get(
  '/pipelines/:id',
  requirePermission({ module: 'sales', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { findPipeline } = await import('./repository.js');
    const pipeline = await findPipeline(tenantId, id);
    res.json({ data: pipeline });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Gamification ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/gamification/leaderboard',
  requirePermission({ module: 'sales', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const period = (req.query['period'] as string) ?? 'MONTHLY';
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { getLeaderboard } = await import('./gamification.service.js');
    const entries = await getLeaderboard(tenantId, period, periodStart);
    res.json({ data: entries });
  }),
);

salesRouter.post(
  '/gamification/leaderboard/calculate',
  requirePermission({ module: 'sales', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const period = (req.body.period as string) ?? 'MONTHLY';
    const periodStart = req.body.periodStart ? new Date(req.body.periodStart) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { calculateLeaderboard } = await import('./gamification.service.js');
    const entries = await calculateLeaderboard(tenantId, period, periodStart);
    res.json({ data: entries });
  }),
);

salesRouter.get(
  '/gamification/targets',
  requirePermission({ module: 'sales', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const userId = req.query['userId'] as string | undefined;
    const { getTargets } = await import('./gamification.service.js');
    const targets = await getTargets(tenantId, userId);
    res.json({ data: targets });
  }),
);

salesRouter.post(
  '/gamification/targets',
  requirePermission({ module: 'sales', action: 'create' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { createTarget } = await import('./gamification.service.js');
    const target = await createTarget(tenantId, req.body);
    res.status(201).json({ data: target });
  }),
);

salesRouter.get(
  '/gamification/badges/:userId',
  requirePermission({ module: 'sales', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const userId = param(req, 'userId');
    const { getUserBadges } = await import('./gamification.service.js');
    const badges = await getUserBadges(tenantId, userId);
    res.json({ data: badges });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Lead Scoring ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.post(
  '/lead-scoring/score/:id',
  requirePermission({ module: 'sales', entity: 'lead', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { scoreLead } = await import('./lead-scoring.service.js');
    const breakdown = await scoreLead(tenantId, id);
    res.json({ data: breakdown });
  }),
);

salesRouter.post(
  '/lead-scoring/rescore',
  requirePermission({ module: 'sales', entity: 'lead', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { rescoreAllLeads } = await import('./lead-scoring.service.js');
    const updated = await rescoreAllLeads(tenantId);
    res.json({ data: { updated } });
  }),
);

salesRouter.get(
  '/lead-scoring/distribution',
  requirePermission({ module: 'sales', entity: 'lead', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { getLeadScoreDistribution } = await import('./lead-scoring.service.js');
    const distribution = await getLeadScoreDistribution(tenantId);
    res.json({ data: distribution });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Social Selling ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

salesRouter.get(
  '/social/:contactId',
  requirePermission({ module: 'sales', entity: 'contact', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const contactId = param(req, 'contactId');
    const { getContactSocialProfiles } = await import('./social.service.js');
    const profiles = await getContactSocialProfiles(tenantId, contactId);
    res.json({ data: profiles });
  }),
);

salesRouter.post(
  '/social/:contactId',
  requirePermission({ module: 'sales', entity: 'contact', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const contactId = param(req, 'contactId');
    const { platform, profileUrl, profileData } = req.body;
    const { upsertSocialProfile } = await import('./social.service.js');
    const profile = await upsertSocialProfile(tenantId, contactId, platform, profileUrl, profileData);
    res.json({ data: profile });
  }),
);

salesRouter.get(
  '/social/:contactId/score',
  requirePermission({ module: 'sales', entity: 'contact', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const contactId = param(req, 'contactId');
    const { getSocialTouchScore } = await import('./social.service.js');
    const score = await getSocialTouchScore(tenantId, contactId);
    res.json({ data: score });
  }),
);
