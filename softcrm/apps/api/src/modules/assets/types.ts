/**
 * Asset Management module — shared TypeScript types.
 *
 * Mirrors the Prisma models defined in assets.prisma without importing
 * from @prisma/client directly, keeping this file runtime-dependency-free.
 */

/**
 * Prisma Decimal-compatible type.
 * At runtime values arrive as Prisma `Decimal` instances; this alias keeps the
 * types file independent of a direct `@prisma/client` import.
 */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Enum mirrors ───────────────────────────────────────────────────────────────

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

export type DisposalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

// ── Hydrated entity types ──────────────────────────────────────────────────────

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

export interface AssetDisposalRecord {
  id: string;
  tenantId: string;
  assetId: string;
  disposalDate: Date;
  disposalMethod: DisposalMethod;
  proceedsAmount: DecimalValue;
  gainLoss: DecimalValue;
  notes: string | null;
  journalEntryId: string | null;
  createdAt: Date;
  createdBy: string | null;
}

// ── Depreciation calculation types ────────────────────────────────────────────

/** One period row in a calculated depreciation schedule (not persisted yet). */
export interface DepreciationPeriod {
  periodStart: Date;
  periodEnd: Date;
  openingValue: number;
  depreciationCharge: number;
  closingValue: number;
}

// ── Report types ───────────────────────────────────────────────────────────────

/** Summary of the full fixed-asset register. */
export interface AssetRegister {
  totalAssets: number;
  totalCost: number;
  totalAccumulatedDepreciation: number;
  netBookValue: number;
  byStatus: Record<AssetStatus, number>;
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface AssetFilters {
  categoryId?: string;
  status?: AssetStatus;
}

export interface MaintenanceFilters {
  assetId?: string;
  status?: MaintenanceStatus;
}

export interface DisposalFilters {
  status?: DisposalStatus;
  method?: DisposalMethod;
  disposalDateFrom?: Date;
  disposalDateTo?: Date;
}
