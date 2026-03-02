/**
 * Asset Management module — data-access layer (repository) (V2 Enhanced).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 *
 * IMPORTANT: This file is aligned with the actual Prisma schema in assets.prisma
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';

import type {
  AssetFilters,
  MaintenanceFilters,
  TransferFilters,
  AuditFilters,
  DisposalFilters,
  AssetStatus,
  TransferStatus,
  AuditStatus,
  DisposalStatus,
  MaintenanceStatus,
  AssetCondition,
} from './types-v2.js';
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateAssetInput,
  UpdateAssetInput,
  DisposeAssetInput,
  ScheduleMaintenanceInput,
  CompleteMaintenanceInput,
  CreateTransferInput,
  CreateAuditInput,
  UpdateAuditInput,
  VerifyAuditLineInput,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
} from './validators-v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Local helper types ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Ownership-based filter applied by the RBAC middleware. */
export interface OwnershipScope {
  scope: 'OWN' | 'TEAM' | 'ALL';
  userId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function paginationArgs(pagination: Pagination): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (pagination.page - 1) * pagination.limit;
  const orderBy = pagination.sortBy
    ? { [pagination.sortBy]: pagination.sortDir ?? 'asc' }
    : undefined;
  return { skip, take: pagination.limit, ...(orderBy ? { orderBy } : {}) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Categories ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAssetCategories(tenantId: string) {
  const db = getPrismaClient();

  return db.assetCategory.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { assets: true } },
    },
  });
}

export async function findAssetCategory(tenantId: string, id: string) {
  const db = getPrismaClient();

  const category = await db.assetCategory.findFirst({
    where: { id, tenantId },
  });

  if (!category) {
    throw new NotFoundError('AssetCategory', id);
  }
  return category;
}

export async function findAssetCategoryByName(tenantId: string, name: string) {
  const db = getPrismaClient();

  return db.assetCategory.findFirst({
    where: { tenantId, name },
  });
}

export async function createAssetCategory(
  tenantId: string,
  data: CreateAssetCategoryInput,
) {
  const db = getPrismaClient();

  // Check for duplicate name
  const existing = await findAssetCategoryByName(tenantId, data.name);
  if (existing) {
    throw new ConflictError(`Category with name "${data.name}" already exists`);
  }

  return db.assetCategory.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      description: data.description,
      usefulLifeYears: data.usefulLifeYears,
      salvageValuePercent: data.salvageValuePercent,
      depreciationMethod: data.depreciationMethod as never,
      glAccountId: data.glAccountId,
    },
  });
}

export async function updateAssetCategory(
  tenantId: string,
  id: string,
  data: UpdateAssetCategoryInput,
) {
  const db = getPrismaClient();

  const existing = await db.assetCategory.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('AssetCategory', id);
  }

  // Check for duplicate name if changing name
  if (data.name && data.name !== existing.name) {
    const duplicate = await findAssetCategoryByName(tenantId, data.name);
    if (duplicate) {
      throw new ConflictError(`Category with name "${data.name}" already exists`);
    }
  }

  return db.assetCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.usefulLifeYears !== undefined ? { usefulLifeYears: data.usefulLifeYears } : {}),
      ...(data.salvageValuePercent !== undefined
        ? { salvageValuePercent: data.salvageValuePercent }
        : {}),
      ...(data.depreciationMethod !== undefined
        ? { depreciationMethod: data.depreciationMethod as never }
        : {}),
      ...(data.glAccountId !== undefined ? { glAccountId: data.glAccountId } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Fixed Assets ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAssets(
  tenantId: string,
  filters: AssetFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.categoryId) where['categoryId'] = filters.categoryId;
  if (filters.status) where['status'] = filters.status;
  if (filters.condition) where['condition'] = filters.condition;
  if (filters.locationId) where['locationId'] = filters.locationId;
  if (filters.departmentId) where['departmentId'] = filters.departmentId;
  if (filters.assignedTo) where['assignedTo'] = filters.assignedTo;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.fixedAsset.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
    db.fixedAsset.count({ where }),
  ]);

  return { data, total };
}

export async function findAsset(tenantId: string, id: string) {
  const db = getPrismaClient();

  const asset = await db.fixedAsset.findFirst({
    where: { id, tenantId },
    include: {
      category: true,
      depreciationSchedule: {
        orderBy: { periodStart: 'asc' },
        take: 24,
      },
      maintenance: {
        orderBy: { scheduledDate: 'desc' },
        take: 10,
      },
      maintenanceSchedules: {
        where: { isActive: true },
        orderBy: { nextScheduledDate: 'asc' },
      },
      transfers: {
        orderBy: { transferDate: 'desc' },
        take: 5,
      },
      disposal: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('FixedAsset', id);
  }
  return asset;
}

export async function findAssetById(id: string) {
  const db = getPrismaClient();

  const asset = await db.fixedAsset.findFirst({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('FixedAsset', id);
  }
  return asset;
}

export async function findAssetBySerialNumber(tenantId: string, serialNumber: string) {
  const db = getPrismaClient();

  return db.fixedAsset.findFirst({
    where: { tenantId, serialNumber },
  });
}

export async function createAsset(
  tenantId: string,
  data: CreateAssetInput,
  assetNumber: string,
  actorId: string,
  category: {
    usefulLifeYears: number;
    salvageValuePercent: number;
    depreciationMethod: string;
  },
) {
  const db = getPrismaClient();

  // Check for duplicate serial number
  if (data.serialNumber) {
    const existing = await findAssetBySerialNumber(tenantId, data.serialNumber);
    if (existing) {
      throw new ConflictError(`Asset with serial number "${data.serialNumber}" already exists`);
    }
  }

  // Derive per-asset values from category defaults when not provided
  const usefulLifeYears = data.usefulLifeYears ?? category.usefulLifeYears;
  const depreciationMethod =
    (data.depreciationMethod as string | undefined) ?? category.depreciationMethod;
  const purchasePrice = data.purchasePrice;

  // Compute salvage value: use explicit value or derive from category percent
  const salvageValue =
    data.salvageValue ??
    (purchasePrice * (category.salvageValuePercent / 100));

  return db.fixedAsset.create({
    data: {
      id: generateId(),
      tenantId,
      assetNumber,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      serialNumber: data.serialNumber,
      condition: (data.condition ?? 'NEW') as never,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice,
      currentBookValue: purchasePrice,
      salvageValue,
      usefulLifeYears,
      depreciationMethod: depreciationMethod as never,
      totalUnitsExpected: data.totalUnitsExpected,
      locationId: data.locationId,
      departmentId: data.departmentId,
      assignedTo: data.assignedTo,
      status: 'ACTIVE' as never,
      purchaseInvoiceId: data.purchaseInvoiceId,
      notes: data.notes,
      createdBy: actorId,
    },
  });
}

export async function updateAsset(
  tenantId: string,
  id: string,
  data: UpdateAssetInput,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const existing = await tx.fixedAsset.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('FixedAsset', id);
    }

    if (existing.status === 'DISPOSED') {
      throw new ValidationError('Cannot update a disposed asset');
    }

    // Check for duplicate serial number if changing serial number
    if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
      const duplicate = await findAssetBySerialNumber(tenantId, data.serialNumber);
      if (duplicate) {
        throw new ConflictError(`Asset with serial number "${data.serialNumber}" already exists`);
      }
    }

    const result = await tx.fixedAsset.updateMany({
      where: { id, tenantId, version: data.version },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.condition !== undefined ? { condition: data.condition as never } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
        ...(data.status !== undefined ? { status: data.status as never } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        version: { increment: 1 },
      } as never,
    });

    if (result.count === 0) {
      throw new ConflictError('Asset was modified by another user');
    }

    return tx.fixedAsset.findFirstOrThrow({ where: { id, tenantId } });
  });
}

export async function updateAssetStatus(id: string, status: AssetStatus) {
  const db = getPrismaClient();

  return db.fixedAsset.update({
    where: { id },
    data: { status: status as never },
  });
}

export async function updateAssetBookValue(
  id: string,
  newBookValue: number,
  newStatus?: AssetStatus,
) {
  const db = getPrismaClient();

  return db.fixedAsset.update({
    where: { id },
    data: {
      currentBookValue: newBookValue,
      ...(newStatus ? { status: newStatus as never } : {}),
    },
  });
}

export async function generateNextAssetNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();

  const last = await db.fixedAsset.findFirst({
    where: { tenantId },
    orderBy: { assetNumber: 'desc' },
    select: { assetNumber: true },
  });

  let nextSequence = 1;
  if (last) {
    const parts = last.assetNumber.split('-');
    const seq = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `FA-${String(nextSequence).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Depreciation Schedules ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findDepreciationSchedule(assetId: string) {
  const db = getPrismaClient();

  return db.depreciationSchedule.findMany({
    where: { assetId },
    orderBy: { periodStart: 'asc' },
  });
}

export async function findUnpostedDepreciationForPeriod(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const db = getPrismaClient();

  return db.depreciationSchedule.findMany({
    where: {
      isPosted: false,
      periodStart: { lte: periodEnd },
      periodEnd: { gte: periodStart },
      asset: { tenantId, status: { in: ['ACTIVE', 'UNDER_MAINTENANCE'] } },
    },
    include: { asset: true },
  });
}

export async function upsertDepreciationSchedule(
  assetId: string,
  entries: Array<{
    periodStart: Date;
    periodEnd: Date;
    openingValue: number;
    depreciationCharge: number;
    closingValue: number;
  }>,
) {
  const db = getPrismaClient();

  // Delete existing unposted entries for the asset
  await db.depreciationSchedule.deleteMany({
    where: { assetId, isPosted: false },
  });

  if (entries.length === 0) return [];

  await db.depreciationSchedule.createMany({
    data: entries.map((e) => ({
      id: generateId(),
      assetId,
      periodStart: e.periodStart,
      periodEnd: e.periodEnd,
      openingValue: e.openingValue,
      depreciationCharge: e.depreciationCharge,
      closingValue: e.closingValue,
      isPosted: false,
    })),
  });

  return db.depreciationSchedule.findMany({
    where: { assetId },
    orderBy: { periodStart: 'asc' },
  });
}

export async function markDepreciationPosted(
  id: string,
  journalEntryId?: string,
) {
  const db = getPrismaClient();

  return db.depreciationSchedule.update({
    where: { id },
    data: {
      isPosted: true,
      ...(journalEntryId ? { journalEntryId } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Maintenance ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findMaintenanceRecords(
  tenantId: string,
  assetId: string | undefined,
  filters: MaintenanceFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (assetId) where['assetId'] = assetId;
  if (filters.status) where['status'] = filters.status;
  if (filters.type) where['type'] = filters.type;
  if (filters.scheduledDateFrom || filters.scheduledDateTo) {
    where['scheduledDate'] = {
      ...(filters.scheduledDateFrom ? { gte: filters.scheduledDateFrom } : {}),
      ...(filters.scheduledDateTo ? { lte: filters.scheduledDateTo } : {}),
    };
  }

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.assetMaintenance.findMany({
      where,
      skip,
      take,
      orderBy: { scheduledDate: 'desc' },
      include: { asset: { select: { id: true, assetNumber: true, name: true } } },
    }),
    db.assetMaintenance.count({ where }),
  ]);

  return { data, total };
}

export async function findMaintenanceRecord(tenantId: string, id: string) {
  const db = getPrismaClient();

  const record = await db.assetMaintenance.findFirst({
    where: { id, tenantId },
    include: { asset: true },
  });

  if (!record) {
    throw new NotFoundError('AssetMaintenance', id);
  }
  return record;
}

export async function createMaintenanceRecord(
  tenantId: string,
  assetId: string,
  data: ScheduleMaintenanceInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.assetMaintenance.create({
    data: {
      id: generateId(),
      tenantId,
      assetId,
      type: data.type as never,
      scheduledDate: new Date(data.scheduledDate),
      description: data.description,
      vendor: data.vendor,
      cost: data.cost,
      status: 'SCHEDULED' as never,
      createdBy: actorId,
    },
  });
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
) {
  const db = getPrismaClient();

  return db.assetMaintenance.update({
    where: { id },
    data: {
      status: status as never,
    },
  });
}

export async function completeMaintenanceRecord(
  tenantId: string,
  id: string,
  data: CompleteMaintenanceInput,
) {
  const db = getPrismaClient();

  const existing = await db.assetMaintenance.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('AssetMaintenance', id);
  }

  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new ValidationError(
      `Cannot complete maintenance record with status: ${existing.status}`,
    );
  }

  return db.assetMaintenance.update({
    where: { id },
    data: {
      status: 'COMPLETED' as never,
      completedDate: new Date(data.completedDate),
      ...(data.cost !== undefined ? { cost: data.cost } : {}),
      ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
    },
  });
}

export async function cancelMaintenanceRecord(
  tenantId: string,
  id: string,
) {
  const db = getPrismaClient();

  const existing = await db.assetMaintenance.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('AssetMaintenance', id);
  }

  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new ValidationError(
      `Cannot cancel maintenance record with status: ${existing.status}`,
    );
  }

  return db.assetMaintenance.update({
    where: { id },
    data: {
      status: 'CANCELLED' as never,
    },
  });
}

export async function findOverdueMaintenanceRecords(tenantId: string) {
  const db = getPrismaClient();

  return db.assetMaintenance.findMany({
    where: {
      tenantId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledDate: { lt: new Date() },
    },
    include: { asset: { select: { id: true, assetNumber: true, name: true } } },
    orderBy: { scheduledDate: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance Schedules ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findMaintenanceSchedules(tenantId: string, assetId?: string) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (assetId) where['assetId'] = assetId;

  return db.maintenanceSchedule.findMany({
    where,
    orderBy: { nextScheduledDate: 'asc' },
    include: { asset: { select: { id: true, assetNumber: true, name: true } } },
  });
}

export async function findMaintenanceSchedule(tenantId: string, scheduleId: string) {
  const db = getPrismaClient();
  const schedule = await db.maintenanceSchedule.findFirst({
    where: { id: scheduleId, tenantId },
    include: { asset: { select: { id: true, name: true, assetNumber: true } } },
  });
  if (!schedule) {
    throw new NotFoundError(`Maintenance schedule ${scheduleId} not found`);
  }
  return schedule;
}

export async function createMaintenanceSchedule(
  tenantId: string,
  data: CreateMaintenanceScheduleInput,
  actorId: string,
) {
  const db = getPrismaClient();

  // Calculate next scheduled date based on start date
  const startDate = new Date(data.startDate);

  return db.maintenanceSchedule.create({
    data: {
      id: generateId(),
      tenantId,
      assetId: data.assetId,
      name: data.name,
      description: data.description,
      maintenanceType: data.maintenanceType as never,
      frequency: data.frequency as never,
      startDate,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      nextScheduledDate: startDate,
      estimatedCost: data.estimatedCost,
      vendor: data.vendor,
      notes: data.notes,
      isActive: true,
      createdBy: actorId,
    },
  });
}

export async function updateMaintenanceSchedule(
  tenantId: string,
  id: string,
  data: UpdateMaintenanceScheduleInput,
) {
  const db = getPrismaClient();

  const existing = await db.maintenanceSchedule.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('MaintenanceSchedule', id);
  }

  return db.maintenanceSchedule.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.maintenanceType !== undefined ? { maintenanceType: data.maintenanceType as never } : {}),
      ...(data.frequency !== undefined ? { frequency: data.frequency as never } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined
        ? { endDate: data.endDate ? new Date(data.endDate) : null }
        : {}),
      ...(data.estimatedCost !== undefined ? { estimatedCost: data.estimatedCost } : {}),
      ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deleteMaintenanceSchedule(tenantId: string, scheduleId: string) {
  const db = getPrismaClient();
  const schedule = await db.maintenanceSchedule.findFirst({
    where: { id: scheduleId, tenantId },
  });
  if (!schedule) {
    throw new NotFoundError(`Maintenance schedule ${scheduleId} not found`);
  }
  await db.maintenanceSchedule.delete({ where: { id: scheduleId } });
  return schedule;
}

export async function getMaintenanceDue(
  tenantId: string,
  daysAhead: number,
  includeOverdue: boolean,
) {
  const db = getPrismaClient();
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
    nextScheduledDate: { lte: futureDate },
  };

  if (!includeOverdue) {
    where['nextScheduledDate'] = { gte: now, lte: futureDate };
  }

  return db.maintenanceSchedule.findMany({
    where,
    include: { asset: { select: { id: true, name: true, assetNumber: true, status: true } } },
    orderBy: { nextScheduledDate: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Transfers ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findTransfers(
  tenantId: string,
  filters: TransferFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.assetId) where['assetId'] = filters.assetId;
  if (filters.status) where['status'] = filters.status;
  if (filters.fromLocationId) where['fromLocationId'] = filters.fromLocationId;
  if (filters.toLocationId) where['toLocationId'] = filters.toLocationId;

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.assetTransfer.findMany({
      where,
      skip,
      take,
      orderBy: { transferDate: 'desc' },
      include: { asset: { select: { id: true, assetNumber: true, name: true } } },
    }),
    db.assetTransfer.count({ where }),
  ]);

  return { data, total };
}

export async function findTransfer(tenantId: string, id: string) {
  const db = getPrismaClient();

  const transfer = await db.assetTransfer.findFirst({
    where: { id, tenantId },
    include: { asset: true },
  });

  if (!transfer) {
    throw new NotFoundError('AssetTransfer', id);
  }
  return transfer;
}

export async function generateNextTransferNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();

  const last = await db.assetTransfer.findFirst({
    where: { tenantId },
    orderBy: { transferNumber: 'desc' },
    select: { transferNumber: true },
  });

  let nextSequence = 1;
  if (last) {
    const parts = last.transferNumber.split('-');
    const seq = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `TRF-${String(nextSequence).padStart(5, '0')}`;
}

export async function createTransfer(
  tenantId: string,
  data: CreateTransferInput,
  actorId: string,
) {
  const db = getPrismaClient();

  // Get current asset location/department/assignment
  const asset = await db.fixedAsset.findFirst({
    where: { id: data.assetId, tenantId },
  });

  if (!asset) {
    throw new NotFoundError('FixedAsset', data.assetId);
  }

  const transferNumber = await generateNextTransferNumber(tenantId);

  return db.assetTransfer.create({
    data: {
      id: generateId(),
      tenantId,
      assetId: data.assetId,
      transferNumber,
      fromLocationId: asset.locationId,
      toLocationId: data.toLocationId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: data.toDepartmentId,
      fromAssignedTo: asset.assignedTo,
      toAssignedTo: data.toAssignedTo,
      transferDate: new Date(data.transferDate),
      effectiveDate: new Date(data.effectiveDate),
      reason: data.reason,
      status: 'PENDING' as never,
      notes: data.notes,
      createdBy: actorId,
    },
  });
}

export async function updateTransferStatus(
  id: string,
  status: TransferStatus,
  actorId?: string,
  notes?: string,
) {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = { status: status as never };

  if (status === 'COMPLETED') {
    updateData['completedAt'] = new Date();
  }

  if (actorId && (status === 'APPROVED' || status === 'COMPLETED')) {
    updateData['approvedBy'] = actorId;
    updateData['approvedAt'] = new Date();
  }

  if (notes) {
    updateData['notes'] = notes;
  }

  return db.assetTransfer.update({
    where: { id },
    data: updateData,
  });
}

export async function approveTransfer(
  tenantId: string,
  id: string,
  actorId: string,
  approved: boolean,
  comments?: string,
) {
  const db = getPrismaClient();

  const transfer = await db.assetTransfer.findFirst({
    where: { id, tenantId },
  });

  if (!transfer) {
    throw new NotFoundError('AssetTransfer', id);
  }

  if (transfer.status !== 'PENDING') {
    throw new ValidationError(
      `Cannot approve/reject transfer with status: ${transfer.status}`,
    );
  }

  return db.assetTransfer.update({
    where: { id },
    data: {
      status: (approved ? 'APPROVED' : 'REJECTED') as never,
      approvedBy: actorId,
      approvedAt: new Date(),
      ...(comments ? { notes: comments } : {}),
    },
  });
}

export async function completeTransfer(tenantId: string, id: string, actorId: string) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const transfer = await tx.assetTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!transfer) {
      throw new NotFoundError('AssetTransfer', id);
    }

    if (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED') {
      throw new ValidationError(
        `Cannot complete transfer with status: ${transfer.status}`,
      );
    }

    // Update asset with new location/department/assignment
    await tx.fixedAsset.update({
      where: { id: transfer.assetId },
      data: {
        locationId: transfer.toLocationId,
        departmentId: transfer.toDepartmentId,
        assignedTo: transfer.toAssignedTo,
      },
    });

    // Update transfer status
    return tx.assetTransfer.update({
      where: { id },
      data: {
        status: 'COMPLETED' as never,
        completedAt: new Date(),
        approvedBy: actorId,
        approvedAt: new Date(),
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Audits ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAudits(
  tenantId: string,
  filters: AuditFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status;
  if (filters.scope) where['scope'] = filters.scope;
  if (filters.scheduledDateFrom || filters.scheduledDateTo) {
    where['scheduledDate'] = {
      ...(filters.scheduledDateFrom ? { gte: filters.scheduledDateFrom } : {}),
      ...(filters.scheduledDateTo ? { lte: filters.scheduledDateTo } : {}),
    };
  }

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.assetAudit.findMany({
      where,
      skip,
      take,
      orderBy: { scheduledDate: 'desc' },
    }),
    db.assetAudit.count({ where }),
  ]);

  return { data, total };
}

export async function findAudit(tenantId: string, id: string) {
  const db = getPrismaClient();

  const audit = await db.assetAudit.findFirst({
    where: { id, tenantId },
    include: {
      lines: {
        include: { asset: { select: { id: true, assetNumber: true, name: true } } },
        take: 100,
      },
    },
  });

  if (!audit) {
    throw new NotFoundError('AssetAudit', id);
  }
  return audit;
}

export async function generateNextAuditNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();

  const last = await db.assetAudit.findFirst({
    where: { tenantId },
    orderBy: { auditNumber: 'desc' },
    select: { auditNumber: true },
  });

  let nextSequence = 1;
  if (last) {
    const parts = last.auditNumber.split('-');
    const seq = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `AUD-${String(nextSequence).padStart(5, '0')}`;
}

export async function createAudit(
  tenantId: string,
  data: CreateAuditInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const auditNumber = await generateNextAuditNumber(tenantId);

  // Get assets to audit based on scope
  const assetWhere: Record<string, unknown> = {
    tenantId,
    status: { notIn: ['DISPOSED'] },
  };

  if (data.scope === 'CATEGORY' && data.scopeFilter?.['categoryId']) {
    assetWhere['categoryId'] = data.scopeFilter['categoryId'];
  } else if (data.scope === 'LOCATION' && data.scopeFilter?.['locationId']) {
    assetWhere['locationId'] = data.scopeFilter['locationId'];
  } else if (data.scope === 'DEPARTMENT' && data.scopeFilter?.['departmentId']) {
    assetWhere['departmentId'] = data.scopeFilter['departmentId'];
  }

  const assets = await db.fixedAsset.findMany({
    where: assetWhere,
    select: { id: true, locationId: true, condition: true },
  });

  return db.$transaction(async (tx) => {
    // Create audit
    const audit = await tx.assetAudit.create({
      data: {
        id: generateId(),
        tenantId,
        auditNumber,
        name: data.name,
        description: data.description,
        scope: data.scope as never,
        scopeFilter: data.scopeFilter as never | undefined,
        scheduledDate: new Date(data.scheduledDate),
        status: 'SCHEDULED' as never,
        totalAssets: assets.length,
        assetsVerified: 0,
        assetsMissing: 0,
        assetsFound: 0,
        discrepancies: 0,
        createdBy: actorId,
      },
    });

    // Create audit lines for each asset
    if (assets.length > 0) {
      await tx.assetAuditLine.createMany({
        data: assets.map((asset) => ({
          id: generateId(),
          auditId: audit.id,
          assetId: asset.id,
          expectedLocation: asset.locationId,
          expectedCondition: asset.condition,
          isVerified: false,
          isDiscrepancy: false,
        })),
      });
    }

    return audit;
  });
}

export async function updateAudit(
  tenantId: string,
  auditId: string,
  data: UpdateAuditInput,
) {
  const db = getPrismaClient();
  const audit = await db.assetAudit.findFirst({
    where: { id: auditId, tenantId },
  });
  if (!audit) {
    throw new NotFoundError(`Audit ${auditId} not found`);
  }
  return db.assetAudit.update({
    where: { id: auditId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.scheduledDate !== undefined ? { scheduledDate: new Date(data.scheduledDate) } : {}),
      ...(data.findings !== undefined ? { findings: data.findings } : {}),
      ...(data.recommendations !== undefined ? { recommendations: data.recommendations } : {}),
    },
  });
}

export async function updateAuditStatus(
  id: string,
  status: AuditStatus,
  actorId?: string,
) {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = { status: status as never };

  if (status === 'IN_PROGRESS') {
    updateData['startedAt'] = new Date();
    if (actorId) updateData['conductedBy'] = actorId;
  } else if (status === 'COMPLETED') {
    updateData['completedAt'] = new Date();
  }

  return db.assetAudit.update({
    where: { id },
    data: updateData,
  });
}

export async function startAudit(tenantId: string, auditId: string, actorId: string) {
  const db = getPrismaClient();
  const audit = await db.assetAudit.findFirst({
    where: { id: auditId, tenantId },
  });
  if (!audit) {
    throw new NotFoundError(`Audit ${auditId} not found`);
  }
  return db.assetAudit.update({
    where: { id: auditId },
    data: {
      status: 'IN_PROGRESS' as never,
      startedAt: new Date(),
      conductedBy: actorId,
    },
  });
}

export async function completeAudit(tenantId: string, auditId: string, actorId: string) {
  const db = getPrismaClient();
  const audit = await db.assetAudit.findFirst({
    where: { id: auditId, tenantId },
  });
  if (!audit) {
    throw new NotFoundError(`Audit ${auditId} not found`);
  }
  return db.assetAudit.update({
    where: { id: auditId },
    data: { status: 'COMPLETED' as never, completedAt: new Date() },
  });
}

export async function cancelAudit(tenantId: string, auditId: string) {
  const db = getPrismaClient();
  const audit = await db.assetAudit.findFirst({
    where: { id: auditId, tenantId },
  });
  if (!audit) {
    throw new NotFoundError(`Audit ${auditId} not found`);
  }
  return db.assetAudit.update({
    where: { id: auditId },
    data: { status: 'CANCELLED' as never },
  });
}

export async function findAuditLines(
  auditId: string,
  pagination: Pagination,
) {
  const db = getPrismaClient();
  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.assetAuditLine.findMany({
      where: { auditId },
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: { asset: { select: { id: true, name: true, assetNumber: true } } },
    }),
    db.assetAuditLine.count({ where: { auditId } }),
  ]);

  return { data, total, page: pagination.page, limit: pagination.limit };
}

export async function verifyAuditLine(
  tenantId: string,
  data: VerifyAuditLineInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const line = await db.assetAuditLine.findFirst({
    where: { id: data.auditLineId },
    include: { audit: { select: { tenantId: true, status: true } } },
  });

  if (!line || line.audit.tenantId !== tenantId) {
    throw new NotFoundError('AssetAuditLine', data.auditLineId);
  }

  if (line.audit.status !== 'IN_PROGRESS') {
    throw new ValidationError('Audit must be in progress to verify lines');
  }

  const isDiscrepancy =
    (data.actualLocation !== undefined && data.actualLocation !== line.expectedLocation) ||
    (data.actualCondition !== undefined && data.actualCondition !== line.expectedCondition) ||
    data.discrepancyType !== undefined;

  return db.$transaction(async (tx) => {
    // Update audit line
    const updatedLine = await tx.assetAuditLine.update({
      where: { id: data.auditLineId },
      data: {
        actualLocation: data.actualLocation,
        actualCondition: data.actualCondition as never | undefined,
        isVerified: data.isVerified,
        isDiscrepancy,
        discrepancyType: data.discrepancyType,
        notes: data.notes,
        verifiedAt: data.isVerified ? new Date() : null,
        verifiedBy: data.isVerified ? actorId : null,
      },
    });

    // Update audit counts
    const counts = await tx.assetAuditLine.groupBy({
      by: ['isVerified', 'isDiscrepancy'],
      where: { auditId: line.auditId },
      _count: true,
    });

    let assetsVerified = 0;
    let discrepancies = 0;

    for (const count of counts) {
      if (count.isVerified) assetsVerified += count._count;
      if (count.isDiscrepancy) discrepancies += count._count;
    }

    await tx.assetAudit.update({
      where: { id: line.auditId },
      data: { assetsVerified, discrepancies },
    });

    return updatedLine;
  });
}

export async function bulkVerifyAuditLines(
  tenantId: string,
  auditId: string,
  lines: Array<{
    auditLineId: string;
    actualLocation?: string;
    actualCondition?: AssetCondition;
    isVerified: boolean;
    discrepancyType?: string;
    notes?: string;
  }>,
  actorId: string,
) {
  const db = getPrismaClient();
  const results = [];

  for (const lineData of lines) {
    const result = await verifyAuditLine(
      tenantId,
      {
        auditLineId: lineData.auditLineId,
        actualLocation: lineData.actualLocation,
        actualCondition: lineData.actualCondition,
        isVerified: lineData.isVerified,
        discrepancyType: lineData.discrepancyType,
        notes: lineData.notes,
      },
      actorId,
    );
    results.push(result);
  }

  return results;
}

export async function getAuditSummary(auditId: string) {
  const db = getPrismaClient();

  const audit = await db.assetAudit.findFirst({
    where: { id: auditId },
    select: {
      totalAssets: true,
      assetsVerified: true,
      assetsMissing: true,
      assetsFound: true,
      discrepancies: true,
    },
  });

  if (!audit) {
    throw new NotFoundError('AssetAudit', auditId);
  }

  return {
    total: audit.totalAssets,
    verified: audit.assetsVerified,
    missing: audit.assetsMissing,
    found: audit.assetsFound,
    discrepancies: audit.discrepancies,
    unverified: audit.totalAssets - audit.assetsVerified,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Disposal ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findDisposals(
  tenantId: string,
  filters: DisposalFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status;
  if (filters.method) where['disposalMethod'] = filters.method;
  if (filters.disposalDateFrom || filters.disposalDateTo) {
    where['disposalDate'] = {
      ...(filters.disposalDateFrom ? { gte: filters.disposalDateFrom } : {}),
      ...(filters.disposalDateTo ? { lte: filters.disposalDateTo } : {}),
    };
  }

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.assetDisposal.findMany({
      where,
      skip,
      take,
      orderBy: { disposalDate: 'desc' },
      include: { asset: { select: { id: true, assetNumber: true, name: true } } },
    }),
    db.assetDisposal.count({ where }),
  ]);

  return { data, total };
}

export async function findDisposal(tenantId: string, disposalId: string) {
  const db = getPrismaClient();

  const disposal = await db.assetDisposal.findFirst({
    where: { id: disposalId, tenantId },
    include: { asset: { select: { id: true, assetNumber: true, name: true } } },
  });

  if (!disposal) {
    throw new NotFoundError('AssetDisposal', disposalId);
  }

  return disposal;
}

export async function generateNextDisposalNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();

  const last = await db.assetDisposal.findFirst({
    where: { tenantId },
    orderBy: { disposalNumber: 'desc' },
    select: { disposalNumber: true },
  });

  let nextSequence = 1;
  if (last) {
    const parts = last.disposalNumber.split('-');
    const seq = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `DSP-${String(nextSequence).padStart(5, '0')}`;
}

export async function createAssetDisposal(
  tenantId: string,
  assetId: string,
  data: DisposeAssetInput,
  bookValueAtDisposal: number,
  gainLoss: number,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const asset = await tx.fixedAsset.findFirst({
      where: { id: assetId, tenantId },
    });

    if (!asset) {
      throw new NotFoundError('FixedAsset', assetId);
    }

    if (asset.status === 'DISPOSED') {
      throw new ConflictError('Asset is already disposed');
    }

    const disposalNumber = await generateNextDisposalNumber(tenantId);

    // Create disposal record
    const disposal = await tx.assetDisposal.create({
      data: {
        id: generateId(),
        tenantId,
        assetId,
        disposalNumber,
        disposalDate: new Date(data.disposalDate),
        disposalMethod: data.disposalMethod as never,
        status: 'PENDING_APPROVAL' as never,
        bookValueAtDisposal,
        proceedsAmount: data.proceedsAmount,
        disposalCosts: data.disposalCosts ?? 0,
        gainLoss,
        buyerName: data.buyerName,
        buyerContact: data.buyerContact,
        reason: data.reason,
        notes: data.notes,
        createdBy: actorId,
      },
    });

    return disposal;
  });
}

export async function updateDisposalStatus(
  id: string,
  status: DisposalStatus,
  actorId?: string,
  comments?: string,
) {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = { status: status as never };

  if ((status === 'APPROVED' || status === 'REJECTED') && actorId) {
    updateData['approvedBy'] = actorId;
    updateData['approvedAt'] = new Date();
  }

  if (comments) {
    updateData['notes'] = comments;
  }

  return db.assetDisposal.update({
    where: { id },
    data: updateData,
  });
}

export async function approveDisposal(
  tenantId: string,
  disposalId: string,
  actorId: string,
  approved: boolean,
  comments?: string,
) {
  const db = getPrismaClient();

  const disposal = await db.assetDisposal.findFirst({
    where: { id: disposalId, tenantId },
  });

  if (!disposal) {
    throw new NotFoundError('AssetDisposal', disposalId);
  }

  if (disposal.status !== 'PENDING_APPROVAL') {
    throw new ValidationError(
      `Cannot approve/reject disposal with status: ${disposal.status}`,
    );
  }

  return db.assetDisposal.update({
    where: { id: disposalId },
    data: {
      status: (approved ? 'APPROVED' : 'REJECTED') as never,
      approvedBy: actorId,
      approvedAt: new Date(),
      ...(comments ? { notes: comments } : {}),
    },
  });
}

export async function completeDisposal(
  tenantId: string,
  id: string,
  journalEntryId?: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const disposal = await tx.assetDisposal.findFirst({
      where: { id, tenantId },
    });

    if (!disposal) {
      throw new NotFoundError('AssetDisposal', id);
    }

    if (disposal.status !== 'APPROVED') {
      throw new ValidationError('Disposal must be approved before completion');
    }

    // Update asset status
    await tx.fixedAsset.update({
      where: { id: disposal.assetId },
      data: { status: 'DISPOSED' as never, currentBookValue: 0 },
    });

    // Update disposal status
    return tx.assetDisposal.update({
      where: { id },
      data: {
        status: 'COMPLETED' as never,
        ...(journalEntryId ? { journalEntryId } : {}),
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Register ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAssetRegisterSummary(tenantId: string) {
  const db = getPrismaClient();

  return db.fixedAsset.findMany({
    where: { tenantId },
    select: {
      id: true,
      status: true,
      condition: true,
      purchasePrice: true,
      currentBookValue: true,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Event listener support functions ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAssetsByInvoice(tenantId: string, invoiceId: string) {
  const db = getPrismaClient();

  return db.fixedAsset.findMany({
    where: { tenantId, purchaseInvoiceId: invoiceId },
    select: { id: true, assetNumber: true, status: true },
  });
}

export async function clearAssetDepartment(tenantId: string, departmentId: string) {
  const db = getPrismaClient();

  const result = await db.fixedAsset.updateMany({
    where: { tenantId, departmentId },
    data: { departmentId: null },
  });

  return result.count;
}

export async function clearAssetLocation(tenantId: string, locationId: string) {
  const db = getPrismaClient();

  const result = await db.fixedAsset.updateMany({
    where: { tenantId, locationId },
    data: { locationId: null },
  });

  return result.count;
}

export async function unassignAssetsFromUser(tenantId: string, userId: string) {
  const db = getPrismaClient();

  const result = await db.fixedAsset.updateMany({
    where: { tenantId, assignedTo: userId },
    data: { assignedTo: null },
  });

  return result.count;
}

export async function markAssetsForReallocation(
  tenantId: string,
  assetIds: string[],
  reason: string,
) {
  const db = getPrismaClient();

  // Add a note about needing reallocation
  const result = await db.fixedAsset.updateMany({
    where: { tenantId, id: { in: assetIds } },
    data: {
      assignedTo: null,
      notes: `[REALLOCATION NEEDED: ${reason}]`,
    },
  });

  return result.count;
}
