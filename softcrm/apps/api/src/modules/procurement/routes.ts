/**
 * Procurement module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/procurement/` by server.ts.
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
  createSupplierSchema,
  updateSupplierSchema,
  addSupplierProductSchema,
  createPurchaseRequisitionSchema,
  approveRejectRequisitionSchema,
  createRFQSchema,
  recordRFQResponseSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  createGoodsReceiptSchema,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ───────────────────────────────────────────────────────────────────
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

const listSuppliersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).optional(),
});

const listRequisitionsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  requestedBy: z.string().uuid().optional(),
});

const listRFQsQuerySchema = paginationSchema;

const listPOsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  search: z.string().optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const supplierIdParamSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const procurementRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Suppliers ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.get(
  '/suppliers',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ query: listSuppliersQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listSuppliersQuerySchema
    >;
    const result = await svc.listSuppliers(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

procurementRouter.post(
  '/suppliers',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ body: createSupplierSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const supplier = await svc.createSupplier(tenantId, req.body, actorId);
    res.status(201).json({ data: supplier });
  }),
);

procurementRouter.get(
  '/suppliers/:id',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const supplier = await svc.getSupplier(tenantId, id);
    res.json({ data: supplier });
  }),
);

procurementRouter.put(
  '/suppliers/:id',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateSupplierSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const supplier = await svc.updateSupplier(tenantId, id, { ...req.body, id }, actorId);
    res.json({ data: supplier });
  }),
);

procurementRouter.post(
  '/suppliers/:id/products',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ params: uuidParamSchema, body: addSupplierProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const product = await svc.addSupplierProduct(tenantId, id, req.body);
    res.status(201).json({ data: product });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Purchase Requisitions ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.get(
  '/purchase-requisitions',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ query: listRequisitionsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listRequisitionsQuerySchema
    >;
    const result = await svc.listPurchaseRequisitions(
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

procurementRouter.post(
  '/purchase-requisitions',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ body: createPurchaseRequisitionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const requisition = await svc.createPurchaseRequisition(tenantId, req.body, actorId);
    res.status(201).json({ data: requisition });
  }),
);

procurementRouter.get(
  '/purchase-requisitions/:id',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const requisition = await svc.getPurchaseRequisition(tenantId, id);
    res.json({ data: requisition });
  }),
);

procurementRouter.put(
  '/purchase-requisitions/:id',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const requisition = await svc.getPurchaseRequisition(tenantId, id);
    res.json({ data: requisition });
  }),
);

procurementRouter.post(
  '/purchase-requisitions/:id/submit',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const requisition = await svc.submitRequisition(tenantId, id, actorId);
    res.json({ data: requisition });
  }),
);

procurementRouter.post(
  '/purchase-requisitions/:id/approve',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema, body: approveRejectRequisitionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const requisition = await svc.approvePurchaseRequisition(tenantId, id, actorId, req.body);
    res.json({ data: requisition });
  }),
);

procurementRouter.post(
  '/purchase-requisitions/:id/reject',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema, body: approveRejectRequisitionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const requisition = await svc.rejectPurchaseRequisition(tenantId, id, actorId, req.body);
    res.json({ data: requisition });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── RFQs ──────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.get(
  '/rfqs',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ query: listRFQsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir } = req.query as unknown as z.infer<
      typeof listRFQsQuerySchema
    >;
    const result = await svc.listRFQs(tenantId, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

procurementRouter.post(
  '/rfqs',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ body: createRFQSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const rfq = await svc.createRFQ(tenantId, req.body, actorId);
    res.status(201).json({ data: rfq });
  }),
);

procurementRouter.get(
  '/rfqs/:id',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const rfq = await svc.getRFQ(tenantId, id);
    res.json({ data: rfq });
  }),
);

procurementRouter.put(
  '/rfqs/:id',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const rfq = await svc.getRFQ(tenantId, id);
    res.json({ data: rfq });
  }),
);

procurementRouter.post(
  '/rfqs/:id/send',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const rfq = await svc.sendRFQ(tenantId, id, actorId);
    res.json({ data: rfq });
  }),
);

procurementRouter.post(
  '/rfqs/:id/suppliers/:supplierId/response',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: supplierIdParamSchema, body: recordRFQResponseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const supplierId = param(req, 'supplierId');
    const result = await svc.recordRFQResponse(tenantId, id, supplierId, req.body, actorId);
    res.json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Purchase Orders ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.get(
  '/purchase-orders',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ query: listPOsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listPOsQuerySchema
    >;
    const result = await svc.listPurchaseOrders(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

procurementRouter.post(
  '/purchase-orders',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ body: createPurchaseOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const po = await svc.createPurchaseOrder(tenantId, req.body, actorId);
    res.status(201).json({ data: po });
  }),
);

procurementRouter.get(
  '/purchase-orders/:id',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.getPurchaseOrder(tenantId, id);
    res.json({ data: po });
  }),
);

procurementRouter.put(
  '/purchase-orders/:id',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema, body: updatePurchaseOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.getPurchaseOrder(tenantId, id);
    res.json({ data: po });
  }),
);

procurementRouter.post(
  '/purchase-orders/:id/confirm',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.confirmPurchaseOrder(tenantId, id, actorId);
    res.json({ data: po });
  }),
);

procurementRouter.post(
  '/purchase-orders/:id/cancel',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.cancelPurchaseOrder(tenantId, id, actorId);
    res.json({ data: po });
  }),
);

procurementRouter.get(
  '/purchase-orders/:id/lines',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const po = await svc.getPurchaseOrder(tenantId, id);
    res.json({ data: po.lines });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Goods Receipts ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.post(
  '/goods-receipts',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ body: createGoodsReceiptSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const receipt = await svc.createGoodsReceipt(tenantId, req.body, actorId);
    res.status(201).json({ data: receipt });
  }),
);

procurementRouter.get(
  '/goods-receipts/:id',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const receipt = await svc.getGoodsReceipt(tenantId, id);
    res.json({ data: receipt });
  }),
);

procurementRouter.post(
  '/goods-receipts/:id/confirm',
  requirePermission({ module: 'procurement', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const receipt = await svc.confirmGoodsReceipt(tenantId, id, actorId);
    res.json({ data: receipt });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Supplier Ratings ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

procurementRouter.get(
  '/suppliers/:id/ratings',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getSupplierRatings } = await import('./supplier-rating.service.js');
    const data = await getSupplierRatings(tenantId, id);
    res.json({ data });
  }),
);

procurementRouter.get(
  '/suppliers/:id/scorecard',
  requirePermission({ module: 'procurement', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getSupplierScorecard } = await import('./supplier-rating.service.js');
    const data = await getSupplierScorecard(tenantId, id);
    res.json({ data });
  }),
);

procurementRouter.post(
  '/suppliers/:id/rate',
  requirePermission({ module: 'procurement', action: 'create' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { rateSupplier } = await import('./supplier-rating.service.js');
    const data = await rateSupplier(tenantId, { ...req.body, supplierId: id }, actorId);
    res.status(201).json({ data });
  }),
);
