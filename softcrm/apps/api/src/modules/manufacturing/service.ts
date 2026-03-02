/**
 * Manufacturing module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { NotFoundError, ValidationError } from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';

import type {
  BOMWithLines,
  WorkOrderWithRelations,
  WorkCenterRecord,
  MRPRunRecord,
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── BillOfMaterial ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createBOM(
  tenantId: string,
  data: CreateBOMInput,
  actorId: string,
): Promise<BOMWithLines> {
  return repo.createBOM(tenantId, data, actorId);
}

export async function updateBOM(
  tenantId: string,
  id: string,
  data: UpdateBOMInput,
  actorId: string,
): Promise<BOMWithLines> {
  return repo.updateBOM(tenantId, id, data, actorId);
}

export async function getBOM(tenantId: string, id: string): Promise<BOMWithLines> {
  return repo.findBOMById(tenantId, id);
}

export async function listBOMs(
  tenantId: string,
  filters: { productId?: string; isActive?: boolean; search?: string },
  query: ListQuery,
): Promise<PaginatedResult<BOMWithLines>> {
  const { data, total } = await repo.findBOMs(tenantId, { tenantId, ...filters }, query);
  return {
    data,
    total,
    page: query.page,
    pageSize: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── WorkCenter ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createWorkCenter(
  tenantId: string,
  data: CreateWorkCenterInput,
): Promise<WorkCenterRecord> {
  return repo.createWorkCenter(tenantId, data);
}

export async function listWorkCenters(
  tenantId: string,
  query: ListQuery,
  statusFilter?: string,
): Promise<PaginatedResult<WorkCenterRecord>> {
  const { data, total } = await repo.findWorkCenters(tenantId, query, statusFilter);
  return {
    data,
    total,
    page: query.page,
    pageSize: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── WorkOrder ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createWorkOrder(
  tenantId: string,
  data: CreateWorkOrderInput,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  // Validate the BOM exists for this tenant
  await repo.findBOMById(tenantId, data.bomId);

  const workOrderNumber = await repo.getNextWorkOrderNumber(tenantId);

  const wo = await repo.createWorkOrder(tenantId, data, workOrderNumber, actorId);

  // Notify other modules that a work order has been created so they can
  // reserve raw materials from inventory
  await events.publishWorkOrderCreated(tenantId, actorId, {
    workOrderId: wo.id,
    workOrderNumber: wo.workOrderNumber,
    tenantId,
    bomId: wo.bomId,
    productId: wo.productId,
    plannedQuantity: Number(wo.plannedQuantity),
  });

  return wo;
}

export async function updateWorkOrder(
  tenantId: string,
  id: string,
  data: UpdateWorkOrderInput,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  const wo = await repo.findWorkOrderById(tenantId, id);

  if (wo.status === 'COMPLETED' || wo.status === 'CANCELLED') {
    throw new ValidationError(
      `Cannot update a work order in status ${wo.status}`,
    );
  }

  return repo.updateWorkOrder(tenantId, id, data, actorId);
}

export async function releaseWorkOrder(
  tenantId: string,
  id: string,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  const wo = await repo.findWorkOrderById(tenantId, id);

  if (wo.status !== 'DRAFT') {
    throw new ValidationError(
      `Work order can only be released from DRAFT status. Current status: ${wo.status}`,
    );
  }

  const updated = await repo.updateWorkOrderStatus(tenantId, id, 'IN_PROGRESS', actorId, {
    actualStartDate: new Date(),
  });

  await events.publishWorkOrderReleased(tenantId, actorId, {
    workOrderId: updated.id,
    workOrderNumber: updated.workOrderNumber,
    tenantId,
    productId: updated.productId,
    plannedQuantity: Number(updated.plannedQuantity),
  });

  return updated;
}

export async function completeWorkOrder(
  tenantId: string,
  id: string,
  actorId: string,
): Promise<WorkOrderWithRelations> {
  const wo = await repo.findWorkOrderById(tenantId, id);

  if (wo.status !== 'IN_PROGRESS') {
    throw new ValidationError(
      `Work order can only be completed from IN_PROGRESS status. Current status: ${wo.status}`,
    );
  }

  // Validate all operations are done
  const pendingOps = wo.operations.filter((op) => op.status !== 'COMPLETED');
  if (pendingOps.length > 0) {
    throw new ValidationError(
      `Cannot complete work order: ${pendingOps.length} operation(s) are not yet completed`,
    );
  }

  // Sum the production output recorded for this work order
  const totalProduced = wo.productionOutputs.reduce(
    (sum, out) => sum + Number(out.quantity),
    0,
  );

  if (totalProduced <= 0) {
    throw new ValidationError(
      'Cannot complete work order: no production output has been recorded',
    );
  }

  const updated = await repo.updateWorkOrderStatus(tenantId, id, 'COMPLETED', actorId, {
    actualEndDate: new Date(),
    producedQuantity: totalProduced,
  });

  // Emit event so inventory can add finished goods to stock
  await events.publishWorkOrderCompleted(tenantId, actorId, {
    workOrderId: updated.id,
    workOrderNumber: updated.workOrderNumber,
    tenantId,
    productId: updated.productId,
    producedQuantity: totalProduced,
  });

  return updated;
}

export async function listWorkOrders(
  tenantId: string,
  filters: { status?: string; productId?: string; bomId?: string },
  query: ListQuery,
): Promise<PaginatedResult<WorkOrderWithRelations>> {
  const { data, total } = await repo.findWorkOrders(
    tenantId,
    { tenantId, ...filters },
    query,
  );
  return {
    data,
    total,
    page: query.page,
    pageSize: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getWorkOrder(
  tenantId: string,
  id: string,
): Promise<WorkOrderWithRelations> {
  return repo.findWorkOrderById(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Material Consumption ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function recordMaterialConsumption(
  tenantId: string,
  workOrderId: string,
  data: RecordMaterialConsumptionInput,
  actorId: string,
) {
  // Verify work order belongs to this tenant and is in the right state
  const wo = await repo.findWorkOrderById(tenantId, workOrderId);

  if (wo.status !== 'IN_PROGRESS') {
    throw new ValidationError(
      `Material consumption can only be recorded when work order is IN_PROGRESS. Current status: ${wo.status}`,
    );
  }

  return repo.recordMaterialConsumption(workOrderId, data, actorId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Production Output ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function recordProductionOutput(
  tenantId: string,
  workOrderId: string,
  data: RecordProductionOutputInput,
  actorId: string,
) {
  // Verify work order belongs to this tenant and is in the right state
  const wo = await repo.findWorkOrderById(tenantId, workOrderId);

  if (wo.status !== 'IN_PROGRESS') {
    throw new ValidationError(
      `Production output can only be recorded when work order is IN_PROGRESS. Current status: ${wo.status}`,
    );
  }

  const output = await repo.recordProductionOutput(workOrderId, wo.productId, data, actorId);

  // Notify inventory module so it can receive the finished goods
  await events.publishProductionOutputRecorded(tenantId, actorId, {
    workOrderId,
    productId: wo.productId,
    tenantId,
    quantity: data.quantity,
    unit: data.unit,
    lotNumber: data.lotNumber ?? null,
    warehouseLocationId: data.warehouseLocationId ?? null,
  });

  return output;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MRP ───────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function runMRP(
  tenantId: string,
  data: RunMRPInput,
  actorId: string,
): Promise<MRPRunRecord> {
  // Create the MRPRun record with RUNNING status
  const mrpRun = await repo.createMRPRun(tenantId, data, actorId);

  // Stub: actual MRP calculation would happen asynchronously.
  // For now, emit the event and mark as COMPLETED immediately with empty recommendations.
  // A real implementation would dispatch this to a background worker.
  const recommendations: unknown[] = [];

  const completed = await repo.updateMRPRunStatus(
    tenantId,
    mrpRun.id,
    'COMPLETED',
    recommendations,
  );

  await events.publishMRPRunCompleted(tenantId, actorId, {
    mrpRunId: completed.id,
    tenantId,
    horizon: data.horizon ?? 30,
    recommendationCount: recommendations.length,
  });

  return completed;
}

export async function listMRPRuns(
  tenantId: string,
  query: ListQuery,
  statusFilter?: string,
): Promise<PaginatedResult<MRPRunRecord>> {
  const { data, total } = await repo.findMRPRuns(tenantId, query, statusFilter);
  return {
    data,
    total,
    page: query.page,
    pageSize: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getMRPRun(
  tenantId: string,
  id: string,
): Promise<MRPRunRecord> {
  return repo.findMRPRunById(tenantId, id);
}
