import { z } from 'zod';

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

// ── WorkCenter schemas ─────────────────────────────────────────────────────────

export const createWorkCenterSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  capacity: z.number().nonnegative().default(0),
  capacityUnit: z.string().min(1).max(50).default('hours'),
  costPerHour: z.number().nonnegative().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const listWorkCentersQuerySchema = paginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  search: z.string().optional(),
});

// ── BOM schemas ────────────────────────────────────────────────────────────────

export const bomLineSchema = z.object({
  componentProductId: z.string().uuid(),
  description: z.string().max(500).optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitCost: z.number().nonnegative().default(0),
});

export const createBOMSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(255),
  bomVersion: z.string().max(50).default('1.0'),
  isActive: z.boolean().default(true),
  lines: z.array(bomLineSchema).min(1),
});

export const updateBOMSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  bomVersion: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().positive(),
});

export const listBOMsQuerySchema = paginationSchema.extend({
  productId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().optional(),
});

// ── WorkOrder schemas ──────────────────────────────────────────────────────────

export const workOrderStatusSchema = z.enum([
  'DRAFT',
  'RELEASED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const createWorkOrderSchema = z.object({
  bomId: z.string().uuid(),
  productId: z.string().uuid(),
  plannedQuantity: z.number().positive(),
  plannedStartDate: z.coerce.string().optional(),
  plannedEndDate: z.coerce.string().optional(),
  notes: z.string().optional(),
});

export const updateWorkOrderSchema = z.object({
  plannedQuantity: z.number().positive().optional(),
  plannedStartDate: z.coerce.string().optional(),
  plannedEndDate: z.coerce.string().optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
});

export const listWorkOrdersQuerySchema = paginationSchema.extend({
  status: workOrderStatusSchema.optional(),
  productId: z.string().uuid().optional(),
  bomId: z.string().uuid().optional(),
});

// ── Material Consumption schemas ───────────────────────────────────────────────

export const recordMaterialConsumptionSchema = z.object({
  componentProductId: z.string().uuid(),
  plannedQty: z.number().nonnegative(),
  consumedQty: z.number().nonnegative(),
  unit: z.string().min(1).max(50),
});

// ── Production Output schemas ──────────────────────────────────────────────────

export const recordProductionOutputSchema = z.object({
  quantity: z.number().positive(),
  unit: z.string().min(1).max(50),
  lotNumber: z.string().max(100).optional(),
  warehouseLocationId: z.string().uuid().optional(),
});

// ── MRP schemas ────────────────────────────────────────────────────────────────

export const runMRPSchema = z.object({
  horizon: z.number().int().positive().default(30),
});

export const listMRPRunsQuerySchema = paginationSchema.extend({
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED']).optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateWorkCenterInput = z.infer<typeof createWorkCenterSchema>;

export type BOMLineInput = z.infer<typeof bomLineSchema>;
export type CreateBOMInput = z.infer<typeof createBOMSchema>;
export type UpdateBOMInput = z.infer<typeof updateBOMSchema>;
export type ListBOMsQuery = z.infer<typeof listBOMsQuerySchema>;

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;

export type RecordMaterialConsumptionInput = z.infer<typeof recordMaterialConsumptionSchema>;
export type RecordProductionOutputInput = z.infer<typeof recordProductionOutputSchema>;

export type RunMRPInput = z.infer<typeof runMRPSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
