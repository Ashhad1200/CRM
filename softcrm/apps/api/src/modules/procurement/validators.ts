import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums from procurement.prisma) ─────────────────

export const supplierStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'BLACKLISTED',
]);

export const purchaseRequisitionStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PO_CREATED',
]);

export const rfqStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'RESPONSES_RECEIVED',
  'CLOSED',
]);

export const procurementPOStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

export const goodsReceiptStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
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

// ── Supplier schemas ───────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100),
  contactName: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional(),
  address: z.record(z.unknown()).optional(),
  paymentTerms: z.string().max(255).optional(),
  currency: currencySchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  status: supplierStatusSchema.optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const addSupplierProductSchema = z.object({
  productId: z.string().uuid(),
  supplierSku: z.string().max(100).optional(),
  unitPrice: z.number().nonnegative(),
  minOrderQty: z.number().nonnegative(),
  leadTimeDays: z.number().int().nonnegative(),
  isPreferred: z.boolean().optional(),
});

export type AddSupplierProductInput = z.infer<typeof addSupplierProductSchema>;

// ── Purchase Requisition schemas ───────────────────────────────────────────────

export const createPurchaseRequisitionSchema = z.object({
  requestedBy: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      description: z.string().min(1).max(500),
      quantity: z.number().positive(),
      estimatedUnitPrice: z.number().nonnegative(),
      requiredByDate: z.coerce.date(),
    }),
  ).min(1),
});

export type CreatePurchaseRequisitionInput = z.infer<typeof createPurchaseRequisitionSchema>;

export const approveRejectRequisitionSchema = z.object({
  notes: z.string().optional(),
});

export type ApproveRejectRequisitionInput = z.infer<typeof approveRejectRequisitionSchema>;

// ── RFQ schemas ────────────────────────────────────────────────────────────────

export const createRFQSchema = z.object({
  requisitionId: z.string().uuid().optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
  supplierIds: z.array(z.string().uuid()).min(1),
});

export type CreateRFQInput = z.infer<typeof createRFQSchema>;

export const recordRFQResponseSchema = z.object({
  quotedPrice: z.number().nonnegative().optional(),
  quotedLeadTimeDays: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export type RecordRFQResponseInput = z.infer<typeof recordRFQResponseSchema>;

// ── Purchase Order schemas ─────────────────────────────────────────────────────

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  requisitionId: z.string().uuid().optional(),
  currency: currencySchema.optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      productId: z.string().uuid(),
      description: z.string().min(1).max(500),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().min(0).max(1).optional(),
    }),
  ).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

// ── Goods Receipt schemas ──────────────────────────────────────────────────────

export const createGoodsReceiptSchema = z.object({
  poId: z.string().uuid(),
  receivedAt: z.coerce.date().optional(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      poLineId: z.string().uuid(),
      productId: z.string().uuid(),
      receivedQty: z.number().positive(),
      lotNumber: z.string().max(100).optional(),
      notes: z.string().optional(),
    }),
  ).min(1),
});

export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
