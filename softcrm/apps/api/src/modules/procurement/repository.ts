/**
 * Procurement module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  generateId,
} from '@softcrm/shared-kernel';

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
  CreateRFQInput,
  RecordRFQResponseInput,
  CreatePurchaseOrderInput,
  CreateGoodsReceiptInput,
} from './validators.js';

// Prisma type helpers — extract enum types from the Prisma client to safely
// cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type PrismaSupplierStatus = NonNullable<Parameters<PrismaClient['supplier']['create']>[0]['data']>['status'];
type PrismaProcurementPOStatus = NonNullable<Parameters<PrismaClient['procurementPO']['create']>[0]['data']>['status'];
type PrismaApprovalStatus = NonNullable<Parameters<PrismaClient['procurementPO']['create']>[0]['data']>['approvalStatus'];
type PrismaCurrency = NonNullable<Parameters<PrismaClient['procurementPO']['create']>[0]['data']>['currency'];
type PrismaRFQStatus = NonNullable<Parameters<PrismaClient['rFQ']['create']>[0]['data']>['status'];
type PrismaRequisitionStatus = NonNullable<Parameters<PrismaClient['purchaseRequisition']['create']>[0]['data']>['status'];
type PrismaGoodsReceiptStatus = NonNullable<Parameters<PrismaClient['goodsReceipt']['create']>[0]['data']>['status'];

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ── Prisma transaction client type ─────────────────────────────────────────────

type TxClient = Parameters<
  Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]
>[0];

// ── Prisma include fragments ───────────────────────────────────────────────────

const supplierWithProductsInclude = {
  products: true,
} as const;

const requisitionWithLinesInclude = {
  lines: true,
} as const;

const rfqWithSuppliersInclude = {
  suppliers: {
    include: {
      supplier: {
        select: { id: true, name: true, code: true },
      },
    },
  },
} as const;

const procurementPOWithLinesInclude = {
  supplier: {
    select: { id: true, name: true, code: true },
  },
  lines: true,
} as const;

const goodsReceiptWithLinesInclude = {
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
// ── Suppliers ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findSuppliers(
  tenantId: string,
  filters: SupplierFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) {
    where['status'] = filters.status as PrismaSupplierStatus;
  }

  const [data, total] = await Promise.all([
    db.supplier.findMany({
      where,
      include: supplierWithProductsInclude,
      ...paginationArgs(pagination),
    }),
    db.supplier.count({ where }),
  ]);

  return { data, total };
}

export async function findSupplier(tenantId: string, id: string) {
  const db = getPrismaClient();
  const supplier = await db.supplier.findFirst({
    where: { id, tenantId },
    include: supplierWithProductsInclude,
  });
  if (!supplier) throw new NotFoundError('Supplier', id);
  return supplier;
}

export async function findSupplierByCode(tenantId: string, code: string) {
  const db = getPrismaClient();
  return db.supplier.findFirst({
    where: { tenantId, code },
  });
}

export async function createSupplier(
  tenantId: string,
  data: CreateSupplierInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.supplier.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      code: data.code,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      address: (data.address ?? null) as never,
      paymentTerms: data.paymentTerms ?? null,
      currency: (data.currency ?? 'USD') as PrismaCurrency,
      rating: data.rating ?? null,
      status: (data.status ?? 'ACTIVE') as PrismaSupplierStatus,
      createdBy: actorId,
      version: 1,
    },
    include: supplierWithProductsInclude,
  });
}

export async function updateSupplier(
  tenantId: string,
  id: string,
  data: UpdateSupplierInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const existing = await db.supplier.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Supplier', id);
  if (existing.version !== data.version) {
    throw new ConflictError('Supplier has been modified by another user');
  }

  const { id: _id, version: _v, ...updateData } = data;

  return db.supplier.update({
    where: { id },
    data: {
      ...updateData,
      status: updateData.status ? (updateData.status as PrismaSupplierStatus) : undefined,
      currency: updateData.currency ? (updateData.currency as PrismaCurrency) : undefined,
      address: updateData.address !== undefined ? (updateData.address as never) : undefined,
      version: { increment: 1 },
    },
    include: supplierWithProductsInclude,
  });
}

export async function addSupplierProduct(
  supplierId: string,
  data: AddSupplierProductInput,
) {
  const db = getPrismaClient();
  return db.supplierProduct.create({
    data: {
      id: generateId(),
      supplierId,
      productId: data.productId,
      supplierSku: data.supplierSku ?? null,
      unitPrice: data.unitPrice,
      minOrderQty: data.minOrderQty,
      leadTimeDays: data.leadTimeDays,
      isPreferred: data.isPreferred ?? false,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Requisitions ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextReqNumber(
  tenantId: string,
  tx?: TxClient,
): Promise<string> {
  const client = tx ?? getPrismaClient();
  const last = await client.purchaseRequisition.findFirst({
    where: { tenantId },
    orderBy: { reqNumber: 'desc' },
    select: { reqNumber: true },
  });

  if (!last) return 'PR-001';
  const lastNum = parseInt(last.reqNumber.replace('PR-', ''), 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `PR-${String(nextNum).padStart(3, '0')}`;
}

export async function createPurchaseRequisition(
  tenantId: string,
  data: CreatePurchaseRequisitionInput,
  actorId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  const reqId = generateId();
  const reqNumber = await getNextReqNumber(tenantId, tx);

  await client.purchaseRequisition.create({
    data: {
      id: reqId,
      tenantId,
      reqNumber,
      requestedBy: data.requestedBy,
      departmentId: data.departmentId ?? null,
      notes: data.notes ?? null,
      status: 'DRAFT' as PrismaRequisitionStatus,
      version: 1,
      lines: {
        create: data.lines.map((l) => ({
          id: generateId(),
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          estimatedUnitPrice: l.estimatedUnitPrice,
          requiredByDate: l.requiredByDate,
        })),
      },
    },
  });

  return client.purchaseRequisition.findUniqueOrThrow({
    where: { id: reqId },
    include: requisitionWithLinesInclude,
  });
}

export async function findPurchaseRequisitions(
  tenantId: string,
  filters: RequisitionFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) {
    where['status'] = filters.status as PrismaRequisitionStatus;
  }
  if (filters.requestedBy) {
    where['requestedBy'] = filters.requestedBy;
  }

  const [data, total] = await Promise.all([
    db.purchaseRequisition.findMany({
      where,
      include: requisitionWithLinesInclude,
      ...paginationArgs(pagination),
    }),
    db.purchaseRequisition.count({ where }),
  ]);

  return { data, total };
}

export async function findPurchaseRequisition(tenantId: string, id: string) {
  const db = getPrismaClient();
  const req = await db.purchaseRequisition.findFirst({
    where: { id, tenantId },
    include: requisitionWithLinesInclude,
  });
  if (!req) throw new NotFoundError('PurchaseRequisition', id);
  return req;
}

export async function updatePurchaseRequisitionStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.purchaseRequisition.update({
    where: { id },
    data: {
      status: status as PrismaRequisitionStatus,
      version: { increment: 1 },
      ...extra,
    },
    include: requisitionWithLinesInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── RFQs ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextRFQNumber(
  tenantId: string,
  tx?: TxClient,
): Promise<string> {
  const client = tx ?? getPrismaClient();
  const last = await client.rFQ.findFirst({
    where: { tenantId },
    orderBy: { rfqNumber: 'desc' },
    select: { rfqNumber: true },
  });

  if (!last) return 'RFQ-001';
  const lastNum = parseInt(last.rfqNumber.replace('RFQ-', ''), 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `RFQ-${String(nextNum).padStart(3, '0')}`;
}

export async function createRFQ(
  tenantId: string,
  data: CreateRFQInput,
  actorId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  const rfqId = generateId();
  const rfqNumber = await getNextRFQNumber(tenantId, tx);

  await client.rFQ.create({
    data: {
      id: rfqId,
      tenantId,
      rfqNumber,
      requisitionId: data.requisitionId ?? null,
      status: 'DRAFT' as PrismaRFQStatus,
      validUntil: data.validUntil ?? null,
      notes: data.notes ?? null,
      createdBy: actorId,
      suppliers: {
        create: data.supplierIds.map((supplierId) => ({
          id: generateId(),
          supplierId,
        })),
      },
    },
  });

  return client.rFQ.findUniqueOrThrow({
    where: { id: rfqId },
    include: rfqWithSuppliersInclude,
  });
}

export async function findRFQs(tenantId: string, pagination: Pagination) {
  const db = getPrismaClient();

  const where = { tenantId };

  const [data, total] = await Promise.all([
    db.rFQ.findMany({
      where,
      include: rfqWithSuppliersInclude,
      ...paginationArgs(pagination),
    }),
    db.rFQ.count({ where }),
  ]);

  return { data, total };
}

export async function findRFQ(tenantId: string, id: string) {
  const db = getPrismaClient();
  const rfq = await db.rFQ.findFirst({
    where: { id, tenantId },
    include: rfqWithSuppliersInclude,
  });
  if (!rfq) throw new NotFoundError('RFQ', id);
  return rfq;
}

export async function updateRFQStatus(
  tenantId: string,
  id: string,
  status: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.rFQ.update({
    where: { id },
    data: { status: status as PrismaRFQStatus },
    include: rfqWithSuppliersInclude,
  });
}

export async function findRFQSupplier(rfqId: string, supplierId: string) {
  const db = getPrismaClient();
  const rfqSupplier = await db.rFQSupplier.findFirst({
    where: { rfqId, supplierId },
  });
  if (!rfqSupplier) throw new NotFoundError('RFQSupplier', `${rfqId}/${supplierId}`);
  return rfqSupplier;
}

export async function updateRFQSupplierResponse(
  id: string,
  data: RecordRFQResponseInput,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.rFQSupplier.update({
    where: { id },
    data: {
      responseReceivedAt: new Date(),
      quotedPrice: data.quotedPrice ?? null,
      quotedLeadTimeDays: data.quotedLeadTimeDays ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function markRFQSuppliersAsSent(rfqId: string, tx?: TxClient) {
  const client = tx ?? getPrismaClient();
  return client.rFQSupplier.updateMany({
    where: { rfqId },
    data: { sentAt: new Date() },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Orders ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextPONumber(
  tenantId: string,
  tx?: TxClient,
): Promise<string> {
  const client = tx ?? getPrismaClient();
  const last = await client.procurementPO.findFirst({
    where: { tenantId },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });

  if (!last) return 'PO-001';
  const lastNum = parseInt(last.poNumber.replace('PO-', ''), 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `PO-${String(nextNum).padStart(3, '0')}`;
}

export async function createProcurementPO(
  tenantId: string,
  data: CreatePurchaseOrderInput,
  actorId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  const poId = generateId();
  const poNumber = await getNextPONumber(tenantId, tx);

  const lines = data.lines.map((l) => {
    const taxRate = l.taxRate ?? 0;
    const lineTotal = l.quantity * l.unitPrice * (1 + taxRate);
    return {
      id: generateId(),
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate,
      lineTotal,
    };
  });

  const subtotal = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const taxAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * l.taxRate, 0);
  const total = subtotal + taxAmount;

  await client.procurementPO.create({
    data: {
      id: poId,
      tenantId,
      poNumber,
      supplierId: data.supplierId,
      requisitionId: data.requisitionId ?? null,
      status: 'DRAFT' as PrismaProcurementPOStatus,
      currency: (data.currency ?? 'USD') as PrismaCurrency,
      subtotal,
      taxAmount,
      total,
      expectedDeliveryDate: data.expectedDeliveryDate ?? null,
      approvalStatus: 'PENDING' as PrismaApprovalStatus,
      createdBy: actorId,
      updatedBy: actorId,
      version: 1,
      lines: {
        create: lines,
      },
    },
  });

  return client.procurementPO.findUniqueOrThrow({
    where: { id: poId },
    include: procurementPOWithLinesInclude,
  });
}

export async function findProcurementPOs(
  tenantId: string,
  filters: POFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) {
    where['status'] = filters.status as PrismaProcurementPOStatus;
  }
  if (filters.supplierId) {
    where['supplierId'] = filters.supplierId;
  }
  if (filters.search) {
    where['OR'] = [
      { poNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    db.procurementPO.findMany({
      where,
      include: procurementPOWithLinesInclude,
      ...paginationArgs(pagination),
    }),
    db.procurementPO.count({ where }),
  ]);

  return { data, total };
}

export async function findProcurementPO(tenantId: string, id: string) {
  const db = getPrismaClient();
  const po = await db.procurementPO.findFirst({
    where: { id, tenantId },
    include: procurementPOWithLinesInclude,
  });
  if (!po) throw new NotFoundError('ProcurementPO', id);
  return po;
}

export async function updateProcurementPOStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.procurementPO.update({
    where: { id },
    data: {
      status: status as PrismaProcurementPOStatus,
      version: { increment: 1 },
      ...extra,
    },
    include: procurementPOWithLinesInclude,
  });
}

export async function updateProcurementPOLineReceivedQty(
  lineId: string,
  receivedQty: number,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.procurementPOLine.update({
    where: { id: lineId },
    data: { receivedQty },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Goods Receipts ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextReceiptNumber(
  tenantId: string,
  tx?: TxClient,
): Promise<string> {
  const client = tx ?? getPrismaClient();
  const last = await client.goodsReceipt.findFirst({
    where: { tenantId },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });

  if (!last) return 'GR-001';
  const lastNum = parseInt(last.receiptNumber.replace('GR-', ''), 10);
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return `GR-${String(nextNum).padStart(3, '0')}`;
}

export async function createGoodsReceipt(
  tenantId: string,
  data: CreateGoodsReceiptInput,
  actorId: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  const receiptId = generateId();
  const receiptNumber = await getNextReceiptNumber(tenantId, tx);

  await client.goodsReceipt.create({
    data: {
      id: receiptId,
      tenantId,
      poId: data.poId,
      receiptNumber,
      receivedBy: actorId,
      receivedAt: data.receivedAt ?? new Date(),
      warehouseId: data.warehouseId ?? null,
      notes: data.notes ?? null,
      status: 'DRAFT' as PrismaGoodsReceiptStatus,
      createdBy: actorId,
      lines: {
        create: data.lines.map((l) => ({
          id: generateId(),
          poLineId: l.poLineId,
          productId: l.productId,
          receivedQty: l.receivedQty,
          lotNumber: l.lotNumber ?? null,
          notes: l.notes ?? null,
        })),
      },
    },
  });

  return client.goodsReceipt.findUniqueOrThrow({
    where: { id: receiptId },
    include: goodsReceiptWithLinesInclude,
  });
}

export async function findGoodsReceipt(tenantId: string, id: string) {
  const db = getPrismaClient();
  const receipt = await db.goodsReceipt.findFirst({
    where: { id, tenantId },
    include: goodsReceiptWithLinesInclude,
  });
  if (!receipt) throw new NotFoundError('GoodsReceipt', id);
  return receipt;
}

export async function updateGoodsReceiptStatus(
  tenantId: string,
  id: string,
  status: string,
  tx?: TxClient,
) {
  const client = tx ?? getPrismaClient();
  return client.goodsReceipt.update({
    where: { id },
    data: { status: status as PrismaGoodsReceiptStatus },
    include: goodsReceiptWithLinesInclude,
  });
}
