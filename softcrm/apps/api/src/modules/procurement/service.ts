/**
 * Procurement module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ValidationError,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';

import type {
  SupplierFilters,
  POFilters,
  RequisitionFilters,
} from './types.js';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  AddSupplierProductInput,
  CreatePurchaseRequisitionInput,
  ApproveRejectRequisitionInput,
  CreateRFQInput,
  RecordRFQResponseInput,
  CreatePurchaseOrderInput,
  CreateGoodsReceiptInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Suppliers ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSupplier(
  tenantId: string,
  data: CreateSupplierInput,
  actorId: string,
) {
  const existing = await repo.findSupplierByCode(tenantId, data.code);
  if (existing) {
    throw new ValidationError(`Supplier with code "${data.code}" already exists`);
  }

  const supplier = await repo.createSupplier(tenantId, data, actorId);
  await events.publishSupplierCreated(tenantId, actorId, supplier);
  return supplier;
}

export async function updateSupplier(
  tenantId: string,
  id: string,
  data: UpdateSupplierInput,
  actorId: string,
) {
  return repo.updateSupplier(tenantId, id, data, actorId);
}

export async function listSuppliers(
  tenantId: string,
  filters: SupplierFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findSuppliers(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getSupplier(tenantId: string, id: string) {
  return repo.findSupplier(tenantId, id);
}

export async function addSupplierProduct(
  tenantId: string,
  supplierId: string,
  data: AddSupplierProductInput,
) {
  // Validate supplier belongs to tenant
  await repo.findSupplier(tenantId, supplierId);
  return repo.addSupplierProduct(supplierId, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Requisitions ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPurchaseRequisition(
  tenantId: string,
  data: CreatePurchaseRequisitionInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.$transaction(async (tx) => {
    return repo.createPurchaseRequisition(tenantId, data, actorId, tx);
  });
}

export async function submitRequisition(
  tenantId: string,
  requisitionId: string,
  actorId: string,
) {
  const req = await repo.findPurchaseRequisition(tenantId, requisitionId);

  if (req.status !== 'DRAFT') {
    throw new ValidationError(
      `Requisition can only be submitted from DRAFT status. Current: ${req.status}`,
    );
  }

  return repo.updatePurchaseRequisitionStatus(tenantId, requisitionId, 'SUBMITTED');
}

export async function approvePurchaseRequisition(
  tenantId: string,
  requisitionId: string,
  actorId: string,
  input?: ApproveRejectRequisitionInput,
) {
  const req = await repo.findPurchaseRequisition(tenantId, requisitionId);

  if (req.status !== 'SUBMITTED') {
    throw new ValidationError(
      `Requisition can only be approved from SUBMITTED status. Current: ${req.status}`,
    );
  }

  return repo.updatePurchaseRequisitionStatus(
    tenantId,
    requisitionId,
    'APPROVED',
    {
      approvedBy: actorId,
      approvedAt: new Date(),
    },
  );
}

export async function rejectPurchaseRequisition(
  tenantId: string,
  requisitionId: string,
  actorId: string,
  input?: ApproveRejectRequisitionInput,
) {
  const req = await repo.findPurchaseRequisition(tenantId, requisitionId);

  if (req.status !== 'SUBMITTED') {
    throw new ValidationError(
      `Requisition can only be rejected from SUBMITTED status. Current: ${req.status}`,
    );
  }

  return repo.updatePurchaseRequisitionStatus(
    tenantId,
    requisitionId,
    'REJECTED',
    { approvedBy: actorId, approvedAt: new Date() },
  );
}

export async function listPurchaseRequisitions(
  tenantId: string,
  filters: RequisitionFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findPurchaseRequisitions(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getPurchaseRequisition(tenantId: string, id: string) {
  return repo.findPurchaseRequisition(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── RFQs ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createRFQ(
  tenantId: string,
  data: CreateRFQInput,
  actorId: string,
) {
  const db = getPrismaClient();

  // Validate requisition belongs to tenant if provided
  if (data.requisitionId) {
    await repo.findPurchaseRequisition(tenantId, data.requisitionId);
  }

  return db.$transaction(async (tx) => {
    return repo.createRFQ(tenantId, data, actorId, tx);
  });
}

export async function sendRFQ(
  tenantId: string,
  rfqId: string,
  actorId: string,
) {
  const rfq = await repo.findRFQ(tenantId, rfqId);

  if (rfq.status !== 'DRAFT') {
    throw new ValidationError(
      `RFQ can only be sent from DRAFT status. Current: ${rfq.status}`,
    );
  }

  const db = getPrismaClient();
  return db.$transaction(async (tx) => {
    await repo.markRFQSuppliersAsSent(rfqId, tx);
    return repo.updateRFQStatus(tenantId, rfqId, 'SENT', tx);
  });
}

export async function recordRFQResponse(
  tenantId: string,
  rfqId: string,
  supplierId: string,
  data: RecordRFQResponseInput,
  actorId: string,
) {
  // Validate RFQ belongs to tenant
  const rfq = await repo.findRFQ(tenantId, rfqId);

  if (rfq.status === 'CLOSED') {
    throw new ValidationError('Cannot record a response for a closed RFQ');
  }

  const rfqSupplier = await repo.findRFQSupplier(rfqId, supplierId);
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const updated = await repo.updateRFQSupplierResponse(rfqSupplier.id, data, tx);

    // Check if all suppliers have responded — update RFQ status
    const allRFQ = await repo.findRFQ(tenantId, rfqId);
    const allResponded = allRFQ.suppliers.every((s) => s.responseReceivedAt !== null);
    if (allResponded && rfq.status === 'SENT') {
      await repo.updateRFQStatus(tenantId, rfqId, 'RESPONSES_RECEIVED', tx);
    }

    return updated;
  });
}

export async function closeRFQ(
  tenantId: string,
  rfqId: string,
  actorId: string,
) {
  await repo.findRFQ(tenantId, rfqId);
  return repo.updateRFQStatus(tenantId, rfqId, 'CLOSED');
}

export async function listRFQs(
  tenantId: string,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findRFQs(tenantId, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getRFQ(tenantId: string, id: string) {
  return repo.findRFQ(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Orders ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPurchaseOrder(
  tenantId: string,
  data: CreatePurchaseOrderInput,
  actorId: string,
) {
  // Validate supplier belongs to tenant
  await repo.findSupplier(tenantId, data.supplierId);

  // Validate requisition if provided
  if (data.requisitionId) {
    await repo.findPurchaseRequisition(tenantId, data.requisitionId);
  }

  const db = getPrismaClient();
  const po = await db.$transaction(async (tx) => {
    const created = await repo.createProcurementPO(tenantId, data, actorId, tx);

    // If created from a requisition, update its status to PO_CREATED
    if (data.requisitionId) {
      await repo.updatePurchaseRequisitionStatus(
        tenantId,
        data.requisitionId,
        'PO_CREATED',
        {},
        tx,
      );
    }

    return created;
  });

  await events.publishPOCreated(tenantId, actorId, po);
  return po;
}

export async function confirmPurchaseOrder(
  tenantId: string,
  poId: string,
  actorId: string,
) {
  const po = await repo.findProcurementPO(tenantId, poId);

  if (po.status !== 'DRAFT') {
    throw new ValidationError(
      `Purchase order can only be confirmed from DRAFT status. Current: ${po.status}`,
    );
  }

  const confirmed = await repo.updateProcurementPOStatus(
    tenantId,
    poId,
    'CONFIRMED',
    { approvalStatus: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
  );

  await events.publishPOConfirmed(tenantId, actorId, confirmed);
  return confirmed;
}

export async function cancelPurchaseOrder(
  tenantId: string,
  poId: string,
  actorId: string,
) {
  const po = await repo.findProcurementPO(tenantId, poId);

  if (po.status === 'RECEIVED') {
    throw new ValidationError('Cannot cancel a fully received purchase order');
  }
  if (po.status === 'CANCELLED') {
    throw new ValidationError('Purchase order is already cancelled');
  }

  return repo.updateProcurementPOStatus(tenantId, poId, 'CANCELLED');
}

export async function listPurchaseOrders(
  tenantId: string,
  filters: POFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findProcurementPOs(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getPurchaseOrder(tenantId: string, id: string) {
  return repo.findProcurementPO(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Goods Receipts ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a goods receipt in DRAFT state.
 * Validates the PO exists and belongs to the tenant.
 * Validates receipt line quantities do not exceed ordered quantities.
 */
export async function createGoodsReceipt(
  tenantId: string,
  data: CreateGoodsReceiptInput,
  actorId: string,
) {
  const po = await repo.findProcurementPO(tenantId, data.poId);

  if (po.status === 'CANCELLED') {
    throw new ValidationError('Cannot create a goods receipt for a cancelled purchase order');
  }

  // Validate each receipt line against PO lines
  for (const lineInput of data.lines) {
    const poLine = po.lines.find((l) => l.id === lineInput.poLineId);
    if (!poLine) {
      throw new NotFoundError('ProcurementPOLine', lineInput.poLineId);
    }

    const alreadyReceived = Number(poLine.receivedQty);
    const newTotal = alreadyReceived + lineInput.receivedQty;
    if (newTotal > Number(poLine.quantity)) {
      throw new ValidationError(
        `Received quantity (${newTotal}) would exceed ordered quantity (${Number(poLine.quantity)}) for PO line ${lineInput.poLineId}`,
      );
    }
  }

  const db = getPrismaClient();
  return db.$transaction(async (tx) => {
    return repo.createGoodsReceipt(tenantId, data, actorId, tx);
  });
}

/**
 * Confirm a goods receipt.
 * - Updates receivedQty on each matched PO line
 * - Sets PO status to RECEIVED or PARTIALLY_RECEIVED accordingly
 * - Emits GOODS_RECEIVED event (triggers warehouse stock update + AP bill creation)
 */
export async function confirmGoodsReceipt(
  tenantId: string,
  receiptId: string,
  actorId: string,
) {
  const receipt = await repo.findGoodsReceipt(tenantId, receiptId);

  if (receipt.status === 'CONFIRMED') {
    throw new ValidationError('Goods receipt is already confirmed');
  }

  const po = await repo.findProcurementPO(tenantId, receipt.poId);

  const db = getPrismaClient();

  const confirmedReceipt = await db.$transaction(async (tx) => {
    // Update receivedQty on each PO line
    for (const line of receipt.lines) {
      const poLine = po.lines.find((l) => l.id === line.poLineId);
      if (!poLine) continue;

      const newReceivedQty = Number(poLine.receivedQty) + Number(line.receivedQty);
      await repo.updateProcurementPOLineReceivedQty(line.poLineId, newReceivedQty, tx);
    }

    // Re-fetch PO lines to check overall receipt status
    const updatedPO = await tx.procurementPO.findUniqueOrThrow({
      where: { id: po.id },
      include: { lines: true },
    });

    const allReceived = updatedPO.lines.every(
      (l: { receivedQty: unknown; quantity: unknown }) =>
        Number(l.receivedQty) >= Number(l.quantity),
    );
    const someReceived = updatedPO.lines.some(
      (l: { receivedQty: unknown }) => Number(l.receivedQty) > 0,
    );

    let newPOStatus = po.status;
    if (allReceived) {
      newPOStatus = 'RECEIVED';
    } else if (someReceived) {
      newPOStatus = 'PARTIALLY_RECEIVED';
    }

    if (newPOStatus !== po.status) {
      await repo.updateProcurementPOStatus(tenantId, po.id, newPOStatus, {}, tx);
    }

    // Mark receipt as confirmed
    return repo.updateGoodsReceiptStatus(tenantId, receiptId, 'CONFIRMED', tx);
  });

  // Emit GOODS_RECEIVED event — triggers warehouse stock receipt + AP bill
  await events.publishGoodsReceived(tenantId, actorId, {
    id: confirmedReceipt.id,
    receiptNumber: confirmedReceipt.receiptNumber,
    poId: confirmedReceipt.poId,
    warehouseId: confirmedReceipt.warehouseId,
    receivedAt: confirmedReceipt.receivedAt,
    lines: confirmedReceipt.lines.map((l) => ({
      productId: l.productId,
      receivedQty: l.receivedQty,
      lotNumber: l.lotNumber,
    })),
  });

  return confirmedReceipt;
}

export async function getGoodsReceipt(tenantId: string, id: string) {
  return repo.findGoodsReceipt(tenantId, id);
}
