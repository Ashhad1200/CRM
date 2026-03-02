/**
 * Asset Management module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';

import type { AssetFilters, MaintenanceFilters } from './types.js';
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateAssetInput,
  UpdateAssetInput,
  DisposeAssetInput,
  ScheduleMaintenanceInput,
  CompleteMaintenanceInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

export async function createAssetCategory(
  tenantId: string,
  data: CreateAssetCategoryInput,
) {
  const db = getPrismaClient();

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

export async function deleteAssetCategory(tenantId: string, id: string) {
  const db = getPrismaClient();

  // First check if category exists
  const existing = await db.assetCategory.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('AssetCategory', id);
  }

  // Check if any assets are using this category
  const assetsCount = await db.fixedAsset.count({
    where: { categoryId: id, tenantId },
  });

  if (assetsCount > 0) {
    throw new ConflictError(`Cannot delete category: ${assetsCount} assets are using it`);
  }

  return db.assetCategory.delete({
    where: { id },
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

  if (filters.categoryId) {
    where['categoryId'] = filters.categoryId;
  }
  if (filters.status) {
    where['status'] = filters.status;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.fixedAsset.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true } } },
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
        take: 12, // Return only first 12 periods by default
      },
      maintenance: {
        orderBy: { scheduledDate: 'desc' },
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
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice,
      currentBookValue: purchasePrice, // initial book value equals purchase price
      salvageValue,
      usefulLifeYears,
      depreciationMethod: depreciationMethod as never,
      totalUnitsExpected: data.totalUnitsExpected,
      locationId: data.locationId,
      departmentId: data.departmentId,
      assignedTo: data.assignedTo,
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

    const result = await tx.fixedAsset.updateMany({
      where: { id, tenantId, version: data.version },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
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

export async function updateAssetBookValue(
  id: string,
  newBookValue: number,
  newStatus?: string,
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

  // Find the highest existing asset number for this tenant
  const last = await db.fixedAsset.findFirst({
    where: { tenantId },
    orderBy: { assetNumber: 'desc' },
    select: { assetNumber: true },
  });

  let nextSequence = 1;
  if (last) {
    // Asset numbers format: FA-NNNN
    const parts = last.assetNumber.split('-');
    const seq = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `FA-${String(nextSequence).padStart(4, '0')}`;
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
      asset: { tenantId },
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

  // Delete existing unposted entries for the asset and recreate
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
  assetId: string,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId, assetId };

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.assetMaintenance.findMany({
      where,
      skip,
      take,
      orderBy: { scheduledDate: 'desc' },
    }),
    db.assetMaintenance.count({ where }),
  ]);

  return { data, total };
}

export async function findMaintenanceRecord(tenantId: string, id: string) {
  const db = getPrismaClient();

  const record = await db.assetMaintenance.findFirst({
    where: { id, tenantId },
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
      createdBy: actorId,
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
      status: 'COMPLETED',
      completedDate: new Date(data.completedDate),
      ...(data.cost !== undefined ? { cost: data.cost } : {}),
      ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Disposal ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAssetDisposal(
  tenantId: string,
  assetId: string,
  data: DisposeAssetInput,
  gainLoss: number,
  actorId: string,
  journalEntryId?: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Check asset is not already disposed
    const asset = await tx.fixedAsset.findFirst({
      where: { id: assetId, tenantId },
    });

    if (!asset) {
      throw new NotFoundError('FixedAsset', assetId);
    }

    if (asset.status === 'DISPOSED') {
      throw new ConflictError('Asset is already disposed');
    }

    // Generate disposal number
    const last = await tx.assetDisposal.findFirst({
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
    const disposalNumber = `DSP-${String(nextSequence).padStart(4, '0')}`;

    // Create disposal record
    const disposal = await tx.assetDisposal.create({
      data: {
        id: generateId(),
        tenantId,
        assetId,
        disposalNumber,
        disposalDate: new Date(data.disposalDate),
        disposalMethod: data.disposalMethod as never,
        bookValueAtDisposal: Number(asset.currentBookValue),
        proceedsAmount: data.proceedsAmount,
        gainLoss,
        notes: data.notes,
        journalEntryId,
        createdBy: actorId,
      },
    });

    // Update asset status to DISPOSED
    await tx.fixedAsset.update({
      where: { id: assetId },
      data: { status: 'DISPOSED', currentBookValue: 0 },
    });

    return disposal;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset Register ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAssetRegisterSummary(tenantId: string) {
  const db = getPrismaClient();

  const assets = await db.fixedAsset.findMany({
    where: { tenantId },
    select: {
      status: true,
      purchasePrice: true,
      currentBookValue: true,
    },
  });

  return assets;
}
