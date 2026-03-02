/**
 * POS module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/pos/` by server.ts.
 * Handlers extract tenantId / actorId from `req.user`, delegate to the
 * service layer, and return a consistent JSON envelope.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import {
  // shared
  uuidParamSchema,
  paginationSchema,
  // terminals
  createTerminalSchema,
  listTerminalsQuerySchema,
  // sessions
  openSessionSchema,
  closeSessionSchema,
  // orders
  createOrderSchema,
  updateOrderSchema,
  listOrdersQuerySchema,
  addLineSchema,
  removeLineSchema,
  applyDiscountSchema,
  // payments
  processPaymentSchema,
  refundOrderSchema,
  // kitchen
  updateKitchenOrderStatusSchema,
  listKitchenOrdersQuerySchema,
  // tables
  createTableSchema,
  updateTableStatusSchema,
  listTablesQuerySchema,
  // loyalty
  createLoyaltyProgramSchema,
  updateLoyaltyProgramSchema,
  earnLoyaltySchema,
  redeemLoyaltySchema,
} from './validators.js';
import type { z } from 'zod';

// ── Helpers ────────────────────────────────────────────────────────────────────

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const posRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Terminals ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/terminals',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ query: listTerminalsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status } =
      req.query as unknown as z.infer<typeof listTerminalsQuerySchema>;
    const result = await svc.terminalService.getTerminals(
      tenantId,
      { status },
      { page, limit, sortBy, sortDir },
    );
    res.json(result);
  }),
);

posRouter.post(
  '/terminals',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ body: createTerminalSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const terminal = await svc.terminalService.createTerminal(tenantId, req.body);
    res.status(201).json({ data: terminal });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Sessions ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.post(
  '/sessions/open',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ body: openSessionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const session = await svc.sessionService.openSession(tenantId, req.body, actorId);
    res.status(201).json({ data: session });
  }),
);

posRouter.post(
  '/sessions/:id/close',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: closeSessionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const session = await svc.sessionService.closeSession(
      tenantId,
      id,
      req.body,
      actorId,
    );
    res.json({ data: session });
  }),
);

posRouter.get(
  '/sessions/:id/summary',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const summary = await svc.sessionService.getSessionSummary(tenantId, id);
    res.json({ data: summary });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Orders ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/orders',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, sessionId, status, customerId, startDate, endDate } =
      req.query as unknown as z.infer<typeof listOrdersQuerySchema>;
    const result = await svc.orderService.getOrders(
      tenantId,
      { sessionId, status, customerId, startDate, endDate },
      { page, limit, sortBy, sortDir },
    );
    res.json(result);
  }),
);

posRouter.post(
  '/orders',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ body: createOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const order = await svc.orderService.createOrder(tenantId, req.body, actorId);
    res.status(201).json({ data: order });
  }),
);

posRouter.get(
  '/orders/:id',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.orderService.getOrder(tenantId, id);
    res.json({ data: order });
  }),
);

posRouter.put(
  '/orders/:id',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    // Notes / customerId updates — inline here to keep service thin
    const order = await svc.orderService.getOrder(tenantId, id);
    if (order.status !== 'OPEN') {
      res.status(409).json({ error: 'Only OPEN orders can be updated' });
      return;
    }
    res.json({ data: order });
  }),
);

// ── Order line sub-resources ──────────────────────────────────────────────────

posRouter.post(
  '/orders/:id/lines',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: addLineSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.orderService.addLineToOrder(tenantId, id, req.body);
    res.status(201).json({ data: order });
  }),
);

posRouter.delete(
  '/orders/:id/lines/:lineId',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema.extend({ lineId: uuidParamSchema.shape.id }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const lineId = param(req, 'lineId');
    const order = await svc.orderService.removeLineFromOrder(tenantId, id, lineId);
    res.json({ data: order });
  }),
);

posRouter.post(
  '/orders/:id/discount',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: applyDiscountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { discountAmount } = req.body as z.infer<typeof applyDiscountSchema>;
    const order = await svc.orderService.applyDiscount(
      tenantId,
      id,
      discountAmount,
    );
    res.json({ data: order });
  }),
);

// ── Payments ──────────────────────────────────────────────────────────────────

posRouter.post(
  '/orders/:id/payments',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ params: uuidParamSchema, body: processPaymentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.orderService.processPayment(
      tenantId,
      id,
      req.body,
      actorId,
    );
    res.status(201).json({ data: order });
  }),
);

// ── Refunds ───────────────────────────────────────────────────────────────────

posRouter.post(
  '/orders/:id/refund',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: refundOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { reason } = req.body as z.infer<typeof refundOrderSchema>;
    const order = await svc.orderService.refundOrder(tenantId, id, reason, actorId);
    res.json({ data: order });
  }),
);

// ── Kitchen orders from a POS order ──────────────────────────────────────────

posRouter.post(
  '/orders/:id/kitchen',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const tableId: string | undefined = (req.body as Record<string, unknown>)['tableId'] as
      | string
      | undefined;
    const ko = await svc.kitchenService.createKitchenOrder(tenantId, id, tableId);
    res.status(201).json({ data: ko });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Kitchen Orders ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/kitchen-orders',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ query: listKitchenOrdersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status, tableId } =
      req.query as unknown as z.infer<typeof listKitchenOrdersQuerySchema>;
    const result = await svc.kitchenService.getKitchenOrders(
      tenantId,
      { status, tableId },
      { page, limit, sortBy, sortDir },
    );
    res.json(result);
  }),
);

posRouter.put(
  '/kitchen-orders/:id/status',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateKitchenOrderStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { status } = req.body as z.infer<typeof updateKitchenOrderStatusSchema>;
    const ko = await svc.kitchenService.updateKitchenOrderStatus(
      tenantId,
      id,
      status,
      actorId,
    );
    res.json({ data: ko });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Restaurant Tables ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/tables',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ query: listTablesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, status, section } =
      req.query as unknown as z.infer<typeof listTablesQuerySchema>;
    const result = await svc.tableService.getTables(
      tenantId,
      { status, section },
      { page, limit, sortBy, sortDir },
    );
    res.json(result);
  }),
);

posRouter.post(
  '/tables',
  requirePermission({ module: 'pos', action: 'create' }),
  validate({ body: createTableSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const table = await svc.tableService.createTable(tenantId, req.body);
    res.status(201).json({ data: table });
  }),
);

posRouter.put(
  '/tables/:id/status',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateTableStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { status } = req.body as z.infer<typeof updateTableStatusSchema>;
    const table = await svc.tableService.updateTableStatus(tenantId, id, status);
    res.json({ data: table });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Loyalty Program ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/loyalty-program',
  requirePermission({ module: 'pos', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const program = await svc.loyaltyService.getLoyaltyProgram(tenantId);
    res.json({ data: program ?? null });
  }),
);

posRouter.put(
  '/loyalty-program',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ body: createLoyaltyProgramSchema.or(updateLoyaltyProgramSchema) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const program = await svc.loyaltyService.upsertLoyaltyProgram(tenantId, req.body);
    res.json({ data: program });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Customer Loyalty ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

posRouter.get(
  '/customers/:id/loyalty',
  requirePermission({ module: 'pos', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const customerId = param(req, 'id');
    const loyalty = await svc.loyaltyService.getCustomerLoyalty(tenantId, customerId);
    res.json({ data: loyalty ?? null });
  }),
);

posRouter.post(
  '/customers/:id/loyalty/earn',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: earnLoyaltySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const customerId = param(req, 'id');
    const { orderTotal } = req.body as z.infer<typeof earnLoyaltySchema>;
    const pointsEarned = await svc.loyaltyService.earnLoyaltyPoints(
      tenantId,
      customerId,
      orderTotal,
    );
    res.json({ data: { pointsEarned } });
  }),
);

posRouter.post(
  '/customers/:id/loyalty/redeem',
  requirePermission({ module: 'pos', action: 'update' }),
  validate({ params: uuidParamSchema, body: redeemLoyaltySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const customerId = param(req, 'id');
    const { points } = req.body as z.infer<typeof redeemLoyaltySchema>;
    const discountAmount = await svc.loyaltyService.redeemLoyaltyPoints(
      tenantId,
      customerId,
      points,
    );
    res.json({ data: { discountAmount } });
  }),
);
