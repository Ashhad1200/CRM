/**
 * Manufacturing module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, ConflictError } from '@softcrm/shared-kernel';

import type {
  BOMWithLines,
  WorkOrderWithRelations,
  WorkCenterRecord,
  MRPRunRecord,
  BOMFilters,
  WorkOrderFilters,
  ListQuery,
} from './types.js';
import type {
  CreateBOMInput,
  UpdateBOMInput,
  CreateWorkCenterInput,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  RecordMaterialConsumptionInput,
  RecordProductionOutputInput,
  RunMRPInput,
} from './validators.js';

// ── Prisma include fragments ───────────────────────────────────────────────────

const bomWithLinesInclude = {
  lines: true,
} as const;

const workOrderDetailInclude = {
  bom: { select: { id: true, name: true, bomVersion: true } },
  operations: { orderBy: { sequence: 'asc' as const } },
  materialConsumptions: true,
  productionOutputs: true,
} as const;

const workOrderListInclude = {
  bom: { select: { id: true, name: true, bomVersion: true } },
  operations: { orderBy: { sequence: 'asc' as const } },
  materialConsumptions: true,
  productionOutputs: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(query: ListQuery): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (query.page - 1) * query.limit;
  const orderBy = query.sortBy
    ? { [query.sortBy]: query.sortDir ?? 'asc' }
    : undefined;
  return { skip, take: query.limit, ...(orderBy ? { orderBy } : {}) };
}

// ── Work Number Generation ─────────────────────────────────────────────────────

export async function getNextWorkOrderNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();

  const result = await db.workOrder.aggregate({
    where: { tenantId },
    _count: { id: true },
  });

  const seq = (result._count.id ?? 0) + 1;
  return `WO-${String(seq).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── BillOfMaterial ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findBOMs(
  tenantId: string,
  filters: BOMFilters,
  query: ListQuery,
): Promise<{ data: BOMWithLines[]; total: number }> {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.productId) {
    where['productId'] = filters.productId;
  }
  if (filters.isActive !== undefined) {
    where['isActive'] = filters.isActive;
  }
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const { skip, take, orderBy } = paginationArgs(query);

  const [data, total] = await db.$transaction([
    db.billOfMaterial.findMany({
      where,
      include: bomWithLinesInclude,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.billOfMaterial.count({ where }),
  ]);

  return { data: data as unknown as BOMWithLines[], total };
}

export async function findBOMById(
  tenantId: string,
  id: string,
): Promise<BOMWithLines> {
  const db = getPrismaClient();

  const bom = await db.billOfMaterial.findFirst({
    where: { id, tenantId },
    include: bomWithLinesInclude,
  });

  if (!bom) {
    throw new NotFoundError('BillOfMaterial', id);
  }
  return bom as unknown as BOMWithLines;
}

export async function createBOM(
  tenantId: string,
  data: CreateBOMInput,
  actorId: string,
): Promise<BOMWithLines> {
  const db = getPrismaClient();

  // Pre-compute line totals and total BOM cost
  const linesWithTotals = data.lines.map((line) => ({
    ...line,
    unitCost: line.unitCost ?? 0,
    lineTotal: line.quantity * (line.unitCost ?? 0),
  }));

  const totalCost = linesWithTotals.reduce((sum, l) => sum + l.lineTotal, 0);

  return db.$transaction(async (tx) => {
    const bom = await tx.billOfMaterial.create({
      data: {
        tenantId,
        productId: data.productId,
        name: data.name,
        bomVersion: data.bomVersion ?? '1.0',
        isActive: data.isActive ?? true,
        totalCost,
        createdBy: actorId,
        lines: {
          create: linesWithTotals.map((line) => ({
            componentProductId: line.componentProductId,
            description: line.description ?? null,
            quantity: line.quantity,
            unit: line.unit,
            unitCost: line.unitCost,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: bomWithLinesInclude,
    });

    return bom as unknown as BOMWithLines;
  });
}

export async function updateBOM(
  tenantId: string,
  id: string,
  data: UpdateBOMInput,
  actorId: string,
): Promise<BOMWithLines> {
  const db = getPrismaClient();
  const { version, ...rest } = data;

  const result = await db.billOfMaterial.updateMany({
    where: { id, tenantId, version },
    data: {
      ...rest,
      version: { increment: 1 },
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('BillOfMaterial was modified by another user');
  }

  return db.billOfMaterial.findFirstOrThrow({
    where: { id, tenantId },
    include: bomWithLinesInclude,
  }) as unknown as Promise<BOMWithLines>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── WorkCenter ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findWorkCenters(
  tenantId: string,
  query: ListQuery,
  statusFilter?: string,
): Promise<{ data: WorkCenterRecord[]; total: number }> {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (statusFilter) {
    where['status'] = statusFilter;
  }

  const { skip, take, orderBy } = paginationArgs(query);

  const [data, total] = await db.$transaction([
    db.workCenter.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { name: 'asc' },
    }),
    db.workCenter.count({ where }),
  ]);

  return { data: data as unknown as WorkCenterRecord[], total };
}

export async function findWorkCenterById(
  tenantId: string,
  id: string,
): Promise<WorkCenterRecord> {
  const db = getPrismaClient();

  const wc = await db.workCenter.findFirst({ where: { id, tenantId } });
  if (!wc) {
    throw new NotFoundError('WorkCenter', id);
  }
  return wc as unknown as WorkCenterRecord;
}

export async function createWorkCenter(
  tenantId: string,
  data: CreateWorkCenterInput,
): Promise<WorkCenterRecord> {
  const db = getPrismaClient();

  return db.workCenter.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? null,
      capacity: data.capacity ?? 0,
      capacityUnit: data.capacityUnit ?? 'hours',
      costPerHour: data.costPerHour ?? 0,
      status: (data.status ?? 'ACTIVE') as never,
    },
  }) as unknown as Promise<WorkCenterRecord>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── WorkOrder ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findWorkOrders(
  tenantId: string,
  filters: WorkOrderFilters,
  query: ListQuery,
): Promise<{ data: WorkOrderWithRelations[]; total: number }> {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where['status'] = filters.status;
  }
  if (filters.productId) {
    where['productId'] = filters.productId;
  }
  if (filters.bomId) {
    where['bomId'] = filters.bomId;
  }

  const { skip, take, orderBy } = paginationArgs(query);

  const [data, total] = await db.$transaction([
    db.workOrder.findMany({
      where,
      include: workOrderListInclude,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.workOrder.count({ where }),
  ]);

  return { data: data as unknown as WorkOrderWithRelations[], total };
}

export async function findWorkOrderById(
  tenantId: string,
  id: string,
): Promise<WorkOrderWithRelations> {
  const db = getPrismaClient();

  const wo = await db.workOrder.findFirst({
    where: { id, tenantId },
    include: workOrderDetailInclude,
  });

  if (!wo) {
    throw new NotFoundError('WorkOrder', id);
  }
  return wo as unknown as WorkOrderWithRelations;
}

export async function createWorkOrder(
  tenantId: string,
  data: CreateWorkOrderInput,
  workOrderNumber: string,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  const db = getPrismaClient();

  return db.workOrder.create({
    data: {
      tenantId,
      workOrderNumber,
      bomId: data.bomId,
      productId: data.productId,
      plannedQuantity: data.plannedQuantity,
      producedQuantity: 0,
      status: 'DRAFT' as never,
      plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
      plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
      notes: data.notes ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    },
    include: workOrderDetailInclude,
  }) as unknown as Promise<WorkOrderWithRelations>;
}

export async function updateWorkOrder(
  tenantId: string,
  id: string,
  data: UpdateWorkOrderInput,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  const db = getPrismaClient();
  const { version, plannedStartDate, plannedEndDate, ...rest } = data;

  const updates: Record<string, unknown> = { ...rest };
  if (plannedStartDate !== undefined) {
    updates['plannedStartDate'] = new Date(plannedStartDate);
  }
  if (plannedEndDate !== undefined) {
    updates['plannedEndDate'] = new Date(plannedEndDate);
  }

  const result = await db.workOrder.updateMany({
    where: { id, tenantId, version },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedBy: actorId,
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('WorkOrder was modified by another user');
  }

  return db.workOrder.findFirstOrThrow({
    where: { id, tenantId },
    include: workOrderDetailInclude,
  }) as unknown as Promise<WorkOrderWithRelations>;
}

export async function updateWorkOrderStatus(
  tenantId: string,
  id: string,
  status: string,
  actorId: string,
  extra?: Partial<{
    actualStartDate: Date;
    actualEndDate: Date;
    producedQuantity: number;
  }>,
): Promise<WorkOrderWithRelations> {
  const db = getPrismaClient();

  const result = await db.workOrder.updateMany({
    where: { id, tenantId },
    data: {
      status: status as never,
      version: { increment: 1 },
      updatedBy: actorId,
      ...extra,
    } as never,
  });

  if (result.count === 0) {
    throw new NotFoundError('WorkOrder', id);
  }

  return db.workOrder.findFirstOrThrow({
    where: { id, tenantId },
    include: workOrderDetailInclude,
  }) as unknown as Promise<WorkOrderWithRelations>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MaterialConsumption ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function recordMaterialConsumption(
  workOrderId: string,
  data: RecordMaterialConsumptionInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.materialConsumption.create({
    data: {
      workOrderId,
      componentProductId: data.componentProductId,
      plannedQty: data.plannedQty,
      consumedQty: data.consumedQty,
      unit: data.unit,
      consumedAt: new Date(),
      consumedBy: actorId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ProductionOutput ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function recordProductionOutput(
  workOrderId: string,
  productId: string,
  data: RecordProductionOutputInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.productionOutput.create({
    data: {
      workOrderId,
      productId,
      quantity: data.quantity,
      unit: data.unit,
      lotNumber: data.lotNumber ?? null,
      receivedAt: new Date(),
      receivedBy: actorId,
      warehouseLocationId: data.warehouseLocationId ?? null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MRPRun ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findMRPRuns(
  tenantId: string,
  query: ListQuery,
  statusFilter?: string,
): Promise<{ data: MRPRunRecord[]; total: number }> {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (statusFilter) {
    where['status'] = statusFilter;
  }

  const { skip, take, orderBy } = paginationArgs(query);

  const [data, total] = await db.$transaction([
    db.mRPRun.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.mRPRun.count({ where }),
  ]);

  return { data: data as unknown as MRPRunRecord[], total };
}

export async function findMRPRunById(
  tenantId: string,
  id: string,
): Promise<MRPRunRecord> {
  const db = getPrismaClient();

  const run = await db.mRPRun.findFirst({ where: { id, tenantId } });
  if (!run) {
    throw new NotFoundError('MRPRun', id);
  }
  return run as unknown as MRPRunRecord;
}

export async function createMRPRun(
  tenantId: string,
  data: RunMRPInput,
  actorId: string,
): Promise<MRPRunRecord> {
  const db = getPrismaClient();

  return db.mRPRun.create({
    data: {
      tenantId,
      horizon: data.horizon ?? 30,
      status: 'RUNNING' as never,
      recommendations: [],
      createdBy: actorId,
    },
  }) as unknown as Promise<MRPRunRecord>;
}

export async function updateMRPRunStatus(
  tenantId: string,
  id: string,
  status: string,
  recommendations?: unknown[],
): Promise<MRPRunRecord> {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = { status: status as never };
  if (recommendations !== undefined) {
    updateData['recommendations'] = recommendations;
  }

  return db.mRPRun.update({
    where: { id },
    data: updateData,
  }) as unknown as Promise<MRPRunRecord>;
}
