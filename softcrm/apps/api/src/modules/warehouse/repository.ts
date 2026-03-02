/**
 * Warehouse / WMS module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';

// Prisma enum type helpers — extracted from the Prisma client
// to safely cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type PrismaWarehouseStatus = NonNullable<Parameters<PrismaClient['wHWarehouse']['create']>[0]['data']>['status'];
type PrismaLocationType = NonNullable<Parameters<PrismaClient['wHLocation']['create']>[0]['data']>['type'];
type PrismaStockLotStatus = NonNullable<Parameters<PrismaClient['wHStockLot']['create']>[0]['data']>['status'];
type PrismaStockMoveType = NonNullable<Parameters<PrismaClient['wHStockMove']['create']>[0]['data']>['moveType'];
type PrismaStockMoveStatus = NonNullable<Parameters<PrismaClient['wHStockMove']['create']>[0]['data']>['status'];
type PrismaPickListStatus = NonNullable<Parameters<PrismaClient['wHPickList']['create']>[0]['data']>['status'];
type PrismaPickListLineStatus = NonNullable<Parameters<PrismaClient['wHPickListLine']['create']>[0]['data']>['status'];
type PrismaShipmentStatus = NonNullable<Parameters<PrismaClient['wHShipment']['create']>[0]['data']>['status'];
type PrismaCycleCountStatus = NonNullable<Parameters<PrismaClient['wHCycleCount']['create']>[0]['data']>['status'];

import type {
  WarehouseFilters,
  LocationFilters,
  StockLotFilters,
  StockLevelFilters,
  StockMoveFilters,
  PickListFilters,
  ShipmentFilters,
  CycleCountFilters,
} from './types.js';
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreatePickListInput,
  CreateShipmentInput,
  CreateCycleCountInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Prisma transaction client type. */
type TxClient = Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0];

// ── Prisma include fragments ───────────────────────────────────────────────────

const pickListWithLinesInclude = {
  lines: true,
} as const;

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
// ── Warehouses ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findWarehouses(
  tenantId: string,
  filters: WarehouseFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) {
    where['status'] = filters.status as PrismaWarehouseStatus;
  }
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    db.wHWarehouse.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { name: 'asc' },
    }),
    db.wHWarehouse.count({ where }),
  ]);

  return { data, total };
}

export async function findWarehouse(tenantId: string, id: string) {
  const db = getPrismaClient();
  const warehouse = await db.wHWarehouse.findFirst({
    where: { id, tenantId },
  });
  if (!warehouse) throw new NotFoundError('Warehouse', id);
  return warehouse;
}

export async function createWarehouse(
  tenantId: string,
  data: CreateWarehouseInput,
  actorId: string,
) {
  const db = getPrismaClient();

  // Ensure code uniqueness within tenant
  const existing = await db.wHWarehouse.findFirst({
    where: { tenantId, code: data.code },
  });
  if (existing) {
    throw new ValidationError(`Warehouse with code "${data.code}" already exists`);
  }

  return db.wHWarehouse.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      code: data.code,
      address: (data.address ?? {}) as never,
      isDefault: data.isDefault ?? false,
      status: (data.status ?? 'ACTIVE') as PrismaWarehouseStatus,
      createdBy: actorId,
    },
  });
}

export async function updateWarehouse(
  tenantId: string,
  id: string,
  data: UpdateWarehouseInput,
) {
  const db = getPrismaClient();
  const existing = await db.wHWarehouse.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Warehouse', id);

  const { id: _id, ...updateData } = data;

  return db.wHWarehouse.update({
    where: { id },
    data: {
      ...updateData,
      status: updateData.status ? (updateData.status as PrismaWarehouseStatus) : undefined,
      address: updateData.address ? (updateData.address as never) : undefined,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Locations ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findLocations(
  tenantId: string,
  warehouseId: string,
  filters: LocationFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId, warehouseId };
  if (filters.type) {
    where['type'] = filters.type as PrismaLocationType;
  }
  if (filters.zone) {
    where['zone'] = filters.zone;
  }

  const [data, total] = await Promise.all([
    db.wHLocation.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { code: 'asc' },
    }),
    db.wHLocation.count({ where }),
  ]);

  return { data, total };
}

export async function findLocation(tenantId: string, id: string) {
  const db = getPrismaClient();
  const location = await db.wHLocation.findFirst({
    where: { id, tenantId },
  });
  if (!location) throw new NotFoundError('Location', id);
  return location;
}

export async function createLocation(
  tenantId: string,
  warehouseId: string,
  data: CreateLocationInput,
) {
  const db = getPrismaClient();

  const existing = await db.wHLocation.findFirst({
    where: { tenantId, warehouseId, code: data.code },
  });
  if (existing) {
    throw new ValidationError(`Location with code "${data.code}" already exists in this warehouse`);
  }

  return db.wHLocation.create({
    data: {
      id: generateId(),
      tenantId,
      warehouseId,
      name: data.name,
      code: data.code,
      type: data.type as PrismaLocationType,
      zone: data.zone ?? null,
      aisle: data.aisle ?? null,
      rack: data.rack ?? null,
      bin: data.bin ?? null,
      maxCapacity: data.maxCapacity ?? null,
    },
  });
}

export async function updateLocation(
  tenantId: string,
  id: string,
  data: UpdateLocationInput,
) {
  const db = getPrismaClient();
  const existing = await db.wHLocation.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Location', id);

  const { id: _id, ...updateData } = data;

  return db.wHLocation.update({
    where: { id },
    data: {
      ...updateData,
      type: updateData.type ? (updateData.type as PrismaLocationType) : undefined,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Lots ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findStockLots(
  tenantId: string,
  filters: StockLotFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.productId) where['productId'] = filters.productId;
  if (filters.warehouseId) where['warehouseId'] = filters.warehouseId;
  if (filters.locationId) where['locationId'] = filters.locationId;
  if (filters.status) where['status'] = filters.status as PrismaStockLotStatus;

  const [data, total] = await Promise.all([
    db.wHStockLot.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { receivedAt: 'desc' },
    }),
    db.wHStockLot.count({ where }),
  ]);

  return { data, total };
}

export async function findStockLot(tenantId: string, id: string, tx?: TxClient) {
  const client = tx ?? getPrismaClient();
  const lot = await client.wHStockLot.findFirst({
    where: { id, tenantId },
  });
  if (!lot) throw new NotFoundError('StockLot', id);
  return lot;
}

export async function createStockLot(
  tenantId: string,
  data: {
    productId: string;
    warehouseId: string;
    locationId?: string | null;
    lotNumber: string;
    serialNumber?: string | null;
    quantity: number;
    expiryDate?: Date | null;
    receivedAt: Date;
  },
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockLot.create({
    data: {
      id: generateId(),
      tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      locationId: data.locationId ?? null,
      lotNumber: data.lotNumber,
      serialNumber: data.serialNumber ?? null,
      quantity: data.quantity,
      reservedQty: 0,
      expiryDate: data.expiryDate ?? null,
      receivedAt: data.receivedAt,
      status: 'AVAILABLE' as PrismaStockLotStatus,
    },
  });
}

export async function updateStockLotQuantity(
  id: string,
  quantityDelta: number,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockLot.update({
    where: { id },
    data: {
      quantity: { increment: quantityDelta },
    },
  });
}

export async function updateStockLotReserved(
  id: string,
  reservedDelta: number,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockLot.update({
    where: { id },
    data: {
      reservedQty: { increment: reservedDelta },
    },
  });
}

export async function updateStockLotLocation(
  id: string,
  locationId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockLot.update({
    where: { id },
    data: { locationId },
  });
}

export async function updateStockLotStatus(
  id: string,
  status: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockLot.update({
    where: { id },
    data: { status: status as PrismaStockLotStatus },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Levels (aggregation) ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAggregatedStockLevels(
  tenantId: string,
  filters: StockLevelFilters,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = {
    tenantId,
    status: 'AVAILABLE' as PrismaStockLotStatus,
  };
  if (filters.productId) where['productId'] = filters.productId;
  if (filters.warehouseId) where['warehouseId'] = filters.warehouseId;
  if (filters.locationId) where['locationId'] = filters.locationId;

  const lots = await db.wHStockLot.findMany({
    where,
    select: {
      productId: true,
      warehouseId: true,
      locationId: true,
      quantity: true,
      reservedQty: true,
    },
  });

  // Aggregate by productId + warehouseId + locationId
  const map = new Map<string, { productId: string; warehouseId: string; locationId: string | null; totalQty: number; reservedQty: number }>();

  for (const lot of lots) {
    const key = `${lot.productId}::${lot.warehouseId}::${lot.locationId ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQty += Number(lot.quantity);
      existing.reservedQty += Number(lot.reservedQty);
    } else {
      map.set(key, {
        productId: lot.productId,
        warehouseId: lot.warehouseId,
        locationId: lot.locationId,
        totalQty: Number(lot.quantity),
        reservedQty: Number(lot.reservedQty),
      });
    }
  }

  return Array.from(map.values()).map((entry) => ({
    productId: entry.productId,
    warehouseId: entry.warehouseId,
    locationId: entry.locationId,
    availableQty: entry.totalQty - entry.reservedQty,
    reservedQty: entry.reservedQty,
    totalQty: entry.totalQty,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Moves ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createStockMove(
  tenantId: string,
  data: {
    reference: string;
    moveType: string;
    productId: string;
    warehouseId: string;
    lotId?: string | null;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    plannedQty: number;
    doneQty?: number;
    status?: string;
    sourceDocument?: string | null;
    scheduledDate: Date;
    doneDate?: Date | null;
    createdBy?: string | null;
  },
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHStockMove.create({
    data: {
      id: generateId(),
      tenantId,
      reference: data.reference,
      moveType: data.moveType as PrismaStockMoveType,
      productId: data.productId,
      warehouseId: data.warehouseId,
      lotId: data.lotId ?? null,
      fromLocationId: data.fromLocationId ?? null,
      toLocationId: data.toLocationId ?? null,
      plannedQty: data.plannedQty,
      doneQty: data.doneQty ?? 0,
      status: (data.status ?? 'DONE') as PrismaStockMoveStatus,
      sourceDocument: data.sourceDocument ?? null,
      scheduledDate: data.scheduledDate,
      doneDate: data.doneDate ?? null,
      createdBy: data.createdBy ?? null,
      version: 1,
    },
  });
}

export async function findStockMoves(
  tenantId: string,
  filters: StockMoveFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.moveType) where['moveType'] = filters.moveType as PrismaStockMoveType;
  if (filters.status) where['status'] = filters.status as PrismaStockMoveStatus;
  if (filters.productId) where['productId'] = filters.productId;

  const [data, total] = await Promise.all([
    db.wHStockMove.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    db.wHStockMove.count({ where }),
  ]);

  return { data, total };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Pick Lists ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findPickLists(
  tenantId: string,
  filters: PickListFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status as PrismaPickListStatus;
  if (filters.warehouseId) where['warehouseId'] = filters.warehouseId;
  if (filters.assignedTo) where['assignedTo'] = filters.assignedTo;

  const [data, total] = await Promise.all([
    db.wHPickList.findMany({
      where,
      include: pickListWithLinesInclude,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    db.wHPickList.count({ where }),
  ]);

  return { data, total };
}

export async function findPickList(tenantId: string, id: string, tx?: TxClient) {
  const client = tx ?? getPrismaClient();
  const pickList = await client.wHPickList.findFirst({
    where: { id, tenantId },
    include: pickListWithLinesInclude,
  });
  if (!pickList) throw new NotFoundError('PickList', id);
  return pickList;
}

export async function createPickList(
  tenantId: string,
  data: CreatePickListInput,
  actorId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  const pickListId = generateId();

  await client.wHPickList.create({
    data: {
      id: pickListId,
      tenantId,
      warehouseId: data.warehouseId,
      sourceOrderId: data.sourceOrderId ?? null,
      sourceOrderType: data.sourceOrderType ?? null,
      status: 'DRAFT' as PrismaPickListStatus,
      createdBy: actorId,
      version: 1,
      lines: {
        create: data.lines.map((line) => ({
          id: generateId(),
          productId: line.productId,
          locationId: line.locationId,
          lotId: line.lotId ?? null,
          requestedQty: line.requestedQty,
          pickedQty: 0,
          status: 'PENDING' as PrismaPickListLineStatus,
        })),
      },
    },
  });

  return client.wHPickList.findUniqueOrThrow({
    where: { id: pickListId },
    include: pickListWithLinesInclude,
  });
}

export async function updatePickListStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHPickList.update({
    where: { id },
    data: {
      status: status as PrismaPickListStatus,
      version: { increment: 1 },
      ...(extra ?? {}),
    },
    include: pickListWithLinesInclude,
  });
}

export async function updatePickListLine(
  id: string,
  pickedQty: number,
  status: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHPickListLine.update({
    where: { id },
    data: {
      pickedQty,
      status: status as PrismaPickListLineStatus,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Shipments ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findShipments(
  tenantId: string,
  filters: ShipmentFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status as PrismaShipmentStatus;
  if (filters.warehouseId) where['warehouseId'] = filters.warehouseId;

  const [data, total] = await Promise.all([
    db.wHShipment.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    db.wHShipment.count({ where }),
  ]);

  return { data, total };
}

export async function findShipment(tenantId: string, id: string, tx?: TxClient) {
  const client = tx ?? getPrismaClient();
  const shipment = await client.wHShipment.findFirst({
    where: { id, tenantId },
  });
  if (!shipment) throw new NotFoundError('Shipment', id);
  return shipment;
}

export async function createShipment(
  tenantId: string,
  data: CreateShipmentInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.wHShipment.create({
    data: {
      id: generateId(),
      tenantId,
      warehouseId: data.warehouseId,
      pickListId: data.pickListId ?? null,
      carrier: data.carrier ?? null,
      trackingNumber: data.trackingNumber ?? null,
      estimatedDelivery: data.estimatedDelivery ?? null,
      status: 'PENDING' as PrismaShipmentStatus,
      recipientName: data.recipientName,
      recipientAddress: (data.recipientAddress ?? {}) as never,
      weight: data.weight ?? null,
      createdBy: actorId,
    },
  });
}

export async function updateShipmentStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHShipment.update({
    where: { id },
    data: {
      status: status as PrismaShipmentStatus,
      ...(extra ?? {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Cycle Counts ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findCycleCounts(
  tenantId: string,
  filters: CycleCountFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status as PrismaCycleCountStatus;
  if (filters.warehouseId) where['warehouseId'] = filters.warehouseId;

  const [data, total] = await Promise.all([
    db.wHCycleCount.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    db.wHCycleCount.count({ where }),
  ]);

  return { data, total };
}

export async function findCycleCount(tenantId: string, id: string, tx?: TxClient) {
  const client = tx ?? getPrismaClient();
  const count = await client.wHCycleCount.findFirst({
    where: { id, tenantId },
  });
  if (!count) throw new NotFoundError('CycleCount', id);
  return count;
}

export async function createCycleCount(
  tenantId: string,
  data: CreateCycleCountInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.wHCycleCount.create({
    data: {
      id: generateId(),
      tenantId,
      warehouseId: data.warehouseId,
      locationId: data.locationId ?? null,
      status: 'DRAFT' as PrismaCycleCountStatus,
      countedBy: data.countedBy,
      discrepancies: [],
      createdBy: actorId,
    },
  });
}

export async function updateCycleCountStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.wHCycleCount.update({
    where: { id },
    data: {
      status: status as PrismaCycleCountStatus,
      ...(extra ?? {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Reference Number Generation ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateMoveReference(
  tenantId: string,
  prefix: string,
  tx?: TxClient,
): Promise<string> {
  const client = tx ?? getPrismaClient();
  const count = await client.wHStockMove.count({ where: { tenantId } });
  const seq = String(count + 1).padStart(6, '0');
  return `${prefix}-${seq}`;
}
