import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums from assets.prisma) ──────────────────────

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

// ── Asset Category schemas ─────────────────────────────────────────────────────

export const createAssetCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  usefulLifeYears: z.number().int().positive(),
  salvageValuePercent: z.number().min(0).max(100).default(0),
  depreciationMethod: depreciationMethodSchema,
  glAccountId: z.string().uuid().optional(),
});

export const updateAssetCategorySchema = createAssetCategorySchema.partial();

// ── Fixed Asset schemas ────────────────────────────────────────────────────────

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
  status: assetStatusSchema.optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
});

// ── List assets query schema ───────────────────────────────────────────────────

export const listAssetsQuerySchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  status: assetStatusSchema.optional(),
});

// ── Depreciation schemas ───────────────────────────────────────────────────────

export const runDepreciationSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period must be in YYYY-MM format (e.g. 2026-02)'),
});

// ── Disposal schemas ───────────────────────────────────────────────────────────

export const disposeAssetSchema = z.object({
  disposalDate: z.coerce.string(),
  disposalMethod: disposalMethodSchema,
  proceedsAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const requestDisposalSchema = z.object({
  assetId: z.string().uuid(),
  disposalDate: z.coerce.string(),
  disposalMethod: disposalMethodSchema,
  proceedsAmount: z.number().nonnegative().default(0),
  disposalCosts: z.number().nonnegative().default(0),
  buyerName: z.string().max(200).optional(),
  buyerContact: z.string().max(200).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const approveDisposalSchema = z.object({
  approved: z.boolean(),
  comments: z.string().optional(),
});

export const completeDisposalSchema = z.object({
  journalEntryId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const disposalParamSchema = z.object({
  disposalId: z.string().uuid(),
});

// ── Maintenance schemas ────────────────────────────────────────────────────────

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

// ── V2: Transfer schemas ─────────────────────────────────────────────────────────

export const transferStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

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
  approved: z.boolean(),
  comments: z.string().optional(),
});

export const completeTransferSchema = z.object({
  notes: z.string().optional(),
});

export const cancelTransferSchema = z.object({
  reason: z.string().optional(),
});

export const listTransfersQuerySchema = paginationSchema.extend({
  status: transferStatusSchema.optional(),
  fromLocationId: z.string().max(100).optional(),
  toLocationId: z.string().max(100).optional(),
});

// ── V2: Audit schemas ─────────────────────────────────────────────────────────────

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

export const verifyAuditLineSchema = z.object({
  actualLocation: z.string().max(100).optional(),
  actualCondition: assetConditionSchema.optional(),
  isDiscrepancy: z.boolean().default(false),
  discrepancyType: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const bulkVerifyAuditLinesSchema = z.object({
  lines: z.array(
    z.object({
      lineId: z.string().uuid(),
      actualLocation: z.string().max(100).optional(),
      actualCondition: assetConditionSchema.optional(),
      isDiscrepancy: z.boolean().default(false),
      discrepancyType: z.string().max(50).optional(),
      notes: z.string().optional(),
    }),
  ),
});

export const listAuditsQuerySchema = paginationSchema.extend({
  status: auditStatusSchema.optional(),
  scope: auditScopeSchema.optional(),
  locationId: z.string().max(100).optional(),
});

// ── V2: Asset Image schemas ────────────────────────────────────────────────────

export const addAssetImageSchema = z.object({
  url: z.string().url(),
  filename: z.string().max(255).optional(),
  description: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const setImagePrimarySchema = z.object({
  isPrimary: z.boolean(),
});

// ── V2: Maintenance Schedule (Recurring) schemas ───────────────────────────────

export const maintenanceFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'ANNUAL',
]);

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

// ── V2: Write-off schema ─────────────────────────────────────────────────────────

export const writeOffAssetSchema = z.object({
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// ── V2: Maintenance Due Query schema ─────────────────────────────────────────────

export const maintenanceDueQuerySchema = z.object({
  daysAhead: z.coerce.number().int().positive().default(30),
  includeOverdue: z.coerce.boolean().default(true),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;

export type RunDepreciationInput = z.infer<typeof runDepreciationSchema>;
export type DisposeAssetInput = z.infer<typeof disposeAssetSchema>;
export type RequestDisposalInput = z.infer<typeof requestDisposalSchema>;
export type ApproveDisposalInput = z.infer<typeof approveDisposalSchema>;
export type CompleteDisposalInput = z.infer<typeof completeDisposalSchema>;

export type ScheduleMaintenanceInput = z.infer<typeof scheduleMaintenanceSchema>;
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type DisposalParam = z.infer<typeof disposalParamSchema>;

// ── V2: Transfer types ─────────────────────────────────────────────────────────

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ApproveTransferInput = z.infer<typeof approveTransferSchema>;
export type CompleteTransferInput = z.infer<typeof completeTransferSchema>;
export type CancelTransferInput = z.infer<typeof cancelTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;

// ── V2: Audit types ─────────────────────────────────────────────────────────────

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
export type VerifyAuditLineInput = z.infer<typeof verifyAuditLineSchema>;
export type BulkVerifyAuditLinesInput = z.infer<typeof bulkVerifyAuditLinesSchema>;
export type ListAuditsQuery = z.infer<typeof listAuditsQuerySchema>;

// ── V2: Image types ─────────────────────────────────────────────────────────────

export type AddAssetImageInput = z.infer<typeof addAssetImageSchema>;
export type SetImagePrimaryInput = z.infer<typeof setImagePrimarySchema>;

// ── V2: Maintenance Schedule types ──────────────────────────────────────────────

export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;
export type UpdateMaintenanceScheduleInput = z.infer<typeof updateMaintenanceScheduleSchema>;

// ── V2: Write-off & Maintenance Due types ───────────────────────────────────────

export type WriteOffAssetInput = z.infer<typeof writeOffAssetSchema>;
export type MaintenanceDueQuery = z.infer<typeof maintenanceDueQuerySchema>;
