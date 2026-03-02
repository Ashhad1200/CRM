/**
 * Support module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/support/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as ticketSvc from './service.js';
import * as kbSvc from './kb.service.js';
import * as repo from './repository.js';
import {
  uuidParamSchema,
  paginationSchema,
  createTicketSchema,
  addReplySchema,
  resolveTicketSchema,
  escalateTicketSchema,
  submitCsatSchema,
  listTicketsQuerySchema,
  createArticleSchema,
  updateArticleSchema,
  listArticlesQuerySchema,
  searchArticlesQuerySchema,
  createCategorySchema,
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

export const supportRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Tickets ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /tickets — list tickets with filters and pagination. */
supportRouter.get(
  '/tickets',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ query: listTicketsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listTicketsQuerySchema
    >;
    const result = await ticketSvc.getTickets(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /tickets — create a new ticket. */
supportRouter.post(
  '/tickets',
  requirePermission({ module: 'support', action: 'create' }),
  validate({ body: createTicketSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const ticket = await ticketSvc.createTicket(tenantId, req.body, actorId);
    res.status(201).json({ data: ticket });
  }),
);

/** GET /tickets/:id — get ticket detail with replies. */
supportRouter.get(
  '/tickets/:id',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const ticket = await ticketSvc.getTicket(tenantId, id);
    res.json({ data: ticket });
  }),
);

/** POST /tickets/:id/reply — add a reply to a ticket. */
supportRouter.post(
  '/tickets/:id/reply',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema, body: addReplySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const reply = await ticketSvc.addReply(tenantId, id, req.body, actorId);
    res.status(201).json({ data: reply });
  }),
);

/** POST /tickets/:id/resolve — resolve a ticket. */
supportRouter.post(
  '/tickets/:id/resolve',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema, body: resolveTicketSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const ticket = await ticketSvc.resolveTicket(tenantId, id, actorId);
    res.json({ data: ticket });
  }),
);

/** POST /tickets/:id/close — close a resolved ticket. */
supportRouter.post(
  '/tickets/:id/close',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const ticket = await ticketSvc.closeTicket(tenantId, id, actorId);
    res.json({ data: ticket });
  }),
);

/** POST /tickets/:id/escalate — escalate a ticket. */
supportRouter.post(
  '/tickets/:id/escalate',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema, body: escalateTicketSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const reason = req.body?.reason;
    const ticket = await ticketSvc.escalateTicket(tenantId, id, actorId, reason);
    res.json({ data: ticket });
  }),
);

/** POST /tickets/:id/reopen — reopen a resolved/closed ticket. */
supportRouter.post(
  '/tickets/:id/reopen',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const ticket = await ticketSvc.reopenTicket(tenantId, id, actorId);
    res.json({ data: ticket });
  }),
);

/** GET /tickets/:id/replies — list replies for a ticket. */
supportRouter.get(
  '/tickets/:id/replies',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const replies = await ticketSvc.getTicketReplies(tenantId, id);
    res.json({ data: replies });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Knowledge Base — Articles ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /kb/articles/suggest — suggest articles for a ticket (must be before :id route). */
supportRouter.get(
  '/kb/articles/suggest',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ query: searchArticlesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { q } = req.query as unknown as z.infer<typeof searchArticlesQuerySchema>;
    const articles = await kbSvc.suggestArticles(tenantId, q);
    res.json({ data: articles });
  }),
);

/** GET /kb/articles — list articles with filters and pagination. */
supportRouter.get(
  '/kb/articles',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ query: listArticlesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listArticlesQuerySchema
    >;
    const result = await kbSvc.getArticles(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

/** POST /kb/articles — create a new article. */
supportRouter.post(
  '/kb/articles',
  requirePermission({ module: 'support', action: 'create' }),
  validate({ body: createArticleSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const article = await kbSvc.createArticle(tenantId, req.body, actorId);
    res.status(201).json({ data: article });
  }),
);

/** GET /kb/articles/:id — get article detail (increments view count). */
supportRouter.get(
  '/kb/articles/:id',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const article = await kbSvc.getArticle(tenantId, id);
    res.json({ data: article });
  }),
);

/** PATCH /kb/articles/:id — update an article. */
supportRouter.patch(
  '/kb/articles/:id',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateArticleSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const article = await kbSvc.updateArticle(tenantId, id, req.body);
    res.json({ data: article });
  }),
);

/** POST /kb/articles/:id/publish — publish an article. */
supportRouter.post(
  '/kb/articles/:id/publish',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const article = await kbSvc.publishArticle(tenantId, id);
    res.json({ data: article });
  }),
);

/** POST /kb/articles/:id/archive — archive an article. */
supportRouter.post(
  '/kb/articles/:id/archive',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const article = await kbSvc.archiveArticle(tenantId, id);
    res.json({ data: article });
  }),
);

/** POST /kb/articles/:id/helpful — mark an article as helpful. */
supportRouter.post(
  '/kb/articles/:id/helpful',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const article = await kbSvc.markArticleHelpful(tenantId, id);
    res.json({ data: article });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Knowledge Base — Categories ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /kb/categories — list all categories. */
supportRouter.get(
  '/kb/categories',
  requirePermission({ module: 'support', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const categories = await kbSvc.getCategories(tenantId);
    res.json({ data: categories });
  }),
);

/** POST /kb/categories — create a new category. */
supportRouter.post(
  '/kb/categories',
  requirePermission({ module: 'support', action: 'create' }),
  validate({ body: createCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const category = await kbSvc.createCategory(tenantId, req.body);
    res.status(201).json({ data: category });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── CSAT Surveys ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /tickets/:id/csat — get CSAT survey for a ticket. */
supportRouter.get(
  '/tickets/:id/csat',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const survey = await repo.findCsatByTicket(tenantId, id);
    res.json({ data: survey });
  }),
);

/** POST /csat/:id/submit — submit a CSAT rating (public-ish endpoint). */
supportRouter.post(
  '/csat/:id/submit',
  validate({ params: uuidParamSchema, body: submitCsatSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const id = param(req, 'id');
    const { rating, comment } = req.body as z.infer<typeof submitCsatSchema>;
    const survey = await repo.submitCsatRating(id, rating, comment);
    res.json({ data: survey });
  }),
);

/** GET /csat/stats — get overall CSAT statistics. */
supportRouter.get(
  '/csat/stats',
  requirePermission({ module: 'support', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const stats = await repo.getCsatStats(tenantId);
    res.json({ data: stats });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Live Chat ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** GET /chat/sessions — list active chat sessions. */
supportRouter.get(
  '/chat/sessions',
  requirePermission({ module: 'support', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { getActiveSessions } = await import('./chat.service.js');
    const sessions = await getActiveSessions(tenantId, actorId);
    res.json({ data: sessions });
  }),
);

/** POST /chat/sessions — create a new chat session (called by widget). */
supportRouter.post(
  '/chat/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req.user?.tid ?? req.body.tenantId) as string;
    const { createChatSession } = await import('./chat.service.js');
    const session = await createChatSession(tenantId, req.body);
    res.status(201).json({ data: session });
  }),
);

/** GET /chat/sessions/:id/messages — get session messages. */
supportRouter.get(
  '/chat/sessions/:id/messages',
  requirePermission({ module: 'support', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getSessionMessages } = await import('./chat.service.js');
    const messages = await getSessionMessages(tenantId, id);
    res.json({ data: messages });
  }),
);

/** POST /chat/sessions/:id/messages — send a message. */
supportRouter.post(
  '/chat/sessions/:id/messages',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { sendMessage } = await import('./chat.service.js');
    const message = await sendMessage(tenantId, id, req.body);
    res.status(201).json({ data: message });
  }),
);

/** POST /chat/sessions/:id/close — close a chat session. */
supportRouter.post(
  '/chat/sessions/:id/close',
  requirePermission({ module: 'support', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { closeSession } = await import('./chat.service.js');
    const session = await closeSession(tenantId, id, req.body.rating);
    res.json({ data: session });
  }),
);

/** GET /chat/metrics — get chat metrics. */
supportRouter.get(
  '/chat/metrics',
  requirePermission({ module: 'support', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { getChatMetrics } = await import('./chat.service.js');
    const metrics = await getChatMetrics(tenantId);
    res.json({ data: metrics });
  }),
);
