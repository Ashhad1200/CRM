/**
 * POS module — Zod validation schemas.
 *
 * Mirrors the Prisma enums from pos.prisma.
 * All inferred types are exported for use by service and repository layers.
 */

import { z } from 'zod';

// ── Enum schemas ───────────────────────────────────────────────────────────────

export const posTerminalStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'CLOSED']);

export const posSessionStatusSchema = z.enum(['OPEN', 'CLOSED']);

export const posOrderStatusSchema = z.enum(['OPEN', 'PAID', 'REFUNDED', 'VOID']);

export const posPaymentMethodSchema = z.enum([
  'CASH',
  'CARD',
  'MOBILE',
  'LOYALTY_POINTS',
  'SPLIT',
]);

export const posPaymentStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);

export const restaurantTableStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'CLEANING',
]);

export const kitchenOrderStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'READY',
  'SERVED',
]);

export const kitchenOrderItemStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'DONE',
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

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Terminal schemas ───────────────────────────────────────────────────────────

export const createTerminalSchema = z.object({
  name: z.string().min(1).max(200),
  warehouseId: z.string().uuid().optional(),
  status: posTerminalStatusSchema.default('OFFLINE'),
});

export const listTerminalsQuerySchema = paginationSchema.extend({
  status: posTerminalStatusSchema.optional(),
});

// ── Session schemas ────────────────────────────────────────────────────────────

export const openSessionSchema = z.object({
  terminalId: z.string().uuid(),
  cashierId: z.string().uuid(),
  openingCash: z.number().nonnegative(),
});

export const closeSessionSchema = z.object({
  closingCash: z.number().nonnegative(),
});

// ── Order line schemas ─────────────────────────────────────────────────────────

export const orderLineSchema = z.object({
  productId: z.string().uuid(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(100).default(0),
  modifiers: z.array(z.unknown()).default([]),
});

export const addLineSchema = orderLineSchema;

export const removeLineSchema = z.object({
  lineId: z.string().uuid(),
});

export const applyDiscountSchema = z.object({
  discountAmount: z.number().nonnegative(),
});

// ── Order schemas ──────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  currency: currencySchema.default('USD'),
  notes: z.string().optional(),
  lines: z.array(orderLineSchema).min(1),
});

export const updateOrderSchema = z.object({
  notes: z.string().optional(),
  customerId: z.string().uuid().optional(),
  version: z.number().int().positive(),
});

export const listOrdersQuerySchema = paginationSchema.extend({
  sessionId: z.string().uuid().optional(),
  status: posOrderStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

// ── Payment schemas ────────────────────────────────────────────────────────────

export const processPaymentSchema = z.object({
  method: posPaymentMethodSchema,
  amount: z.number().positive(),
  reference: z.string().optional(),
});

// ── Refund schemas ─────────────────────────────────────────────────────────────

export const refundOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ── Kitchen schemas ────────────────────────────────────────────────────────────

export const updateKitchenOrderStatusSchema = z.object({
  status: kitchenOrderStatusSchema,
});

export const listKitchenOrdersQuerySchema = paginationSchema.extend({
  status: kitchenOrderStatusSchema.optional(),
  tableId: z.string().uuid().optional(),
});

// ── Table schemas ──────────────────────────────────────────────────────────────

export const createTableSchema = z.object({
  tableNumber: z.string().min(1).max(20),
  section: z.string().max(100).optional(),
  capacity: z.number().int().positive(),
  status: restaurantTableStatusSchema.default('AVAILABLE'),
});

export const updateTableStatusSchema = z.object({
  status: restaurantTableStatusSchema,
});

export const listTablesQuerySchema = paginationSchema.extend({
  status: restaurantTableStatusSchema.optional(),
  section: z.string().optional(),
});

// ── Loyalty schemas ────────────────────────────────────────────────────────────

export const updateLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  pointsPerCurrency: z.number().positive().optional(),
  pointsRedemptionRate: z.number().positive().optional(),
  minRedemption: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const createLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(200),
  pointsPerCurrency: z.number().positive(),
  pointsRedemptionRate: z.number().positive(),
  minRedemption: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

export const earnLoyaltySchema = z.object({
  orderTotal: z.number().positive(),
});

export const redeemLoyaltySchema = z.object({
  points: z.number().int().positive(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateTerminalInput = z.infer<typeof createTerminalSchema>;
export type ListTerminalsQuery = z.infer<typeof listTerminalsQuerySchema>;

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;

export type OrderLineInput = z.infer<typeof orderLineSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AddLineInput = z.infer<typeof addLineSchema>;
export type RemoveLineInput = z.infer<typeof removeLineSchema>;
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;

export type UpdateKitchenOrderStatusInput = z.infer<typeof updateKitchenOrderStatusSchema>;
export type ListKitchenOrdersQuery = z.infer<typeof listKitchenOrdersQuerySchema>;

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
export type ListTablesQuery = z.infer<typeof listTablesQuerySchema>;

export type CreateLoyaltyProgramInput = z.infer<typeof createLoyaltyProgramSchema>;
export type UpdateLoyaltyProgramInput = z.infer<typeof updateLoyaltyProgramSchema>;
export type EarnLoyaltyInput = z.infer<typeof earnLoyaltySchema>;
export type RedeemLoyaltyInput = z.infer<typeof redeemLoyaltySchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;

// Alias for backward compatibility with service imports
export type Pagination = PaginationInput;
