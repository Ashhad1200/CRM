/**
 * Inventory module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/inventory/` by server.ts.
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
  paginationSchema,
  createProductSchema,
  updateProductSchema,
  createWarehouseSchema,
  adjustStockSchema,
  reserveStockSchema,
  createSalesOrderSchema,
  createPurchaseOrderSchema,
  receiveGoodsSchema,
  createPriceBookSchema,
  createPriceBookEntrySchema,
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

const listProductsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  categoryId: z.string().uuid().optional(),
});

const listOrdersQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  dealId: z.string().uuid().optional(),
  search: z.string().optional(),
});

const listPOsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  vendorName: z.string().optional(),
  search: z.string().optional(),
});

const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().positive().optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const inventoryRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Products ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/products',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ query: listProductsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listProductsQuerySchema
    >;
    const result = await svc.getProducts(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

inventoryRouter.get(
  '/products/:id',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const product = await svc.getProduct(tenantId, id);
    res.json({ data: product });
  }),
);

inventoryRouter.post(
  '/products',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const product = await svc.createProduct(tenantId, req.body, actorId);
    res.status(201).json({ data: product });
  }),
);

inventoryRouter.put(
  '/products/:id',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const product = await svc.updateProduct(tenantId, id, { ...req.body, id }, actorId);
    res.json({ data: product });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Warehouses ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/warehouses',
  requirePermission({ module: 'inventory', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const data = await svc.getWarehouses(tenantId);
    res.json({ data });
  }),
);

inventoryRouter.post(
  '/warehouses',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createWarehouseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const warehouse = await svc.createWarehouse(tenantId, req.body, actorId);
    res.status(201).json({ data: warehouse });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Stock ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.post(
  '/stock/adjust',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ body: adjustStockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { productId, warehouseId, quantity, reason } = req.body;
    const result = await svc.adjustStock(tenantId, productId, warehouseId, quantity, reason, actorId);
    res.json({ data: result });
  }),
);

inventoryRouter.post(
  '/stock/reserve',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ body: reserveStockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { productId, warehouseId, quantity } = req.body;
    await svc.reserveStock(tenantId, productId, warehouseId, quantity);
    res.json({ data: { success: true } });
  }),
);

inventoryRouter.get(
  '/stock/low',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ query: lowStockQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { threshold } = req.query as unknown as z.infer<typeof lowStockQuerySchema>;
    const data = await svc.checkLowStock(tenantId, threshold);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Price Books ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/price-books',
  requirePermission({ module: 'inventory', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const data = await svc.getPriceBooks(tenantId);
    res.json({ data });
  }),
);

inventoryRouter.post(
  '/price-books',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createPriceBookSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const priceBook = await svc.createPriceBook(tenantId, req.body, actorId);
    res.status(201).json({ data: priceBook });
  }),
);

inventoryRouter.post(
  '/price-books/entries',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createPriceBookEntrySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const entry = await svc.createPriceBookEntry(tenantId, req.body, actorId);
    res.status(201).json({ data: entry });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Sales Orders ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/orders',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listOrdersQuerySchema
    >;
    const result = await svc.getSalesOrders(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

inventoryRouter.get(
  '/orders/:id',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.getSalesOrder(tenantId, id);
    res.json({ data: order });
  }),
);

inventoryRouter.post(
  '/orders',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createSalesOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const order = await svc.createSalesOrder(tenantId, req.body, actorId);
    res.status(201).json({ data: order });
  }),
);

inventoryRouter.post(
  '/orders/:id/fulfill',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.fulfillOrder(tenantId, id, actorId);
    res.json({ data: order });
  }),
);

inventoryRouter.post(
  '/orders/:id/cancel',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const order = await svc.cancelOrder(tenantId, id, actorId);
    res.json({ data: order });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Purchase Orders ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/purchase-orders',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ query: listPOsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listPOsQuerySchema
    >;
    const result = await svc.getPurchaseOrders(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

inventoryRouter.get(
  '/purchase-orders/:id',
  requirePermission({ module: 'inventory', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.getPurchaseOrder(tenantId, id);
    res.json({ data: po });
  }),
);

inventoryRouter.post(
  '/purchase-orders',
  requirePermission({ module: 'inventory', action: 'create' }),
  validate({ body: createPurchaseOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const po = await svc.createPurchaseOrder(tenantId, req.body, actorId);
    res.status(201).json({ data: po });
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/approve',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.approvePurchaseOrder(tenantId, id, actorId);
    res.json({ data: po });
  }),
);

inventoryRouter.post(
  '/purchase-orders/:id/receive',
  requirePermission({ module: 'inventory', action: 'update' }),
  validate({ params: uuidParamSchema, body: receiveGoodsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.receiveGoods(tenantId, id, req.body.lines, actorId);
    res.json({ data: po });
  }),
);
