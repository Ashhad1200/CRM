/**
 * Asset Management module — Zod validation schemas (V2).
 *
 * Provides input validation for all asset management operations including
 * categories, assets, depreciation, maintenance, transfers, audits, and disposals.
 *
 * IMPORTANT: These validators must align with the actual Prisma schema in assets.prisma
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Enum schemas (MUST mirror Prisma enums from assets.prisma exactly) ─────────
// ═══════════════════════════════════════════════════════════════════════════════

export const depreciationMethodSchema = z.enum([
  'STRAIGHT_LINE',
  'DECLINING_BALANCE',
  'UNITS_OF_PRODUCTION',
]);

export const assetStatusSchema = z.enum([
  'ACTIVE',
  'DISPOSED',
  'UNDER_MAINTENANCE',
  'FULLY_DEPRECIATED',
]);

export const maintenanceTypeSchema = z.enum([
  'PREVENTIVE',
  'CORRECTIVE',
  'INSPECTION',
]);

export const maintenanceStatusSchema = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const disposalMethodSchema = z.enum([
  'SOLD',
  'SCRAPPED',
  'DONATED',
  'WRITTEN_OFF',
]);

export const assignmentTypeSchema = z.enum([
  'EMPLOYEE',
  'DEPARTMENT',
  'LOCATION',
]);

export const maintenanceFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'ANNUAL',
]);

export const disposalStatusSchema = z.enum([
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

export const transferStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

export const auditStatusSchema = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const auditScopeSchema = z.enum([
  'FULL',
  'LOCATION',
  'CATEGORY',
  'DEPARTMENT',
]);

export const assetConditionSchema = z.enum([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Shared schemas ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const dateRangeSchema = z.object({
  from: z.coerce.string().optional(),
  to: z.coerce.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Category schemas ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const createAssetCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  usefulLifeYears: z.number().int().positive(),
  salvageValuePercent: z.number().min(0).max(100).default(0),
  depreciationMethod: depreciationMethodSchema,
  glAccountId: z.string().uuid().optional(),
});

export const updateAssetCategorySchema = createAssetCategorySchema.partial();

// ═══════════════════════════════════════════════════════════════════════════════
// ── Fixed Asset schemas ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  serialNumber: z.string().max(200).optional(),
  purchaseDate: z.coerce.string(),
  purchasePrice: z.number().positive(),
  salvageValue: z.number().nonnegative().optional(),
  usefulLifeYears: z.number().int().positive().optional(),
  depreciationMethod: depreciationMethodSchema.optional(),
  totalUnitsExpected: z.number().positive().optional(),
  locationId: z.string().max(100).optional(),
  departmentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  condition: assetConditionSchema.default('NEW'),
  purchaseInvoiceId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  serialNumber: z.string().max(200).optional(),
  locationId: z.string().max(100).optional(),
  departmentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  condition: assetConditionSchema.optional(),
  status: assetStatusSchema.optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── List assets query schema ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const listAssetsQuerySchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  status: assetStatusSchema.optional(),
  condition: assetConditionSchema.optional(),
  locationId: z.string().max(100).optional(),
  departmentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Depreciation schemas ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const runDepreciationSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period must be in YYYY-MM format (e.g. 2026-02)'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Disposal schemas ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const disposeAssetSchema = z.object({
  disposalDate: z.coerce.string(),
  disposalMethod: disposalMethodSchema,
  proceedsAmount: z.number().nonnegative().default(0),
  disposalCosts: z.number().nonnegative().default(0),
  buyerName: z.string().max(255).optional(),
  buyerContact: z.string().max(255).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const approveDisposalSchema = z.object({
  disposalId: z.string().uuid(),
  approved: z.boolean(),
  comments: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance schemas ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const scheduleMaintenanceSchema = z.object({
  type: maintenanceTypeSchema,
  scheduledDate: z.coerce.string(),
  description: z.string().min(1),
  vendor: z.string().max(255).optional(),
  cost: z.number().nonnegative().optional(),
});

export const completeMaintenanceSchema = z.object({
  completedDate: z.coerce.string(),
  cost: z.number().nonnegative().optional(),
  vendor: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const cancelMaintenanceSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance Schedule schemas ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const createMaintenanceScheduleSchema = z.object({
  assetId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  maintenanceType: maintenanceTypeSchema,
  frequency: maintenanceFrequencySchema,
  startDate: z.coerce.string(),
  endDate: z.coerce.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  vendor: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const updateMaintenanceScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  maintenanceType: maintenanceTypeSchema.optional(),
  frequency: maintenanceFrequencySchema.optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  vendor: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Transfer schemas ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const createTransferSchema = z.object({
  assetId: z.string().uuid(),
  toLocationId: z.string().max(100).optional(),
  toDepartmentId: z.string().uuid().optional(),
  toAssignedTo: z.string().uuid().optional(),
  transferDate: z.coerce.string(),
  effectiveDate: z.coerce.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const approveTransferSchema = z.object({
  transferId: z.string().uuid(),
  approved: z.boolean(),
  comments: z.string().optional(),
});

export const completeTransferSchema = z.object({
  transferId: z.string().uuid(),
  notes: z.string().optional(),
});

export const listTransfersQuerySchema = paginationSchema.extend({
  assetId: z.string().uuid().optional(),
  status: transferStatusSchema.optional(),
  fromLocationId: z.string().max(100).optional(),
  toLocationId: z.string().max(100).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Audit schemas ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const createAuditSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  scope: auditScopeSchema.default('FULL'),
  scopeFilter: z.record(z.unknown()).optional(),
  scheduledDate: z.coerce.string(),
});

export const updateAuditSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  scheduledDate: z.coerce.string().optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
});

export const startAuditSchema = z.object({
  auditId: z.string().uuid(),
});

export const completeAuditSchema = z.object({
  auditId: z.string().uuid(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
});

export const cancelAuditSchema = z.object({
  auditId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const listAuditsQuerySchema = paginationSchema.extend({
  status: auditStatusSchema.optional(),
  scope: auditScopeSchema.optional(),
  scheduledDateFrom: z.coerce.string().optional(),
  scheduledDateTo: z.coerce.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Audit Line schemas ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const verifyAuditLineSchema = z.object({
  auditLineId: z.string().uuid(),
  actualLocation: z.string().max(100).optional(),
  actualCondition: assetConditionSchema.optional(),
  isVerified: z.boolean(),
  discrepancyType: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const bulkVerifyAuditLinesSchema = z.object({
  auditId: z.string().uuid(),
  lines: z.array(
    z.object({
      auditLineId: z.string().uuid(),
      actualLocation: z.string().max(100).optional(),
      actualCondition: assetConditionSchema.optional(),
      isVerified: z.boolean(),
      discrepancyType: z.string().max(50).optional(),
      notes: z.string().optional(),
    }),
  ),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Report schemas ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const maintenanceDueReportSchema = z.object({
  daysAhead: z.coerce.number().int().positive().default(30),
  includeOverdue: z.boolean().default(true),
});

export const depreciationReportSchema = z.object({
  asOfDate: z.coerce.string().optional(),
  categoryId: z.string().uuid().optional(),
  includeFullyDepreciated: z.boolean().default(false),
});

export const assetRegisterReportSchema = z.object({
  asOfDate: z.coerce.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: assetStatusSchema.optional(),
  locationId: z.string().max(100).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Inferred types ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Category types
export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;

// Asset types
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;

// Depreciation types
export type RunDepreciationInput = z.infer<typeof runDepreciationSchema>;

// Disposal types
export type DisposeAssetInput = z.infer<typeof disposeAssetSchema>;
export type ApproveDisposalInput = z.infer<typeof approveDisposalSchema>;

// Maintenance types
export type ScheduleMaintenanceInput = z.infer<typeof scheduleMaintenanceSchema>;
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>;
export type CancelMaintenanceInput = z.infer<typeof cancelMaintenanceSchema>;

// Maintenance schedule types
export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;
export type UpdateMaintenanceScheduleInput = z.infer<typeof updateMaintenanceScheduleSchema>;

// Transfer types
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ApproveTransferInput = z.infer<typeof approveTransferSchema>;
export type CompleteTransferInput = z.infer<typeof completeTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;

// Audit types
export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
export type StartAuditInput = z.infer<typeof startAuditSchema>;
export type CompleteAuditInput = z.infer<typeof completeAuditSchema>;
export type CancelAuditInput = z.infer<typeof cancelAuditSchema>;
export type ListAuditsQuery = z.infer<typeof listAuditsQuerySchema>;

// Audit line types
export type VerifyAuditLineInput = z.infer<typeof verifyAuditLineSchema>;
export type BulkVerifyAuditLinesInput = z.infer<typeof bulkVerifyAuditLinesSchema>;

// Report types
export type MaintenanceDueReportInput = z.infer<typeof maintenanceDueReportSchema>;
export type DepreciationReportInput = z.infer<typeof depreciationReportSchema>;
export type AssetRegisterReportInput = z.infer<typeof assetRegisterReportSchema>;

// Shared types
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
