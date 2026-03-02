/**
 * Warehouse / WMS module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/warehouse/` by server.ts.
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
  createWarehouseSchema,
  updateWarehouseSchema,
  createLocationSchema,
  updateLocationSchema,
  receiveStockSchema,
  moveStockSchema,
  adjustStockSchema,
  createPickListSchema,
  assignPickListSchema,
  completePickListSchema,
  createShipmentSchema,
  dispatchShipmentSchema,
  createCycleCountSchema,
  completeCycleCountSchema,
  listWarehousesQuerySchema,
  listStockLotsQuerySchema,
  stockLevelsQuerySchema,
  listPickListsQuerySchema,
  listShipmentsQuerySchema,
  listCycleCountsQuerySchema,
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

// ── Common param schemas ────────────────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().min(1),
});

const warehouseIdParamSchema = z.object({
  warehouseId: z.string().min(1),
});

const locationQuerySchema = paginationSchema.extend({
  type: z
    .enum(['RECEIVING', 'STORAGE', 'PICKING', 'SHIPPING', 'QUARANTINE'])
    .optional(),
  zone: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const warehouseRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Warehouses ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/warehouses',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: listWarehousesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listWarehousesQuerySchema
    >;
    const result = await svc.getWarehouses(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

warehouseRouter.post(
  '/warehouses',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: createWarehouseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const warehouse = await svc.createWarehouse(tenantId, req.body, actorId);
    res.status(201).json({ data: warehouse });
  }),
);

warehouseRouter.get(
  '/warehouses/:id',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const warehouse = await svc.getWarehouse(tenantId, id);
    res.json({ data: warehouse });
  }),
);

warehouseRouter.put(
  '/warehouses/:id',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateWarehouseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const warehouse = await svc.updateWarehouse(tenantId, id, { ...req.body, id });
    res.json({ data: warehouse });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Locations ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/warehouses/:warehouseId/locations',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ params: warehouseIdParamSchema, query: locationQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const warehouseId = param(req, 'warehouseId');
    const { page, limit, sortBy, sortDir, type, zone } = req.query as unknown as z.infer<
      typeof locationQuerySchema
    >;
    const result = await svc.getLocations(
      tenantId,
      warehouseId,
      { type, zone },
      { page, limit, sortBy, sortDir },
    );
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

warehouseRouter.post(
  '/warehouses/:warehouseId/locations',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ params: warehouseIdParamSchema, body: createLocationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const warehouseId = param(req, 'warehouseId');
    const location = await svc.createLocation(tenantId, warehouseId, req.body);
    res.status(201).json({ data: location });
  }),
);

warehouseRouter.put(
  '/warehouses/:warehouseId/locations/:id',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: warehouseIdParamSchema.extend({ id: z.string().min(1) }), body: updateLocationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const location = await svc.updateLocation(tenantId, id, { ...req.body, id });
    res.json({ data: location });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Stock Levels ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/stock-levels',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: stockLevelsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const filters = req.query as unknown as z.infer<typeof stockLevelsQuerySchema>;
    const data = await svc.getStockLevels(tenantId, filters);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Stock Lots ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/stock-lots',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: listStockLotsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listStockLotsQuerySchema
    >;
    const result = await svc.getStockLots(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Stock Moves ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.post(
  '/stock-moves/receive',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: receiveStockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const result = await svc.receiveStock(tenantId, req.body, actorId);
    res.status(201).json({ data: result });
  }),
);

warehouseRouter.post(
  '/stock-moves/move',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: moveStockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const result = await svc.moveStock(tenantId, req.body, actorId);
    res.status(201).json({ data: result });
  }),
);

warehouseRouter.post(
  '/stock-moves/adjust',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ body: adjustStockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const result = await svc.adjustStock(tenantId, req.body, actorId);
    res.json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Pick Lists ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/pick-lists',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: listPickListsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listPickListsQuerySchema
    >;
    const result = await svc.getPickLists(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

warehouseRouter.post(
  '/pick-lists',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: createPickListSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const pickList = await svc.createPickList(tenantId, req.body, actorId);
    res.status(201).json({ data: pickList });
  }),
);

warehouseRouter.get(
  '/pick-lists/:id',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const pickList = await svc.getPickList(tenantId, id);
    res.json({ data: pickList });
  }),
);

warehouseRouter.post(
  '/pick-lists/:id/assign',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: assignPickListSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const pickList = await svc.assignPickList(tenantId, id, req.body);
    res.json({ data: pickList });
  }),
);

warehouseRouter.post(
  '/pick-lists/:id/complete',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: completePickListSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const pickList = await svc.completePickList(tenantId, id, req.body, actorId);
    res.json({ data: pickList });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Shipments ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/shipments',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: listShipmentsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listShipmentsQuerySchema
    >;
    const result = await svc.getShipments(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

warehouseRouter.post(
  '/shipments',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: createShipmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const shipment = await svc.createShipment(tenantId, req.body, actorId);
    res.status(201).json({ data: shipment });
  }),
);

warehouseRouter.get(
  '/shipments/:id',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const shipment = await svc.getShipment(tenantId, id);
    res.json({ data: shipment });
  }),
);

warehouseRouter.put(
  '/shipments/:id',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: createShipmentSchema.partial() }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const shipment = await svc.updateShipment(tenantId, id, req.body);
    res.json({ data: shipment });
  }),
);

warehouseRouter.post(
  '/shipments/:id/dispatch',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: dispatchShipmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const shipment = await svc.dispatchShipment(tenantId, id, req.body, actorId);
    res.json({ data: shipment });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Cycle Counts ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/cycle-counts',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ query: listCycleCountsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listCycleCountsQuerySchema
    >;
    const result = await svc.getCycleCounts(tenantId, filters, { page, limit, sortBy, sortDir });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

warehouseRouter.post(
  '/cycle-counts',
  requirePermission({ module: 'warehouse', action: 'create' }),
  validate({ body: createCycleCountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const cycleCount = await svc.createCycleCount(tenantId, req.body, actorId);
    res.status(201).json({ data: cycleCount });
  }),
);

warehouseRouter.post(
  '/cycle-counts/:id/complete',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema, body: completeCycleCountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const cycleCount = await svc.completeCycleCount(tenantId, id, req.body, actorId);
    res.json({ data: cycleCount });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Pack Orders ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/pack-orders',
  requirePermission({ module: 'warehouse', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { warehouseId, status } = req.query as { warehouseId?: string; status?: string };
    const { getPackOrders } = await import('./pack/pack.service.js');
    const data = await getPackOrders(tenantId, warehouseId, status);
    res.json({ data });
  }),
);

warehouseRouter.get(
  '/pack-orders/:id',
  requirePermission({ module: 'warehouse', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getPackOrder } = await import('./pack/pack.service.js');
    const data = await getPackOrder(tenantId, id);
    res.json({ data });
  }),
);

warehouseRouter.post(
  '/pack-orders',
  requirePermission({ module: 'warehouse', action: 'create' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { createPackOrder } = await import('./pack/pack.service.js');
    const data = await createPackOrder(tenantId, req.body, actorId);
    res.status(201).json({ data });
  }),
);

warehouseRouter.post(
  '/pack-orders/:id/start',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { startPacking } = await import('./pack/pack.service.js');
    const data = await startPacking(tenantId, id, actorId);
    res.json({ data });
  }),
);

warehouseRouter.post(
  '/pack-orders/:id/complete',
  requirePermission({ module: 'warehouse', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { completePacking } = await import('./pack/pack.service.js');
    const data = await completePacking(tenantId, id, req.body);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Serial Numbers ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

warehouseRouter.get(
  '/serials',
  requirePermission({ module: 'warehouse', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { productId, warehouseId, status } = req.query as {
      productId?: string;
      warehouseId?: string;
      status?: string;
    };
    const { getSerials } = await import('./serial/serial.service.js');
    const data = await getSerials(tenantId, productId, warehouseId, status);
    res.json({ data });
  }),
);

warehouseRouter.get(
  '/serials/:serialNumber',
  requirePermission({ module: 'warehouse', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const serialNumber = param(req, 'serialNumber');
    const { getSerial } = await import('./serial/serial.service.js');
    const data = await getSerial(tenantId, serialNumber);
    res.json({ data });
  }),
);

warehouseRouter.post(
  '/serials',
  requirePermission({ module: 'warehouse', action: 'create' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { registerSerial } = await import('./serial/serial.service.js');
    const data = await registerSerial(tenantId, req.body);
    res.status(201).json({ data });
  }),
);

warehouseRouter.post(
  '/serials/:serialNumber/ship',
  requirePermission({ module: 'warehouse', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const serialNumber = param(req, 'serialNumber');
    const { shipSerial } = await import('./serial/serial.service.js');
    const data = await shipSerial(tenantId, serialNumber);
    res.json({ data });
  }),
);

warehouseRouter.post(
  '/serials/:serialNumber/quarantine',
  requirePermission({ module: 'warehouse', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const serialNumber = param(req, 'serialNumber');
    const { quarantineSerial } = await import('./serial/serial.service.js');
    const data = await quarantineSerial(tenantId, serialNumber);
    res.json({ data });
  }),
);
