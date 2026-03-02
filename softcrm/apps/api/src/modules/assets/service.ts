/**
 * Asset Management module — orchestrator service.
 *
 * Handles business logic for fixed assets including:
 * - Asset category management
 * - Asset CRUD with auto-generated asset numbers
 * - Depreciation schedule generation and monthly depreciation runs
 * - Maintenance scheduling and completion
 * - Asset disposal with gain/loss calculation
 * - Asset register reporting
 */

import * as repo from './repository.js';
// V2 imports disabled until schema alignment is complete
// import * as repoV2 from './repository-v2.js';
import * as events from './events.js';
// import * as eventsV2 from './events-v2.js';
import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

import type {
  AssetFilters,
  DepreciationPeriod,
  AssetRegister,
  AssetStatus,
  DisposalFilters,
} from './types.js';
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateAssetInput,
  UpdateAssetInput,
  DisposeAssetInput,
  ScheduleMaintenanceInput,
  CompleteMaintenanceInput,
  PaginationInput,
  RequestDisposalInput,
  ApproveDisposalInput,
  CompleteDisposalInput,
  CreateTransferInput,
  ApproveTransferInput,
  CompleteTransferInput,
  CancelTransferInput,
  ListTransfersQuery,
  CreateAuditInput,
  UpdateAuditInput,
  VerifyAuditLineInput,
  BulkVerifyAuditLinesInput,
  ListAuditsQuery,
  AddAssetImageInput,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  WriteOffAssetInput,
  MaintenanceDueQuery,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Categories ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAssetCategory(
  tenantId: string,
  data: CreateAssetCategoryInput,
) {
  return repo.createAssetCategory(tenantId, data);
}

export async function updateAssetCategory(
  tenantId: string,
  id: string,
  data: UpdateAssetCategoryInput,
) {
  return repo.updateAssetCategory(tenantId, id, data);
}

export async function listAssetCategories(tenantId: string) {
  return repo.findAssetCategories(tenantId);
}

export async function getAssetCategory(tenantId: string, id: string) {
  return repo.findAssetCategory(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Fixed Assets ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAsset(
  tenantId: string,
  data: CreateAssetInput,
  actorId: string,
) {
  // Fetch category to inherit defaults
  const category = await repo.findAssetCategory(tenantId, data.categoryId);

  const assetNumber = await repo.generateNextAssetNumber(tenantId);

  const asset = await repo.createAsset(tenantId, data, assetNumber, actorId, {
    usefulLifeYears: category.usefulLifeYears,
    salvageValuePercent: Number(category.salvageValuePercent),
    depreciationMethod: category.depreciationMethod as string,
  });

  await events.publishAssetCreated(tenantId, actorId, {
    id: asset.id,
    assetNumber: asset.assetNumber,
    name: asset.name,
    categoryId: asset.categoryId,
    purchasePrice: Number(asset.purchasePrice),
  });

  return asset;
}

export async function updateAsset(
  tenantId: string,
  id: string,
  data: UpdateAssetInput,
) {
  return repo.updateAsset(tenantId, id, data);
}

export async function getAsset(tenantId: string, id: string) {
  return repo.findAsset(tenantId, id);
}

export async function listAssets(
  tenantId: string,
  filters: AssetFilters,
  pagination: PaginationInput,
) {
  const { page, limit } = pagination;
  const result = await repo.findAssets(tenantId, filters, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Depreciation Schedule ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the full depreciation schedule for the life of an asset.
 *
 * - STRAIGHT_LINE: charge = (purchasePrice - salvageValue) / usefulLifeYears / 12 per month
 * - DECLINING_BALANCE: charge = currentBookValue * (2 / usefulLifeYears) / 12 per month
 *   (double-declining; book value never goes below salvage value)
 * - UNITS_OF_PRODUCTION: charge = (purchasePrice - salvageValue) / totalUnitsExpected * unitsThisPeriod
 *   (for UoP, a placeholder of 0-units months is generated; real charges apply as units are logged)
 */
export function calculateDepreciationSchedule(asset: {
  purchaseDate: Date;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  totalUnitsExpected: number | null;
}): DepreciationPeriod[] {
  const {
    purchaseDate,
    purchasePrice,
    salvageValue,
    usefulLifeYears,
    depreciationMethod,
    totalUnitsExpected,
  } = asset;

  const totalMonths = usefulLifeYears * 12;
  const depreciableAmount = Math.max(0, purchasePrice - salvageValue);
  const periods: DepreciationPeriod[] = [];

  let currentBookValue = purchasePrice;
  const startYear = purchaseDate.getFullYear();
  const startMonth = purchaseDate.getMonth(); // 0-indexed

  for (let i = 0; i < totalMonths; i++) {
    const year = startYear + Math.floor((startMonth + i) / 12);
    const month = (startMonth + i) % 12;

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0); // last day of month

    const openingValue = currentBookValue;
    let depreciationCharge = 0;

    switch (depreciationMethod) {
      case 'STRAIGHT_LINE': {
        depreciationCharge = depreciableAmount / totalMonths;
        break;
      }

      case 'DECLINING_BALANCE': {
        // Double-declining balance: 2/usefulLifeYears per year, monthly
        const annualRate = 2 / usefulLifeYears;
        depreciationCharge = currentBookValue * (annualRate / 12);
        // Book value must not go below salvage value
        if (currentBookValue - depreciationCharge < salvageValue) {
          depreciationCharge = Math.max(0, currentBookValue - salvageValue);
        }
        break;
      }

      case 'UNITS_OF_PRODUCTION': {
        // Placeholder: 0 units assumed per period; caller updates when units are known
        const ratePerUnit = totalUnitsExpected && totalUnitsExpected > 0
          ? depreciableAmount / totalUnitsExpected
          : 0;
        depreciationCharge = ratePerUnit * 0; // 0 units this period by default
        break;
      }

      default:
        throw new ValidationError(`Unknown depreciation method: ${depreciationMethod}`);
    }

    // Round to 2 decimal places
    depreciationCharge = Math.round(depreciationCharge * 100) / 100;
    const closingValue = Math.round(
      Math.max(salvageValue, currentBookValue - depreciationCharge) * 100,
    ) / 100;

    periods.push({
      periodStart,
      periodEnd,
      openingValue: Math.round(openingValue * 100) / 100,
      depreciationCharge,
      closingValue,
    });

    currentBookValue = closingValue;

    // If book value has reached salvage value, remaining periods have zero charge
    if (currentBookValue <= salvageValue) {
      // Fill remaining periods with zero depreciation
      for (let j = i + 1; j < totalMonths; j++) {
        const fy = startYear + Math.floor((startMonth + j) / 12);
        const fm = (startMonth + j) % 12;
        periods.push({
          periodStart: new Date(fy, fm, 1),
          periodEnd: new Date(fy, fm + 1, 0),
          openingValue: salvageValue,
          depreciationCharge: 0,
          closingValue: salvageValue,
        });
      }
      break;
    }
  }

  return periods;
}

/**
 * Persist the full depreciation schedule for an asset.
 * Replaces any existing unposted schedule entries.
 */
export async function generateDepreciationSchedule(tenantId: string, assetId: string) {
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Cannot generate depreciation schedule for a disposed asset');
  }

  const periods = calculateDepreciationSchedule({
    purchaseDate: asset.purchaseDate,
    purchasePrice: Number(asset.purchasePrice),
    salvageValue: Number(asset.salvageValue),
    usefulLifeYears: asset.usefulLifeYears,
    depreciationMethod: asset.depreciationMethod as string,
    totalUnitsExpected: asset.totalUnitsExpected ? Number(asset.totalUnitsExpected) : null,
  });

  return repo.upsertDepreciationSchedule(assetId, periods);
}

export async function getDepreciationSchedule(tenantId: string, assetId: string) {
  // Verify asset belongs to tenant
  await repo.findAsset(tenantId, assetId);
  return repo.findDepreciationSchedule(assetId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Monthly Depreciation Run ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run monthly depreciation for all assets of a tenant for a given period.
 *
 * Period format: "YYYY-MM" e.g. "2026-02"
 *
 * For each unposted depreciation schedule entry falling within the period:
 * 1. Mark the entry as posted
 * 2. Update the asset's currentBookValue
 * 3. If book value reaches salvage value, mark asset as FULLY_DEPRECIATED
 * 4. Emit ASSET_DEPRECIATED event (which triggers accounting journal entry via listener)
 *
 * Returns a summary of processed entries.
 */
export async function runMonthlyDepreciation(
  tenantId: string,
  period: string, // "YYYY-MM"
  actorId: string,
): Promise<{
  processed: number;
  totalDepreciationCharge: number;
  assetsSummary: Array<{ assetId: string; assetNumber: string; charge: number; newBookValue: number }>;
}> {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // 0-indexed

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    throw new ValidationError(`Invalid period format: ${period}. Expected YYYY-MM`);
  }

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 0); // last day of month

  const unposted = await repo.findUnpostedDepreciationForPeriod(
    tenantId,
    periodStart,
    periodEnd,
  );

  let processed = 0;
  let totalDepreciationCharge = 0;
  const assetsSummary: Array<{
    assetId: string;
    assetNumber: string;
    charge: number;
    newBookValue: number;
  }> = [];

  for (const entry of unposted) {
    const charge = Number(entry.depreciationCharge);
    const closingValue = Number(entry.closingValue);

    // Mark depreciation entry as posted
    await repo.markDepreciationPosted(entry.id);

    // Determine new asset status
    const assetSalvage = Number(entry.asset.salvageValue);
    const newStatus: AssetStatus | undefined =
      closingValue <= assetSalvage ? 'FULLY_DEPRECIATED' : undefined;

    // Update asset book value
    await repo.updateAssetBookValue(entry.assetId, closingValue, newStatus);

    // Emit event (triggers accounting journal entry via event listener)
    await events.publishAssetDepreciated(tenantId, actorId, {
      assetId: entry.assetId,
      assetNumber: entry.asset.assetNumber,
      period,
      depreciationCharge: charge,
      newBookValue: closingValue,
    });

    processed++;
    totalDepreciationCharge += charge;
    assetsSummary.push({
      assetId: entry.assetId,
      assetNumber: entry.asset.assetNumber,
      charge,
      newBookValue: closingValue,
    });
  }

  return {
    processed,
    totalDepreciationCharge: Math.round(totalDepreciationCharge * 100) / 100,
    assetsSummary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Maintenance ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function scheduleAssetMaintenance(
  tenantId: string,
  assetId: string,
  data: ScheduleMaintenanceInput,
  actorId: string,
) {
  // Verify asset exists and belongs to tenant
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Cannot schedule maintenance for a disposed asset');
  }

  const record = await repo.createMaintenanceRecord(tenantId, assetId, data, actorId);

  await events.publishMaintenanceScheduled(tenantId, actorId, {
    id: record.id,
    assetId: record.assetId,
    type: record.type as string,
    scheduledDate: record.scheduledDate.toISOString(),
  });

  return record;
}

export async function completeMaintenance(
  tenantId: string,
  maintenanceId: string,
  data: CompleteMaintenanceInput,
) {
  return repo.completeMaintenanceRecord(tenantId, maintenanceId, data);
}

export async function listMaintenanceSchedule(
  tenantId: string,
  assetId: string,
  pagination: PaginationInput,
) {
  // Verify asset belongs to tenant
  await repo.findAsset(tenantId, assetId);

  const { page, limit } = pagination;
  const result = await repo.findMaintenanceRecords(tenantId, assetId, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Disposal ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dispose of an asset.
 *
 * Calculates gain/loss = proceedsAmount - currentBookValue
 * Creates disposal record, updates asset status to DISPOSED,
 * and emits ASSET_DISPOSED event (which triggers accounting journal entry).
 */
export async function disposeAsset(
  tenantId: string,
  assetId: string,
  data: DisposeAssetInput,
  actorId: string,
) {
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Asset is already disposed');
  }

  const currentBookValue = Number(asset.currentBookValue);
  const proceedsAmount = data.proceedsAmount;

  // Gain = positive when proceeds > book value; Loss = negative
  const gainLoss = Math.round((proceedsAmount - currentBookValue) * 100) / 100;

  const disposal = await repo.createAssetDisposal(
    tenantId,
    assetId,
    data,
    gainLoss,
    actorId,
  );

  await events.publishAssetDisposed(tenantId, actorId, {
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    disposalDate: new Date(data.disposalDate).toISOString(),
    disposalMethod: data.disposalMethod,
    proceedsAmount,
    gainLoss,
  });

  return { disposal, gainLoss };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Register ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Return a summary of the complete fixed-asset register for a tenant.
 *
 * Includes: total cost, total accumulated depreciation, net book value,
 * and a count breakdown by asset status.
 */
export async function getAssetRegister(tenantId: string): Promise<AssetRegister> {
  const assets = await repo.getAssetRegisterSummary(tenantId);

  let totalCost = 0;
  let totalNetBookValue = 0;
  const byStatus: Record<string, number> = {
    ACTIVE: 0,
    DISPOSED: 0,
    UNDER_MAINTENANCE: 0,
    FULLY_DEPRECIATED: 0,
  };

  for (const asset of assets) {
    const purchasePrice = Number(asset.purchasePrice);
    const bookValue = Number(asset.currentBookValue);

    totalCost += purchasePrice;
    totalNetBookValue += bookValue;

    const statusKey = asset.status as string;
    if (statusKey in byStatus) {
      byStatus[statusKey] = (byStatus[statusKey] ?? 0) + 1;
    }
  }

  const totalAccumulatedDepreciation = Math.round((totalCost - totalNetBookValue) * 100) / 100;

  return {
    totalAssets: assets.length,
    totalCost: Math.round(totalCost * 100) / 100,
    totalAccumulatedDepreciation,
    netBookValue: Math.round(totalNetBookValue * 100) / 100,
    byStatus: byStatus as Record<AssetStatus, number>,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2 Enhanced Disposal Functions (Stubs - V2 schema alignment pending) ──────
// ═══════════════════════════════════════════════════════════════════════════════

const V2_NOT_IMPL = 'V2 feature not available - schema alignment pending';

/**
 * List all disposals for a tenant with filtering and pagination.
 */
export async function listDisposals(
  _tenantId: string,
  pagination: PaginationInput,
): Promise<{ data: never[]; meta: { total: number; page: number; limit: number } }> {
  const { page, limit } = pagination;
  return { data: [], meta: { total: 0, page, limit } };
}

/**
 * Get a single disposal by ID.
 */
export async function getDisposal(_tenantId: string, _disposalId: string): Promise<never> {
  throw new NotFoundError(V2_NOT_IMPL);
}

/**
 * Request disposal of an asset (V2 with approval workflow).
 */
export async function requestDisposal(
  _tenantId: string,
  _data: RequestDisposalInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

/**
 * Approve or reject a disposal request.
 */
export async function approveDisposal(
  _tenantId: string,
  _disposalId: string,
  _data: ApproveDisposalInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

/**
 * Complete an approved disposal.
 */
export async function completeDisposal(
  _tenantId: string,
  _disposalId: string,
  _data: CompleteDisposalInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Delete Asset Category ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteAssetCategory(tenantId: string, id: string) {
  // Verify category exists and belongs to tenant
  await repo.findAssetCategory(tenantId, id);
  return repo.deleteAssetCategory(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Asset Transfers (Stubs) ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function listTransfers(
  _tenantId: string,
  query: ListTransfersQuery,
): Promise<{ data: never[]; meta: { total: number; page: number; limit: number } }> {
  const { page, limit } = query;
  return { data: [], meta: { total: 0, page, limit } };
}

export async function createTransfer(
  _tenantId: string,
  _data: CreateTransferInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function getTransfer(_tenantId: string, _transferId: string): Promise<never> {
  throw new NotFoundError(V2_NOT_IMPL);
}

export async function approveTransfer(
  _tenantId: string,
  _transferId: string,
  _data: ApproveTransferInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function completeTransfer(
  _tenantId: string,
  _transferId: string,
  _data: CompleteTransferInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function cancelTransfer(
  _tenantId: string,
  _transferId: string,
  _data: CancelTransferInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Asset Audits (Stubs) ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function listAudits(
  _tenantId: string,
  query: ListAuditsQuery,
): Promise<{ data: never[]; meta: { total: number; page: number; limit: number } }> {
  const { page, limit } = query;
  return { data: [], meta: { total: 0, page, limit } };
}

export async function createAudit(
  _tenantId: string,
  _data: CreateAuditInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function getAudit(_tenantId: string, _auditId: string): Promise<never> {
  throw new NotFoundError(V2_NOT_IMPL);
}

export async function updateAudit(
  _tenantId: string,
  _auditId: string,
  _data: UpdateAuditInput,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function startAudit(
  _tenantId: string,
  _auditId: string,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function completeAudit(
  _tenantId: string,
  _auditId: string,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function cancelAudit(
  _tenantId: string,
  _auditId: string,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function getAuditSummary(
  _tenantId: string,
  _auditId: string,
): Promise<{ totalAssets: number; verified: number; missing: number; discrepancies: number }> {
  return { totalAssets: 0, verified: 0, missing: 0, discrepancies: 0 };
}

export async function listAuditLines(
  _tenantId: string,
  _auditId: string,
  pagination: PaginationInput,
): Promise<{ data: never[]; meta: { total: number; page: number; limit: number } }> {
  const { page, limit } = pagination;
  return { data: [], meta: { total: 0, page, limit } };
}

export async function verifyAuditLine(
  _tenantId: string,
  _auditId: string,
  _lineId: string,
  _data: VerifyAuditLineInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function bulkVerifyAuditLines(
  _tenantId: string,
  _auditId: string,
  _data: BulkVerifyAuditLinesInput,
  _actorId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Maintenance Schedules (Stubs) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List maintenance schedules.
 * If assetId is provided, filters by that asset (with validation).
 * If no arguments beyond tenantId, returns all schedules for the tenant.
 */
export async function listMaintenanceSchedules(
  _tenantId: string,
  assetId?: string,
  pagination?: PaginationInput,
): Promise<never[] | { data: never[]; meta: { total: number; page: number; limit: number } }> {
  // V2 not implemented - return empty
  if (pagination) {
    const { page, limit } = pagination;
    return { data: [], meta: { total: 0, page, limit } };
  }
  // Called without pagination from global endpoint
  return [];
}

export async function createMaintenanceSchedule(
  tenantId: string,
  data: CreateMaintenanceScheduleInput,
  _actorId: string,
): Promise<never> {
  await repo.findAsset(tenantId, data.assetId);
  throw new ValidationError(V2_NOT_IMPL);
}

export async function getMaintenanceSchedule(
  _tenantId: string,
  _scheduleId: string,
): Promise<never> {
  throw new NotFoundError(V2_NOT_IMPL);
}

export async function updateMaintenanceSchedule(
  _tenantId: string,
  _scheduleId: string,
  _data: UpdateMaintenanceScheduleInput,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

export async function deleteMaintenanceSchedule(
  _tenantId: string,
  _scheduleId: string,
): Promise<never> {
  throw new ValidationError(V2_NOT_IMPL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Asset Images (Stubs) ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function listAssetImages(tenantId: string, assetId: string) {
  await repo.findAsset(tenantId, assetId);
  // AssetImage model not in schema - return empty array
  return { data: [], meta: { total: 0 } };
}

export async function addAssetImage(
  tenantId: string,
  assetId: string,
  _data: AddAssetImageInput,
  _actorId: string,
) {
  await repo.findAsset(tenantId, assetId);
  // AssetImage model not in schema - throw not implemented
  throw new ValidationError('Asset images feature is not available');
}

export async function deleteAssetImage(
  tenantId: string,
  assetId: string,
  _imageId: string,
) {
  await repo.findAsset(tenantId, assetId);
  throw new ValidationError('Asset images feature is not available');
}

export async function setAssetImagePrimary(
  tenantId: string,
  assetId: string,
  _imageId: string,
  _isPrimary: boolean,
) {
  await repo.findAsset(tenantId, assetId);
  throw new ValidationError('Asset images feature is not available');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Asset Write-Off (Stub) ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function writeOffAsset(
  tenantId: string,
  assetId: string,
  _data: WriteOffAssetInput,
  _actorId: string,
): Promise<never> {
  await repo.findAsset(tenantId, assetId);
  throw new ValidationError(V2_NOT_IMPL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── V2: Maintenance Due Report (Stub) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMaintenanceDueReport(
  _tenantId: string,
  _query: MaintenanceDueQuery,
): Promise<{ data: never[]; meta: { total: number } }> {
  return { data: [], meta: { total: 0 } };
}
