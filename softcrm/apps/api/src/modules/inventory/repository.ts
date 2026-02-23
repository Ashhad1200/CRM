/**
 * Inventory module — data-access layer (repository).
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

// Prisma enum type helpers — we extract enum types from the Prisma client
// to safely cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type ProductCreateInput = Parameters<PrismaClient['product']['create']>[0]['data'];
type PrismaTaxClass = NonNullable<ProductCreateInput>['taxClass'];
type PrismaCurrency = NonNullable<Parameters<PrismaClient['priceBook']['create']>[0]['data']>['currency'];
type PrismaSalesOrderStatus = NonNullable<Parameters<PrismaClient['salesOrder']['create']>[0]['data']>['status'];
type PrismaPurchaseOrderStatus = NonNullable<Parameters<PrismaClient['purchaseOrder']['create']>[0]['data']>['status'];
type PrismaApprovalStatus = NonNullable<Parameters<PrismaClient['purchaseOrder']['create']>[0]['data']>['approvalStatus'];
type PrismaStockAdjustmentReason = NonNullable<Parameters<PrismaClient['stockAdjustment']['create']>[0]['data']>['reason'];

import type {
  ProductFilters,
  OrderFilters,
  POFilters,
} from './types.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateWarehouseInput,
  CreateSalesOrderInput,
  CreatePurchaseOrderInput,
  CreatePriceBookInput,
  CreatePriceBookEntryInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ── Prisma include fragments ───────────────────────────────────────────────────

const productWithStockInclude = {
  stockLevels: {
    include: {
      warehouse: true,
    },
  },
} as const;

const salesOrderWithLinesInclude = {
  lines: {
    include: {
      product: {
        select: { id: true, sku: true, name: true, cost: true },
      },
    },
  },
} as const;

const purchaseOrderWithLinesInclude = {
  lines: {
    include: {
      product: {
        select: { id: true, sku: true, name: true },
      },
    },
  },
} as const;

const priceBookWithEntriesInclude = {
  entries: {
    include: {
      product: {
        select: { id: true, sku: true, name: true },
      },
    },
  },
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
// ── Products ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findProducts(
  tenantId: string,
  filters: ProductFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.isActive !== undefined) {
    where['isActive'] = filters.isActive;
  }
  if (filters.categoryId) {
    where['categoryId'] = filters.categoryId;
  }

  const [data, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productWithStockInclude,
      ...paginationArgs(pagination),
    }),
    db.product.count({ where }),
  ]);

  return { data, total };
}

export async function findProduct(tenantId: string, id: string) {
  const db = getPrismaClient();
  const product = await db.product.findFirst({
    where: { id, tenantId },
    include: productWithStockInclude,
  });
  if (!product) throw new NotFoundError('Product', id);
  return product;
}

export async function findProductBySku(tenantId: string, sku: string) {
  const db = getPrismaClient();
  return db.product.findFirst({
    where: { tenantId, sku },
  });
}

export async function createProduct(
  tenantId: string,
  data: CreateProductInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.product.create({
    data: {
      id: generateId(),
      tenantId,
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      unitPrice: data.unitPrice,
      cost: data.cost,
      taxClass: (data.taxClass ?? 'STANDARD') as PrismaTaxClass,
      categoryId: data.categoryId ?? null,
      isActive: true,
      version: 1,
    },
    include: productWithStockInclude,
  });
}

export async function updateProduct(
  tenantId: string,
  id: string,
  data: UpdateProductInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const existing = await db.product.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new NotFoundError('Product', id);
  if (existing.version !== data.version) {
    throw new ConflictError('Product has been modified by another user');
  }

  const { id: _id, version: _v, ...updateData } = data;

  return db.product.update({
    where: { id },
    data: {
      ...updateData,
      taxClass: updateData.taxClass ? (updateData.taxClass as PrismaTaxClass) : undefined,
      version: { increment: 1 },
    },
    include: productWithStockInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Price Books ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findPriceBooks(tenantId: string) {
  const db = getPrismaClient();
  return db.priceBook.findMany({
    where: { tenantId },
    include: priceBookWithEntriesInclude,
    orderBy: { name: 'asc' },
  });
}

export async function findPriceBook(tenantId: string, id: string) {
  const db = getPrismaClient();
  const priceBook = await db.priceBook.findFirst({
    where: { id, tenantId },
    include: priceBookWithEntriesInclude,
  });
  if (!priceBook) throw new NotFoundError('PriceBook', id);
  return priceBook;
}

export async function createPriceBook(
  tenantId: string,
  data: CreatePriceBookInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.priceBook.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      currency: (data.currency ?? 'USD') as PrismaCurrency,
      isDefault: data.isDefault ?? false,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
    },
    include: priceBookWithEntriesInclude,
  });
}

export async function createPriceBookEntry(
  tenantId: string,
  data: CreatePriceBookEntryInput,
  actorId: string,
) {
  const db = getPrismaClient();

  // Validate priceBook and product exist
  const priceBook = await db.priceBook.findFirst({
    where: { id: data.priceBookId, tenantId },
  });
  if (!priceBook) throw new NotFoundError('PriceBook', data.priceBookId);

  const product = await db.product.findFirst({
    where: { id: data.productId, tenantId },
  });
  if (!product) throw new NotFoundError('Product', data.productId);

  return db.priceBookEntry.create({
    data: {
      id: generateId(),
      tenantId,
      priceBookId: data.priceBookId,
      productId: data.productId,
      price: data.price,
    },
    include: {
      priceBook: true,
      product: { select: { id: true, sku: true, name: true } },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Warehouses ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findWarehouses(tenantId: string) {
  const db = getPrismaClient();
  return db.warehouse.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function findWarehouse(tenantId: string, id: string) {
  const db = getPrismaClient();
  const warehouse = await db.warehouse.findFirst({
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
  return db.warehouse.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      address: (data.address ?? {}) as never,
      isActive: true,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Levels ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findOrCreateStockLevel(
  tenantId: string,
  productId: string,
  warehouseId: string,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  let stockLevel = await client.stockLevel.findFirst({
    where: { tenantId, productId, warehouseId },
  });

  if (!stockLevel) {
    stockLevel = await client.stockLevel.create({
      data: {
        id: generateId(),
        tenantId,
        productId,
        warehouseId,
        quantity: 0,
        reservedQty: 0,
      },
    });
  }

  return stockLevel;
}

export async function adjustStockLevel(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantityDelta: number,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  const stockLevel = await findOrCreateStockLevel(tenantId, productId, warehouseId, tx);

  return client.stockLevel.update({
    where: { id: stockLevel.id },
    data: {
      quantity: { increment: quantityDelta },
    },
    include: { warehouse: true, product: true },
  });
}

export async function reserveStockLevel(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  const stockLevel = await findOrCreateStockLevel(tenantId, productId, warehouseId, tx);

  const available = Number(stockLevel.quantity) - Number(stockLevel.reservedQty);
  if (available < quantity) {
    throw new ValidationError(
      `Insufficient stock for product ${productId}. Available: ${available}, requested: ${quantity}`,
    );
  }

  return client.stockLevel.update({
    where: { id: stockLevel.id },
    data: {
      reservedQty: { increment: quantity },
    },
  });
}

export async function releaseStockLevel(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  const stockLevel = await findOrCreateStockLevel(tenantId, productId, warehouseId, tx);

  return client.stockLevel.update({
    where: { id: stockLevel.id },
    data: {
      reservedQty: { decrement: quantity },
    },
  });
}

export async function findLowStockLevels(tenantId: string, threshold: number = 10) {
  const db = getPrismaClient();
  return db.stockLevel.findMany({
    where: {
      tenantId,
      quantity: { lt: threshold },
    },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Adjustments ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createStockAdjustment(
  tenantId: string,
  data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason: string;
    reference?: Record<string, unknown>;
    createdBy: string;
  },
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.stockAdjustment.create({
    data: {
      id: generateId(),
      tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      reason: data.reason as PrismaStockAdjustmentReason,
      reference: (data.reference ?? {}) as never,
      createdBy: data.createdBy,
    },
  });
}

export async function findStockAdjustmentsByProduct(
  tenantId: string,
  productId: string,
) {
  const db = getPrismaClient();
  return db.stockAdjustment.findMany({
    where: { tenantId, productId },
    orderBy: { createdAt: 'desc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sales Orders ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextOrderNumber(tenantId: string, tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0]) {
  const client = tx ?? getPrismaClient();
  const last = await client.salesOrder.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  return (last?.orderNumber ?? 0) + 1;
}

export async function createSalesOrder(
  tenantId: string,
  data: {
    dealId?: string | null;
    contactId?: string | null;
    accountId?: string | null;
    status: string;
    notes?: string | null;
    subtotal: number;
    taxAmount: number;
    total: number;
    orderNumber: number;
    lines: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  },
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  const orderId = generateId();

  await client.salesOrder.create({
    data: {
      id: orderId,
      tenantId,
      orderNumber: data.orderNumber,
      dealId: data.dealId ?? null,
      contactId: data.contactId ?? null,
      accountId: data.accountId ?? null,
      status: data.status as PrismaSalesOrderStatus,
      notes: data.notes ?? null,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      total: data.total,
      version: 1,
      lines: {
        create: data.lines.map((line) => ({
          id: generateId(),
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          fulfilled: false,
        })),
      },
    },
  });

  return client.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: salesOrderWithLinesInclude,
  });
}

export async function findSalesOrders(
  tenantId: string,
  filters: OrderFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) {
    where['status'] = filters.status as PrismaSalesOrderStatus;
  }
  if (filters.dealId) {
    where['dealId'] = filters.dealId;
  }
  if (filters.search) {
    where['OR'] = [
      { orderNumber: { equals: parseInt(filters.search, 10) || -1 } },
    ];
  }

  const [data, total] = await Promise.all([
    db.salesOrder.findMany({
      where,
      include: salesOrderWithLinesInclude,
      ...paginationArgs(pagination),
    }),
    db.salesOrder.count({ where }),
  ]);

  return { data, total };
}

export async function findSalesOrder(tenantId: string, id: string) {
  const db = getPrismaClient();
  const order = await db.salesOrder.findFirst({
    where: { id, tenantId },
    include: salesOrderWithLinesInclude,
  });
  if (!order) throw new NotFoundError('SalesOrder', id);
  return order;
}

export async function updateSalesOrderStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.salesOrder.update({
    where: { id },
    data: {
      status: status as PrismaSalesOrderStatus,
      version: { increment: 1 },
      ...extra,
    },
    include: salesOrderWithLinesInclude,
  });
}

export async function markSalesOrderLineFulfilled(
  lineId: string,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.salesOrderLine.update({
    where: { id: lineId },
    data: { fulfilled: true },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Orders ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNextPONumber(tenantId: string, tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0]) {
  const client = tx ?? getPrismaClient();
  const last = await client.purchaseOrder.findFirst({
    where: { tenantId },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });
  return (last?.poNumber ?? 0) + 1;
}

export async function createPurchaseOrder(
  tenantId: string,
  data: {
    vendorName: string;
    status: string;
    approvalStatus: string;
    notes?: string | null;
    subtotal: number;
    total: number;
    poNumber: number;
    lines: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
    }>;
  },
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  const poId = generateId();

  await client.purchaseOrder.create({
    data: {
      id: poId,
      tenantId,
      poNumber: data.poNumber,
      vendorName: data.vendorName,
      status: data.status as PrismaPurchaseOrderStatus,
      approvalStatus: data.approvalStatus as PrismaApprovalStatus,
      notes: data.notes ?? null,
      subtotal: data.subtotal,
      total: data.total,
      version: 1,
      lines: {
        create: data.lines.map((line) => ({
          id: generateId(),
          productId: line.productId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          lineTotal: line.lineTotal,
          receivedQty: 0,
        })),
      },
    },
  });

  return client.purchaseOrder.findUniqueOrThrow({
    where: { id: poId },
    include: purchaseOrderWithLinesInclude,
  });
}

export async function findPurchaseOrders(
  tenantId: string,
  filters: POFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.status) {
    where['status'] = filters.status as PrismaPurchaseOrderStatus;
  }
  if (filters.vendorName) {
    where['vendorName'] = { contains: filters.vendorName, mode: 'insensitive' };
  }
  if (filters.search) {
    where['OR'] = [
      { vendorName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: purchaseOrderWithLinesInclude,
      ...paginationArgs(pagination),
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return { data, total };
}

export async function findPurchaseOrder(tenantId: string, id: string) {
  const db = getPrismaClient();
  const po = await db.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: purchaseOrderWithLinesInclude,
  });
  if (!po) throw new NotFoundError('PurchaseOrder', id);
  return po;
}

export async function approvePurchaseOrder(
  tenantId: string,
  id: string,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.purchaseOrder.update({
    where: { id },
    data: {
      approvalStatus: 'APPROVED' as const,
      status: 'APPROVED' as const,
      version: { increment: 1 },
    },
    include: purchaseOrderWithLinesInclude,
  });
}

export async function updatePurchaseOrderStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: Record<string, unknown>,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.purchaseOrder.update({
    where: { id },
    data: {
      status: status as PrismaPurchaseOrderStatus,
      version: { increment: 1 },
      ...extra,
    },
    include: purchaseOrderWithLinesInclude,
  });
}

export async function updatePOLineReceivedQty(
  lineId: string,
  receivedQty: number,
  tx?: Parameters<Parameters<ReturnType<typeof getPrismaClient>['$transaction']>[0]>[0],
) {
  const client = tx ?? getPrismaClient();
  return client.pOLine.update({
    where: { id: lineId },
    data: {
      receivedQty,
    },
  });
}
