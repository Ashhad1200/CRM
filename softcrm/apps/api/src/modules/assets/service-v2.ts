/**
 * Asset Management module — orchestrator service (V2 Enhanced).
 *
 * Handles business logic for fixed assets including:
 * - Asset category management with hierarchy support
 * - Asset CRUD with auto-generated asset numbers and barcode support
 * - Depreciation schedule generation and monthly depreciation runs
 * - Maintenance scheduling, completion, and recurring schedules
 * - Asset transfers with approval workflow
 * - Asset audits with line verification
 * - Asset disposal with approval workflow
 * - Asset register and management reporting
 */

import * as repo from './repository-v2.js';
import * as events from './events-v2.js';
import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

import type {
  AssetFilters,
  MaintenanceFilters,
  TransferFilters,
  AuditFilters,
  DisposalFilters,
  DepreciationPeriod,
  AssetRegister,
  AssetStatus,
  AssetCondition,
  MaintenanceDueReport,
  AuditSummaryReport,
} from './types-v2.js';
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateAssetInput,
  UpdateAssetInput,
  DisposeAssetInput,
  ApproveDisposalInput,
  ScheduleMaintenanceInput,
  CompleteMaintenanceInput,
  CancelMaintenanceInput,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  CreateTransferInput,
  ApproveTransferInput,
  CompleteTransferInput,
  CreateAuditInput,
  UpdateAuditInput,
  StartAuditInput,
  CompleteAuditInput,
  CancelAuditInput,
  VerifyAuditLineInput,
  BulkVerifyAuditLinesInput,
  PaginationInput,
} from './validators-v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Categories ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAssetCategory(
  tenantId: string,
  data: CreateAssetCategoryInput,
  actorId: string,
) {
  const category = await repo.createAssetCategory(tenantId, data);

  await events.publishCategoryCreated(tenantId, actorId, {
    id: category.id,
    name: category.name,
    depreciationMethod: category.depreciationMethod as string,
    usefulLifeYears: category.usefulLifeYears,
  });

  return category;
}

export async function updateAssetCategory(
  tenantId: string,
  id: string,
  data: UpdateAssetCategoryInput,
  actorId: string,
) {
  const existing = await repo.findAssetCategory(tenantId, id);
  const category = await repo.updateAssetCategory(tenantId, id, data);

  // Track changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (data.name !== undefined && data.name !== existing.name) {
    changes['name'] = { old: existing.name, new: data.name };
  }

  if (Object.keys(changes).length > 0) {
    await events.publishCategoryUpdated(tenantId, actorId, {
      id: category.id,
      name: category.name,
      changes,
    });
  }

  return category;
}

export async function listAssetCategories(tenantId: string, _includeInactive = false) {
  // Note: includeInactive parameter is not yet supported by the repository
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
    condition: asset.condition as string,
  });

  return asset;
}

export async function updateAsset(
  tenantId: string,
  id: string,
  data: UpdateAssetInput,
  actorId: string,
) {
  const existing = await repo.findAsset(tenantId, id);
  const asset = await repo.updateAsset(tenantId, id, data);

  // Track significant changes
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (data.status !== undefined && data.status !== existing.status) {
    changes['status'] = { old: existing.status, new: data.status };
  }
  if (data.condition !== undefined && data.condition !== existing.condition) {
    changes['condition'] = { old: existing.condition, new: data.condition };
  }
  if (data.locationId !== undefined && data.locationId !== existing.locationId) {
    changes['locationId'] = { old: existing.locationId, new: data.locationId };
  }

  if (Object.keys(changes).length > 0) {
    await events.publishAssetUpdated(tenantId, actorId, {
      id: asset.id,
      assetNumber: asset.assetNumber,
      changes,
    });
  }

  return asset;
}

export async function activateAsset(
  tenantId: string,
  id: string,
  actorId: string,
) {
  const asset = await repo.findAsset(tenantId, id);

  // Assets can only be activated if they are not already active or disposed
  if (asset.status === 'ACTIVE') {
    throw new ValidationError('Asset is already active');
  }
  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Cannot activate a disposed asset');
  }

  await repo.updateAssetStatus(id, 'ACTIVE');

  await events.publishAssetActivated(tenantId, actorId, {
    id: asset.id,
    assetNumber: asset.assetNumber,
    name: asset.name,
  });

  return repo.findAsset(tenantId, id);
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
// ── Asset Images ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: AssetImage model is not yet implemented in the Prisma schema.
// These placeholder functions are here for future implementation.

// ═══════════════════════════════════════════════════════════════════════════════
// ── Depreciation Schedule ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the full depreciation schedule for the life of an asset.
 *
 * Supports methods:
 * - STRAIGHT_LINE: charge = (purchasePrice - salvageValue) / usefulLifeYears / 12 per month
 * - DECLINING_BALANCE: charge = currentBookValue * (1 / usefulLifeYears) / 12 per month
 * - DOUBLE_DECLINING: charge = currentBookValue * (2 / usefulLifeYears) / 12 per month
 * - SUM_OF_YEARS_DIGITS: accelerated depreciation based on remaining useful life
 * - UNITS_OF_PRODUCTION: charge = (purchasePrice - salvageValue) / totalUnitsExpected * unitsThisPeriod
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
  const startMonth = purchaseDate.getMonth();

  // For sum of years digits calculation
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;

  for (let i = 0; i < totalMonths; i++) {
    const year = startYear + Math.floor((startMonth + i) / 12);
    const month = (startMonth + i) % 12;

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0);

    const openingValue = currentBookValue;
    let depreciationCharge = 0;

    // Remaining years for sum of years calculation
    const remainingYears = usefulLifeYears - Math.floor(i / 12);

    switch (depreciationMethod) {
      case 'STRAIGHT_LINE': {
        depreciationCharge = depreciableAmount / totalMonths;
        break;
      }

      case 'DECLINING_BALANCE': {
        const annualRate = 1 / usefulLifeYears;
        depreciationCharge = currentBookValue * (annualRate / 12);
        if (currentBookValue - depreciationCharge < salvageValue) {
          depreciationCharge = Math.max(0, currentBookValue - salvageValue);
        }
        break;
      }

      case 'DOUBLE_DECLINING': {
        const annualRate = 2 / usefulLifeYears;
        depreciationCharge = currentBookValue * (annualRate / 12);
        if (currentBookValue - depreciationCharge < salvageValue) {
          depreciationCharge = Math.max(0, currentBookValue - salvageValue);
        }
        break;
      }

      case 'SUM_OF_YEARS_DIGITS': {
        // Annual depreciation = (remaining years / sum of years) * depreciable amount
        const annualDepreciation = (remainingYears / sumOfYears) * depreciableAmount;
        depreciationCharge = annualDepreciation / 12;
        if (currentBookValue - depreciationCharge < salvageValue) {
          depreciationCharge = Math.max(0, currentBookValue - salvageValue);
        }
        break;
      }

      case 'UNITS_OF_PRODUCTION': {
        // Placeholder: 0 units assumed per period; caller updates when units are logged
        const ratePerUnit =
          totalUnitsExpected && totalUnitsExpected > 0
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
 * Replaces any existing projected schedule entries.
 */
export async function generateDepreciationSchedule(tenantId: string, assetId: string) {
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError(
      'Cannot generate depreciation schedule for a disposed asset',
    );
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
  period: string,
  actorId: string,
): Promise<{
  processed: number;
  totalDepreciationCharge: number;
  assetsSummary: Array<{
    assetId: string;
    assetNumber: string;
    charge: number;
    newBookValue: number;
  }>;
}> {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1;

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    throw new ValidationError(`Invalid period format: ${period}. Expected YYYY-MM`);
  }

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 0);

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
    await repo.markDepreciationPosted(entry.id, actorId);

    // Determine new asset status
    // entry has relation to asset via assetId
    const relatedAsset = await repo.findAssetById(entry.assetId);
    const assetSalvage = Number(relatedAsset.salvageValue);
    const newStatus: AssetStatus | undefined =
      closingValue <= assetSalvage ? 'FULLY_DEPRECIATED' : undefined;

    // Update asset book value
    await repo.updateAssetBookValue(entry.assetId, closingValue, newStatus);

    // Emit event (triggers accounting journal entry via event listener)
    await events.publishAssetDepreciated(tenantId, actorId, {
      assetId: entry.assetId,
      assetNumber: relatedAsset.assetNumber,
      period,
      depreciationCharge: charge,
      newBookValue: closingValue,
    });

    // If fully depreciated, emit additional event
    if (newStatus === 'FULLY_DEPRECIATED') {
      await events.publishAssetFullyDepreciated(tenantId, actorId, {
        id: entry.assetId,
        assetNumber: relatedAsset.assetNumber,
        salvageValue: assetSalvage,
      });
    }

    processed++;
    totalDepreciationCharge += charge;
    assetsSummary.push({
      assetId: entry.assetId,
      assetNumber: relatedAsset.assetNumber,
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
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Cannot schedule maintenance for a disposed asset');
  }

  const record = await repo.createMaintenanceRecord(tenantId, assetId, data, actorId);

  await events.publishMaintenanceScheduled(tenantId, actorId, {
    id: record.id,
    assetId: record.assetId,
    assetNumber: asset.assetNumber,
    type: record.type as string,
    scheduledDate: record.scheduledDate.toISOString(),
    description: record.description,
  });

  return record;
}

export async function startMaintenance(
  tenantId: string,
  maintenanceId: string,
  actorId: string,
) {
  const record = await repo.findMaintenanceRecord(tenantId, maintenanceId);

  if (record.status !== 'SCHEDULED') {
    throw new ValidationError(`Cannot start maintenance with status: ${record.status}`);
  }

  await repo.updateMaintenanceStatus(maintenanceId, 'IN_PROGRESS');

  await events.publishMaintenanceStarted(tenantId, actorId, {
    id: record.id,
    assetId: record.assetId,
    assetNumber: record.asset.assetNumber,
    type: record.type as string,
  });

  return repo.findMaintenanceRecord(tenantId, maintenanceId);
}

export async function completeMaintenance(
  tenantId: string,
  maintenanceId: string,
  data: CompleteMaintenanceInput,
  actorId: string,
) {
  const record = await repo.completeMaintenanceRecord(tenantId, maintenanceId, data);

  const asset = await repo.findAssetById(record.assetId);

  await events.publishMaintenanceCompleted(tenantId, actorId, {
    id: record.id,
    assetId: record.assetId,
    assetNumber: asset.assetNumber,
    type: record.type as string,
    completedDate: record.completedDate!.toISOString(),
    cost: record.cost ? Number(record.cost) : null,
    notes: data.notes ?? null,
  });

  return record;
}

export async function cancelMaintenance(
  tenantId: string,
  maintenanceId: string,
  data: CancelMaintenanceInput,
  actorId: string,
) {
  const record = await repo.findMaintenanceRecord(tenantId, maintenanceId);

  if (record.status === 'COMPLETED' || record.status === 'CANCELLED') {
    throw new ValidationError(`Cannot cancel maintenance with status: ${record.status}`);
  }

  await repo.updateMaintenanceStatus(maintenanceId, 'CANCELLED');

  await events.publishMaintenanceCancelled(tenantId, actorId, {
    id: record.id,
    assetId: record.assetId,
    reason: data.reason,
  });

  return repo.findMaintenanceRecord(tenantId, maintenanceId);
}

export async function listMaintenanceRecords(
  tenantId: string,
  assetId: string | undefined,
  filters: MaintenanceFilters,
  pagination: PaginationInput,
) {
  if (assetId) {
    await repo.findAsset(tenantId, assetId);
  }

  const { page, limit } = pagination;
  const result = await repo.findMaintenanceRecords(tenantId, assetId, filters, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

export async function getMaintenanceDueReport(
  tenantId: string,
  daysAhead: number,
  includeOverdue: boolean,
): Promise<MaintenanceDueReport> {
  const overdueRecords = await repo.findOverdueMaintenanceRecords(tenantId);

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Get upcoming scheduled maintenance
  const { data: upcoming } = await repo.findMaintenanceRecords(
    tenantId,
    undefined,
    {
      status: 'SCHEDULED',
      scheduledDateFrom: now,
      scheduledDateTo: futureDate,
    },
    { page: 1, limit: 100 },
  );

  const items = [
    ...(includeOverdue
      ? overdueRecords.map((r) => ({
          assetId: r.assetId,
          assetNumber: r.asset.assetNumber,
          assetName: r.asset.name,
          maintenanceType: r.type as MaintenanceFilters['type'],
          scheduledDate: r.scheduledDate,
          isOverdue: true,
        }))
      : []),
    ...upcoming.map((r) => ({
      assetId: r.assetId,
      assetNumber: r.asset.assetNumber,
      assetName: r.asset.name,
      maintenanceType: r.type as MaintenanceFilters['type'],
      scheduledDate: r.scheduledDate,
      isOverdue: false,
    })),
  ];

  return {
    totalDue: items.length,
    overdue: overdueRecords.length,
    dueSoon: upcoming.length,
    items: items as MaintenanceDueReport['items'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance Schedules ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createMaintenanceSchedule(
  tenantId: string,
  data: CreateMaintenanceScheduleInput,
  actorId: string,
) {
  await repo.findAsset(tenantId, data.assetId);
  return repo.createMaintenanceSchedule(tenantId, data, actorId);
}

export async function updateMaintenanceSchedule(
  tenantId: string,
  id: string,
  data: UpdateMaintenanceScheduleInput,
) {
  return repo.updateMaintenanceSchedule(tenantId, id, data);
}

export async function listMaintenanceSchedules(tenantId: string, assetId?: string) {
  if (assetId) {
    await repo.findAsset(tenantId, assetId);
  }
  return repo.findMaintenanceSchedules(tenantId, assetId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Transfers ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTransfer(
  tenantId: string,
  data: CreateTransferInput,
  actorId: string,
) {
  const asset = await repo.findAsset(tenantId, data.assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Cannot transfer a disposed asset');
  }

  const transfer = await repo.createTransfer(tenantId, data, actorId);

  await events.publishTransferRequested(tenantId, actorId, {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    assetId: transfer.assetId,
    assetNumber: asset.assetNumber,
    fromLocation: transfer.fromLocationId,
    toLocation: transfer.toLocationId,
    transferDate: transfer.transferDate.toISOString(),
  });

  return transfer;
}

export async function approveTransfer(
  tenantId: string,
  data: ApproveTransferInput,
  actorId: string,
) {
  const transfer = await repo.findTransfer(tenantId, data.transferId);

  if (transfer.status !== 'PENDING') {
    throw new ValidationError(`Cannot approve transfer with status: ${transfer.status}`);
  }

  if (data.approved) {
    await repo.updateTransferStatus(data.transferId, 'APPROVED', actorId);

    await events.publishTransferApproved(tenantId, actorId, {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      assetId: transfer.assetId,
      approvedBy: actorId,
    });
  } else {
    await repo.updateTransferStatus(data.transferId, 'REJECTED', actorId, data.comments);

    await events.publishTransferRejected(tenantId, actorId, {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      assetId: transfer.assetId,
      rejectedBy: actorId,
      reason: data.comments ?? 'Rejected',
    });
  }

  return repo.findTransfer(tenantId, data.transferId);
}

export async function completeTransfer(
  tenantId: string,
  data: CompleteTransferInput,
  actorId: string,
) {
  const transfer = await repo.completeTransfer(tenantId, data.transferId, actorId);
  const asset = await repo.findAssetById(transfer.assetId);

  await events.publishTransferCompleted(tenantId, actorId, {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    assetId: transfer.assetId,
    assetNumber: asset.assetNumber,
    completedAt: transfer.completedAt!.toISOString(),
  });

  return transfer;
}

export async function cancelTransfer(
  tenantId: string,
  transferId: string,
  reason: string,
  actorId: string,
) {
  const transfer = await repo.findTransfer(tenantId, transferId);

  if (transfer.status === 'COMPLETED' || transfer.status === 'REJECTED') {
    throw new ValidationError(`Cannot cancel transfer with status: ${transfer.status}`);
  }

  // Use REJECTED status to indicate cancelled/rejected transfer
  await repo.updateTransferStatus(transferId, 'REJECTED', undefined, reason);

  await events.publishTransferCancelled(tenantId, actorId, {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    assetId: transfer.assetId,
    reason,
  });

  return repo.findTransfer(tenantId, transferId);
}

export async function listTransfers(
  tenantId: string,
  filters: TransferFilters,
  pagination: PaginationInput,
) {
  const { page, limit } = pagination;
  const result = await repo.findTransfers(tenantId, filters, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

export async function getTransfer(tenantId: string, id: string) {
  return repo.findTransfer(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Audits ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAudit(
  tenantId: string,
  data: CreateAuditInput,
  actorId: string,
) {
  const audit = await repo.createAudit(tenantId, data, actorId);

  await events.publishAuditScheduled(tenantId, actorId, {
    id: audit.id,
    auditNumber: audit.auditNumber,
    name: audit.name,
    scope: audit.scope as string,
    scheduledDate: audit.scheduledDate.toISOString(),
    totalAssets: audit.totalAssets,
  });

  return audit;
}

export async function updateAudit(
  tenantId: string,
  id: string,
  data: UpdateAuditInput,
) {
  const audit = await repo.findAudit(tenantId, id);

  if (audit.status !== 'SCHEDULED') {
    throw new ValidationError('Can only update scheduled audits');
  }

  // For now, just return the existing audit (update would be similar to categories)
  return audit;
}

export async function startAudit(
  tenantId: string,
  data: StartAuditInput,
  actorId: string,
) {
  const audit = await repo.findAudit(tenantId, data.auditId);

  if (audit.status !== 'SCHEDULED') {
    throw new ValidationError(`Cannot start audit with status: ${audit.status}`);
  }

  await repo.updateAuditStatus(data.auditId, 'IN_PROGRESS', actorId);

  await events.publishAuditStarted(tenantId, actorId, {
    id: audit.id,
    auditNumber: audit.auditNumber,
    startedAt: new Date().toISOString(),
    conductedBy: actorId,
  });

  return repo.findAudit(tenantId, data.auditId);
}

export async function completeAudit(
  tenantId: string,
  data: CompleteAuditInput,
  actorId: string,
) {
  const audit = await repo.findAudit(tenantId, data.auditId);

  if (audit.status !== 'IN_PROGRESS') {
    throw new ValidationError(`Cannot complete audit with status: ${audit.status}`);
  }

  await repo.updateAuditStatus(data.auditId, 'COMPLETED', actorId);

  const updated = await repo.findAudit(tenantId, data.auditId);

  await events.publishAuditCompleted(tenantId, actorId, {
    id: updated.id,
    auditNumber: updated.auditNumber,
    completedAt: updated.completedAt!.toISOString(),
    totalAssets: updated.totalAssets,
    assetsVerified: updated.assetsVerified,
    assetsMissing: updated.assetsMissing,
    discrepancies: updated.discrepancies,
  });

  return updated;
}

export async function cancelAudit(
  tenantId: string,
  data: CancelAuditInput,
  actorId: string,
) {
  const audit = await repo.findAudit(tenantId, data.auditId);

  if (audit.status === 'COMPLETED' || audit.status === 'CANCELLED') {
    throw new ValidationError(`Cannot cancel audit with status: ${audit.status}`);
  }

  await repo.updateAuditStatus(data.auditId, 'CANCELLED');

  await events.publishAuditCancelled(tenantId, actorId, {
    id: audit.id,
    auditNumber: audit.auditNumber,
    reason: data.reason,
  });

  return repo.findAudit(tenantId, data.auditId);
}

export async function verifyAuditLine(
  tenantId: string,
  data: VerifyAuditLineInput,
  actorId: string,
) {
  return repo.verifyAuditLine(tenantId, data, actorId);
}

export async function bulkVerifyAuditLines(
  tenantId: string,
  data: BulkVerifyAuditLinesInput,
  actorId: string,
) {
  const results = [];
  for (const line of data.lines) {
    const result = await repo.verifyAuditLine(tenantId, line, actorId);
    results.push(result);
  }
  return results;
}

export async function listAudits(
  tenantId: string,
  filters: AuditFilters,
  pagination: PaginationInput,
) {
  const { page, limit } = pagination;
  const result = await repo.findAudits(tenantId, filters, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

export async function getAudit(tenantId: string, id: string) {
  return repo.findAudit(tenantId, id);
}

export async function getAuditSummary(
  tenantId: string,
  auditId: string,
): Promise<AuditSummaryReport> {
  const audit = await repo.findAudit(tenantId, auditId);

  const verificationRate =
    audit.totalAssets > 0 ? audit.assetsVerified / audit.totalAssets : 0;
  const discrepancyRate =
    audit.assetsVerified > 0 ? audit.discrepancies / audit.assetsVerified : 0;

  return {
    auditId: audit.id,
    auditNumber: audit.auditNumber,
    status: audit.status as AuditSummaryReport['status'],
    totalAssets: audit.totalAssets,
    assetsVerified: audit.assetsVerified,
    assetsMissing: audit.assetsMissing,
    assetsFound: audit.assetsFound,
    discrepancies: audit.discrepancies,
    verificationRate: Math.round(verificationRate * 10000) / 100,
    discrepancyRate: Math.round(discrepancyRate * 10000) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Disposal ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request disposal of an asset.
 *
 * Creates a disposal record with PENDING_APPROVAL status.
 * Calculates gain/loss = proceedsAmount - disposalCosts - currentBookValue
 */
export async function requestDisposal(
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
  const disposalCosts = data.disposalCosts ?? 0;

  // Gain = positive when proceeds > book value + costs; Loss = negative
  const gainLoss = Math.round(
    (proceedsAmount - disposalCosts - currentBookValue) * 100,
  ) / 100;

  const disposal = await repo.createAssetDisposal(
    tenantId,
    assetId,
    data,
    currentBookValue,
    gainLoss,
    actorId,
  );

  await events.publishDisposalRequested(tenantId, actorId, {
    id: disposal.id,
    disposalNumber: disposal.disposalNumber,
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    disposalMethod: data.disposalMethod,
    bookValue: currentBookValue,
    estimatedProceeds: proceedsAmount,
  });

  return { disposal, gainLoss };
}

export async function approveDisposal(
  tenantId: string,
  data: ApproveDisposalInput,
  actorId: string,
) {
  const { data: disposals } = await repo.findDisposals(
    tenantId,
    {},
    { page: 1, limit: 1 },
  );

  const disposal = disposals.find((d) => d.id === data.disposalId);
  if (!disposal) {
    throw new NotFoundError('AssetDisposal', data.disposalId);
  }

  if (disposal.status !== 'PENDING_APPROVAL') {
    throw new ValidationError(`Cannot approve disposal with status: ${disposal.status}`);
  }

  const newStatus = data.approved ? 'APPROVED' : 'REJECTED';
  await repo.updateDisposalStatus(data.disposalId, newStatus, actorId, data.comments);

  if (data.approved) {
    await events.publishDisposalApproved(tenantId, actorId, {
      id: disposal.id,
      disposalNumber: disposal.disposalNumber,
      assetId: disposal.assetId,
      approvedBy: actorId,
    });
  } else {
    await events.publishDisposalRejected(tenantId, actorId, {
      id: disposal.id,
      disposalNumber: disposal.disposalNumber,
      assetId: disposal.assetId,
      rejectedBy: actorId,
      reason: data.comments ?? 'Rejected',
    });
  }

  const { data: updated } = await repo.findDisposals(tenantId, {}, { page: 1, limit: 1 });
  return updated.find((d) => d.id === data.disposalId);
}

export async function completeDisposal(
  tenantId: string,
  disposalId: string,
  actorId: string,
  journalEntryId?: string,
) {
  const disposal = await repo.completeDisposal(tenantId, disposalId, journalEntryId);
  const asset = await repo.findAssetById(disposal.assetId);

  await events.publishDisposalCompleted(tenantId, actorId, {
    id: disposal.id,
    disposalNumber: disposal.disposalNumber,
    assetId: disposal.assetId,
    assetNumber: asset.assetNumber,
    disposalDate: disposal.disposalDate.toISOString(),
    proceedsAmount: Number(disposal.proceedsAmount),
    gainLoss: Number(disposal.gainLoss),
  });

  // Also publish asset disposed event
  await events.publishAssetDisposed(tenantId, actorId, {
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    disposalId: disposal.id,
    disposalDate: disposal.disposalDate.toISOString(),
    disposalMethod: disposal.disposalMethod as string,
    proceedsAmount: Number(disposal.proceedsAmount),
    gainLoss: Number(disposal.gainLoss),
  });

  return disposal;
}

export async function listDisposals(
  tenantId: string,
  filters: DisposalFilters,
  pagination: PaginationInput,
) {
  const { page, limit } = pagination;
  const result = await repo.findDisposals(tenantId, filters, { page, limit });
  return {
    data: result.data,
    meta: { total: result.total, page, limit },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Write-Off ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write off an asset.
 *
 * Write-off is implemented as a disposal with WRITTEN_OFF method.
 * The asset status is changed to DISPOSED.
 */
export async function writeOffAsset(
  tenantId: string,
  assetId: string,
  reason: string,
  actorId: string,
) {
  const asset = await repo.findAsset(tenantId, assetId);

  if (asset.status === 'DISPOSED') {
    throw new ValidationError('Asset is already disposed');
  }

  const bookValueWrittenOff = Number(asset.currentBookValue);

  // Write-off sets status to DISPOSED (WRITTEN_OFF is a disposal method, not a status)
  await repo.updateAssetStatus(assetId, 'DISPOSED');
  await repo.updateAssetBookValue(assetId, 0);

  await events.publishAssetWrittenOff(tenantId, actorId, {
    id: asset.id,
    assetNumber: asset.assetNumber,
    bookValueWrittenOff,
    reason,
  });

  return repo.findAsset(tenantId, assetId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Register ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Return a summary of the complete fixed-asset register for a tenant.
 *
 * Includes: total cost, total accumulated depreciation, net book value,
 * and a count breakdown by asset status and condition.
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
  const byCondition: Record<string, number> = {
    NEW: 0,
    EXCELLENT: 0,
    GOOD: 0,
    FAIR: 0,
    POOR: 0,
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

    const conditionKey = asset.condition as string;
    if (conditionKey in byCondition) {
      byCondition[conditionKey] = (byCondition[conditionKey] ?? 0) + 1;
    }
  }

  const totalAccumulatedDepreciation = Math.round((totalCost - totalNetBookValue) * 100) / 100;

  return {
    totalAssets: assets.length,
    totalCost: Math.round(totalCost * 100) / 100,
    totalAccumulatedDepreciation,
    netBookValue: Math.round(totalNetBookValue * 100) / 100,
    byStatus: byStatus as Record<AssetStatus, number>,
    byCondition: byCondition as Record<AssetCondition, number>,
  };
}
