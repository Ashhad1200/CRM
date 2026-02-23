import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums from inventory.prisma) ───────────────────

export const taxClassSchema = z.enum([
  'STANDARD',
  'REDUCED',
  'ZERO',
  'EXEMPT',
]);

export const salesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'CANCELLED',
]);

export const purchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

export const stockAdjustmentReasonSchema = z.enum([
  'PURCHASE',
  'SALE',
  'RETURN',
  'DAMAGE',
  'CORRECTION',
  'RESERVED',
  'RELEASED',
]);

export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'BRL',
  'INR',
  'MXN',
]);

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

// ── Product schemas ────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  taxClass: taxClassSchema.optional(),
  categoryId: z.string().uuid().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ── Warehouse schemas ──────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.record(z.unknown()).optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

// ── Stock schemas ──────────────────────────────────────────────────────────────

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int(),
  reason: stockAdjustmentReasonSchema,
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const reserveStockSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type ReserveStockInput = z.infer<typeof reserveStockSchema>;

// ── Sales Order schemas ────────────────────────────────────────────────────────

export const createSalesOrderSchema = z.object({
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
    }),
  ).min(1),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;

// ── Purchase Order schemas ─────────────────────────────────────────────────────

export const createPurchaseOrderSchema = z.object({
  vendorName: z.string().min(1).max(255),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitCost: z.number().nonnegative(),
    }),
  ).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const receiveGoodsSchema = z.object({
  lines: z.array(
    z.object({
      lineId: z.string().uuid(),
      receivedQty: z.number().int().positive(),
    }),
  ).min(1),
});

export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;

// ── Price Book schemas ─────────────────────────────────────────────────────────

export const createPriceBookSchema = z.object({
  name: z.string().min(1).max(255),
  currency: currencySchema.optional(),
  isDefault: z.boolean().optional(),
  effectiveFrom: z.coerce.string().optional(),
  effectiveTo: z.coerce.string().optional(),
});

export type CreatePriceBookInput = z.infer<typeof createPriceBookSchema>;

export const createPriceBookEntrySchema = z.object({
  priceBookId: z.string().uuid(),
  productId: z.string().uuid(),
  price: z.number().nonnegative(),
});

export type CreatePriceBookEntryInput = z.infer<typeof createPriceBookEntrySchema>;
