/**
 * Warehouse / WMS module — Zod validators.
 *
 * All schemas mirror the Prisma enums defined in warehouse.prisma.
 * Inferred TypeScript types are exported for use in the service layer.
 */

import { z } from 'zod';

// ── Enum schemas ───────────────────────────────────────────────────────────────

export const warehouseStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const locationTypeSchema = z.enum([
  'RECEIVING',
  'STORAGE',
  'PICKING',
  'SHIPPING',
  'QUARANTINE',
]);

export const stockLotStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'QUARANTINE',
  'EXPIRED',
]);

export const stockMoveTypeSchema = z.enum([
  'RECEIPT',
  'DELIVERY',
  'INTERNAL',
  'ADJUSTMENT',
  'RETURN',
]);

export const stockMoveStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'DONE',
  'CANCELLED',
]);

export const pickListStatusSchema = z.enum([
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const shipmentStatusSchema = z.enum([
  'PENDING',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
]);

export const cycleCountStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'COMPLETED',
]);

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

// ── Warehouse schemas ──────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  address: z.record(z.unknown()).optional().default({}),
  isDefault: z.boolean().optional().default(false),
  status: warehouseStatusSchema.optional().default('ACTIVE'),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// ── Location schemas ───────────────────────────────────────────────────────────

export const createLocationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  type: locationTypeSchema,
  zone: z.string().max(50).optional(),
  aisle: z.string().max(20).optional(),
  rack: z.string().max(20).optional(),
  bin: z.string().max(20).optional(),
  maxCapacity: z.number().positive().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string().min(1),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ── Stock receive schema ───────────────────────────────────────────────────────

export const receiveStockSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  productId: z.string().min(1),
  lotNumber: z.string().min(1).max(100),
  serialNumber: z.string().max(100).optional(),
  quantity: z.number().positive(),
  expiryDate: z.coerce.date().optional(),
  sourceDocument: z.string().max(100).optional(),
  scheduledDate: z.coerce.date().optional(),
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

// ── Stock move schema ──────────────────────────────────────────────────────────

export const moveStockSchema = z.object({
  warehouseId: z.string().min(1),
  lotId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  quantity: z.number().positive(),
  sourceDocument: z.string().max(100).optional(),
});

export type MoveStockInput = z.infer<typeof moveStockSchema>;

// ── Stock adjust schema ────────────────────────────────────────────────────────

export const adjustStockSchema = z.object({
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  lotId: z.string().min(1).optional(),
  quantityDelta: z.number(),
  reason: z.string().min(1).max(255),
  reference: z.string().max(100).optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

// ── Pick list schemas ──────────────────────────────────────────────────────────

export const createPickListSchema = z.object({
  warehouseId: z.string().min(1),
  sourceOrderId: z.string().min(1).optional(),
  sourceOrderType: z.enum(['SO', 'WO']).optional(),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      locationId: z.string().min(1),
      lotId: z.string().min(1).optional(),
      requestedQty: z.number().positive(),
    }),
  ).min(1),
});

export type CreatePickListInput = z.infer<typeof createPickListSchema>;

export const assignPickListSchema = z.object({
  assignedTo: z.string().min(1),
});

export type AssignPickListInput = z.infer<typeof assignPickListSchema>;

export const completePickListSchema = z.object({
  lines: z.array(
    z.object({
      lineId: z.string().min(1),
      pickedQty: z.number().nonnegative(),
    }),
  ).min(1),
});

export type CompletePickListInput = z.infer<typeof completePickListSchema>;

// ── Shipment schemas ───────────────────────────────────────────────────────────

export const createShipmentSchema = z.object({
  warehouseId: z.string().min(1),
  pickListId: z.string().min(1).optional(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  estimatedDelivery: z.coerce.date().optional(),
  recipientName: z.string().min(1).max(255),
  recipientAddress: z.record(z.unknown()).default({}),
  weight: z.number().positive().optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const dispatchShipmentSchema = z.object({
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  shippedAt: z.coerce.date().optional(),
});

export type DispatchShipmentInput = z.infer<typeof dispatchShipmentSchema>;

// ── Cycle count schemas ────────────────────────────────────────────────────────

export const createCycleCountSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  countedBy: z.string().min(1),
});

export type CreateCycleCountInput = z.infer<typeof createCycleCountSchema>;

export const completeCycleCountSchema = z.object({
  counts: z.array(
    z.object({
      productId: z.string().min(1),
      lotId: z.string().min(1).optional(),
      countedQty: z.number().nonnegative(),
    }),
  ).min(1),
});

export type CompleteCycleCountInput = z.infer<typeof completeCycleCountSchema>;

// ── Query filter schemas ───────────────────────────────────────────────────────

export const listWarehousesQuerySchema = paginationSchema.extend({
  status: warehouseStatusSchema.optional(),
  search: z.string().optional(),
});

export const listStockLotsQuerySchema = paginationSchema.extend({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  status: stockLotStatusSchema.optional(),
});

export const stockLevelsQuerySchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
});

export const listPickListsQuerySchema = paginationSchema.extend({
  status: pickListStatusSchema.optional(),
  warehouseId: z.string().optional(),
});

export const listShipmentsQuerySchema = paginationSchema.extend({
  status: shipmentStatusSchema.optional(),
  warehouseId: z.string().optional(),
});

export const listCycleCountsQuerySchema = paginationSchema.extend({
  status: cycleCountStatusSchema.optional(),
  warehouseId: z.string().optional(),
});
