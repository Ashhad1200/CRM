/**
 * Asset Management module — shared TypeScript types (V2).
 *
 * Mirrors the Prisma models defined in assets.prisma without importing
 * from @prisma/client directly, keeping this file runtime-dependency-free.
 *
 * IMPORTANT: These types must align with the actual Prisma schema in assets.prisma
 */

/**
 * Prisma Decimal-compatible type.
 * At runtime values arrive as Prisma `Decimal` instances; this alias keeps the
 * types file independent of a direct `@prisma/client` import.
 */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ═══════════════════════════════════════════════════════════════════════════════
// ── Enum mirrors (MUST match assets.prisma exactly) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export type DepreciationMethod =
  | 'STRAIGHT_LINE'
  | 'DECLINING_BALANCE'
  | 'UNITS_OF_PRODUCTION';

export type AssetStatus =
  | 'ACTIVE'
  | 'DISPOSED'
  | 'UNDER_MAINTENANCE'
  | 'FULLY_DEPRECIATED';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';

export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type DisposalMethod = 'SOLD' | 'SCRAPPED' | 'DONATED' | 'WRITTEN_OFF';

export type AssignmentType = 'EMPLOYEE' | 'DEPARTMENT' | 'LOCATION';

export type MaintenanceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'ANNUAL';

export type DisposalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export type AuditStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AuditScope = 'FULL' | 'LOCATION' | 'CATEGORY' | 'DEPARTMENT';

export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Hydrated entity types (MUST match assets.prisma exactly) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetCategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  usefulLifeYears: number;
  salvageValuePercent: DecimalValue;
  depreciationMethod: DepreciationMethod;
  glAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FixedAssetRecord {
  id: string;
  tenantId: string;
  assetNumber: string;
  name: string;
  description: string | null;
  categoryId: string;
  serialNumber: string | null;
  purchaseDate: Date;
  purchasePrice: DecimalValue;
  currentBookValue: DecimalValue;
  salvageValue: DecimalValue;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  totalUnitsExpected: DecimalValue | null;
  totalUnitsProduced: DecimalValue;
  locationId: string | null;
  departmentId: string | null;
  assignedTo: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  purchaseInvoiceId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
}

export interface DepreciationScheduleRecord {
  id: string;
  assetId: string;
  periodStart: Date;
  periodEnd: Date;
  openingValue: DecimalValue;
  depreciationCharge: DecimalValue;
  closingValue: DecimalValue;
  isPosted: boolean;
  journalEntryId: string | null;
  createdAt: Date;
}

export interface AssetMaintenanceRecord {
  id: string;
  tenantId: string;
  assetId: string;
  type: MaintenanceType;
  scheduledDate: Date;
  completedDate: Date | null;
  cost: DecimalValue | null;
  vendor: string | null;
  description: string;
  status: MaintenanceStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface MaintenanceScheduleRecord {
  id: string;
  tenantId: string;
  assetId: string;
  name: string;
  description: string | null;
  maintenanceType: MaintenanceType;
  frequency: MaintenanceFrequency;
  startDate: Date;
  endDate: Date | null;
  lastScheduledDate: Date | null;
  nextScheduledDate: Date | null;
  estimatedCost: DecimalValue | null;
  vendor: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface AssetTransferRecord {
  id: string;
  tenantId: string;
  assetId: string;
  transferNumber: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  fromAssignedTo: string | null;
  toAssignedTo: string | null;
  transferDate: Date;
  effectiveDate: Date;
  reason: string | null;
  status: TransferStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface AssetAuditRecord {
  id: string;
  tenantId: string;
  auditNumber: string;
  name: string;
  description: string | null;
  scope: AuditScope;
  scopeFilter: Record<string, unknown> | null;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  status: AuditStatus;
  totalAssets: number;
  assetsVerified: number;
  assetsMissing: number;
  assetsFound: number;
  discrepancies: number;
  findings: string | null;
  recommendations: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  conductedBy: string | null;
}

export interface AssetAuditLineRecord {
  id: string;
  auditId: string;
  assetId: string;
  expectedLocation: string | null;
  actualLocation: string | null;
  expectedCondition: AssetCondition | null;
  actualCondition: AssetCondition | null;
  isVerified: boolean;
  isDiscrepancy: boolean;
  discrepancyType: string | null;
  notes: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
}

export interface AssetDisposalRecord {
  id: string;
  tenantId: string;
  assetId: string;
  disposalNumber: string;
  disposalDate: Date;
  disposalMethod: DisposalMethod;
  status: DisposalStatus;
  bookValueAtDisposal: DecimalValue;
  proceedsAmount: DecimalValue;
  disposalCosts: DecimalValue;
  gainLoss: DecimalValue;
  buyerName: string | null;
  buyerContact: string | null;
  invoiceId: string | null;
  reason: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  journalEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Depreciation calculation types ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** One period row in a calculated depreciation schedule (not persisted yet). */
export interface DepreciationPeriod {
  periodStart: Date;
  periodEnd: Date;
  openingValue: number;
  depreciationCharge: number;
  closingValue: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Report types ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Summary of the full fixed-asset register. */
export interface AssetRegister {
  totalAssets: number;
  totalCost: number;
  totalAccumulatedDepreciation: number;
  netBookValue: number;
  byStatus: Record<AssetStatus, number>;
  byCondition?: Record<AssetCondition, number>;
}

/** Summary for maintenance due report. */
export interface MaintenanceDueReport {
  totalDue: number;
  overdue: number;
  dueSoon: number;
  items: Array<{
    assetId: string;
    assetNumber: string;
    assetName: string;
    maintenanceType: MaintenanceType;
    scheduledDate: Date;
    isOverdue: boolean;
  }>;
}

/** Summary for audit report. */
export interface AuditSummaryReport {
  auditId: string;
  auditNumber: string;
  status: AuditStatus;
  totalAssets: number;
  assetsVerified: number;
  assetsMissing: number;
  assetsFound: number;
  discrepancies: number;
  verificationRate: number;
  discrepancyRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Filter types ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetFilters {
  categoryId?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  locationId?: string;
  departmentId?: string;
  assignedTo?: string;
}

export interface MaintenanceFilters {
  assetId?: string;
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
}

export interface TransferFilters {
  assetId?: string;
  status?: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
}

export interface AuditFilters {
  status?: AuditStatus;
  scope?: AuditScope;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
}

export interface DisposalFilters {
  status?: DisposalStatus;
  method?: DisposalMethod;
  disposalDateFrom?: Date;
  disposalDateTo?: Date;
}
