/**
 * Inventory module — business-logic / service layer.
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
  generateId,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult, DealWonPayload } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';

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
  ReceiveGoodsInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Products ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createProduct(
  tenantId: string,
  data: CreateProductInput,
  actorId: string,
) {
  // Validate SKU uniqueness within tenant
  const existing = await repo.findProductBySku(tenantId, data.sku);
  if (existing) {
    throw new ValidationError(`Product with SKU "${data.sku}" already exists`);
  }

  return repo.createProduct(tenantId, data, actorId);
}

export async function updateProduct(
  tenantId: string,
  id: string,
  data: UpdateProductInput,
  actorId: string,
) {
  return repo.updateProduct(tenantId, id, data, actorId);
}

export async function getProducts(
  tenantId: string,
  filters: ProductFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findProducts(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getProduct(tenantId: string, id: string) {
  return repo.findProduct(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Price Books ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPriceBooks(tenantId: string) {
  return repo.findPriceBooks(tenantId);
}

export async function createPriceBook(
  tenantId: string,
  data: CreatePriceBookInput,
  actorId: string,
) {
  return repo.createPriceBook(tenantId, data, actorId);
}

export async function createPriceBookEntry(
  tenantId: string,
  data: CreatePriceBookEntryInput,
  actorId: string,
) {
  return repo.createPriceBookEntry(tenantId, data, actorId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Warehouses ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWarehouses(tenantId: string) {
  return repo.findWarehouses(tenantId);
}

export async function createWarehouse(
  tenantId: string,
  data: CreateWarehouseInput,
  actorId: string,
) {
  return repo.createWarehouse(tenantId, data, actorId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Management ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

/**
 * Adjust stock level for a product at a warehouse.
 * Creates an adjustment record and updates the stock level.
 * Checks if stock falls below threshold and publishes STOCK_LOW event.
 */
export async function adjustStock(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  reason: string,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Create adjustment record
    await repo.createStockAdjustment(
      tenantId,
      {
        productId,
        warehouseId,
        quantity,
        reason,
        createdBy: actorId,
      },
      tx,
    );

    // Update stock level
    const updated = await repo.adjustStockLevel(
      tenantId,
      productId,
      warehouseId,
      quantity,
      tx,
    );

    // Check low stock threshold
    const currentQty = Number(updated.quantity);
    if (currentQty < DEFAULT_LOW_STOCK_THRESHOLD) {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
        select: { sku: true },
      });
      await events.publishStockLow(
        tenantId,
        productId,
        currentQty,
        DEFAULT_LOW_STOCK_THRESHOLD,
        product?.sku ?? '',
      );
    }

    return updated;
  });
}

/**
 * Reserve stock for a product at a warehouse.
 * Validates availability (quantity - reservedQty >= requested).
 */
export async function reserveStock(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    await repo.reserveStockLevel(tenantId, productId, warehouseId, quantity, tx);

    // Record the reservation as a stock adjustment
    await repo.createStockAdjustment(
      tenantId,
      {
        productId,
        warehouseId,
        quantity,
        reason: 'RESERVED',
        createdBy: 'system',
      },
      tx,
    );
  });
}

/**
 * Release previously reserved stock.
 */
export async function releaseStock(
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    await repo.releaseStockLevel(tenantId, productId, warehouseId, quantity, tx);

    await repo.createStockAdjustment(
      tenantId,
      {
        productId,
        warehouseId,
        quantity: -quantity,
        reason: 'RELEASED',
        createdBy: 'system',
      },
      tx,
    );
  });
}

/**
 * Check for low stock across all products and publish STOCK_LOW events.
 */
export async function checkLowStock(
  tenantId: string,
  threshold: number = DEFAULT_LOW_STOCK_THRESHOLD,
) {
  const lowStockLevels = await repo.findLowStockLevels(tenantId, threshold);

  for (const sl of lowStockLevels) {
    await events.publishStockLow(
      tenantId,
      sl.productId,
      Number(sl.quantity),
      threshold,
      sl.product.sku,
    );
  }

  return lowStockLevels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sales Orders ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a sales order from a won deal's products.
 * Reserves stock for each line item.
 */
export async function createSalesOrderFromDeal(
  tenantId: string,
  payload: DealWonPayload,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const orderNumber = await repo.getNextOrderNumber(tenantId, tx);

    const lines = payload.products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      unitPrice: Number(p.unitPrice),
      lineTotal: p.quantity * Number(p.unitPrice),
    }));

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    const order = await repo.createSalesOrder(
      tenantId,
      {
        dealId: payload.dealId,
        contactId: payload.contactId || null,
        accountId: payload.accountId || null,
        status: 'CONFIRMED',
        subtotal,
        taxAmount: 0,
        total: subtotal,
        orderNumber,
        lines,
      },
      tx,
    );

    // Reserve stock for each line — use first active warehouse
    const warehouses = await tx.warehouse.findMany({
      where: { tenantId, isActive: true },
      take: 1,
    });

    if (warehouses.length > 0) {
      for (const line of payload.products) {
        await repo.reserveStockLevel(
          tenantId,
          line.productId,
          warehouses[0]!.id,
          line.quantity,
          tx,
        );

        await repo.createStockAdjustment(
          tenantId,
          {
            productId: line.productId,
            warehouseId: warehouses[0]!.id,
            quantity: line.quantity,
            reason: 'RESERVED',
            createdBy: actorId,
          },
          tx,
        );
      }
    }

    return order;
  });
}

/**
 * Create a sales order manually.
 */
export async function createSalesOrder(
  tenantId: string,
  data: CreateSalesOrderInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const orderNumber = await repo.getNextOrderNumber(tenantId, tx);

    const lines = data.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
    }));

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    return repo.createSalesOrder(
      tenantId,
      {
        dealId: data.dealId ?? null,
        contactId: data.contactId ?? null,
        accountId: data.accountId ?? null,
        status: 'DRAFT',
        subtotal,
        taxAmount: 0,
        total: subtotal,
        orderNumber,
        lines,
      },
      tx,
    );
  });
}

export async function getSalesOrders(
  tenantId: string,
  filters: OrderFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findSalesOrders(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getSalesOrder(tenantId: string, id: string) {
  return repo.findSalesOrder(tenantId, id);
}

/**
 * Fulfill a sales order.
 * - Mark all lines as fulfilled
 * - Decrement stock (both quantity and reservedQty) for each line
 * - Publish ORDER_FULFILLED event with line costs for accounting COGS
 */
export async function fulfillOrder(
  tenantId: string,
  orderId: string,
  actorId: string,
) {
  const db = getPrismaClient();
  const order = await repo.findSalesOrder(tenantId, orderId);

  if (order.status === 'FULFILLED' as const) {
    throw new ValidationError('Order is already fulfilled');
  }
  if (order.status === 'CANCELLED' as const) {
    throw new ValidationError('Cannot fulfill a cancelled order');
  }

  return db.$transaction(async (tx) => {
    // Get first active warehouse for stock operations
    const warehouses = await tx.warehouse.findMany({
      where: { tenantId, isActive: true },
      take: 1,
    });

    for (const line of order.lines) {
      // Mark line fulfilled
      await repo.markSalesOrderLineFulfilled(line.id, tx);

      if (warehouses.length > 0) {
        const qty = Number(line.quantity);

        // Decrement actual stock
        await repo.adjustStockLevel(
          tenantId,
          line.productId,
          warehouses[0]!.id,
          -qty,
          tx,
        );

        // Release the reservation
        await repo.releaseStockLevel(
          tenantId,
          line.productId,
          warehouses[0]!.id,
          qty,
          tx,
        );

        // Record stock adjustment for the sale
        await repo.createStockAdjustment(
          tenantId,
          {
            productId: line.productId,
            warehouseId: warehouses[0]!.id,
            quantity: -qty,
            reason: 'SALE',
            createdBy: actorId,
          },
          tx,
        );
      }
    }

    // Update order status
    const fulfilledOrder = await repo.updateSalesOrderStatus(
      tenantId,
      orderId,
      'FULFILLED',
      { fulfilledAt: new Date() },
      tx,
    );

    // Publish ORDER_FULFILLED event with line costs for accounting COGS
    const lineDetails = order.lines.map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      cost: Number(l.product.cost),
      lineTotal: Number(l.lineTotal),
    }));

    await events.publishOrderFulfilled(tenantId, actorId, fulfilledOrder, lineDetails);

    return fulfilledOrder;
  });
}

/**
 * Cancel a sales order.
 * Releases any reserved stock and marks the order CANCELLED.
 */
export async function cancelOrder(
  tenantId: string,
  orderId: string,
  actorId: string,
) {
  const db = getPrismaClient();
  const order = await repo.findSalesOrder(tenantId, orderId);

  if (order.status === 'CANCELLED' as const) {
    throw new ValidationError('Order is already cancelled');
  }
  if (order.status === 'FULFILLED' as const) {
    throw new ValidationError('Cannot cancel a fulfilled order');
  }

  return db.$transaction(async (tx) => {
    // Release reserved stock for each line
    const warehouses = await tx.warehouse.findMany({
      where: { tenantId, isActive: true },
      take: 1,
    });

    if (warehouses.length > 0) {
      for (const line of order.lines) {
        if (!line.fulfilled) {
          await repo.releaseStockLevel(
            tenantId,
            line.productId,
            warehouses[0]!.id,
            Number(line.quantity),
            tx,
          );

          await repo.createStockAdjustment(
            tenantId,
            {
              productId: line.productId,
              warehouseId: warehouses[0]!.id,
              quantity: -Number(line.quantity),
              reason: 'RELEASED',
              createdBy: actorId,
            },
            tx,
          );
        }
      }
    }

    return repo.updateSalesOrderStatus(
      tenantId,
      orderId,
      'CANCELLED',
      { cancelledAt: new Date() },
      tx,
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Orders ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPurchaseOrder(
  tenantId: string,
  data: CreatePurchaseOrderInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const poNumber = await repo.getNextPONumber(tenantId, tx);

    const lines = data.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitCost: l.unitCost,
      lineTotal: l.quantity * l.unitCost,
    }));

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    return repo.createPurchaseOrder(
      tenantId,
      {
        vendorName: data.vendorName,
        status: 'DRAFT',
        approvalStatus: 'PENDING',
        subtotal,
        total: subtotal,
        poNumber,
        lines,
      },
      tx,
    );
  });
}

export async function getPurchaseOrders(
  tenantId: string,
  filters: POFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findPurchaseOrders(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getPurchaseOrder(tenantId: string, id: string) {
  return repo.findPurchaseOrder(tenantId, id);
}

/**
 * Approve a purchase order.
 * Sets approvalStatus to APPROVED and status to APPROVED.
 */
export async function approvePurchaseOrder(
  tenantId: string,
  poId: string,
  actorId: string,
) {
  const po = await repo.findPurchaseOrder(tenantId, poId);

  if (po.approvalStatus === 'APPROVED') {
    throw new ValidationError('Purchase order is already approved');
  }

  const db = getPrismaClient();
  return db.$transaction(async (tx) => {
    return repo.approvePurchaseOrder(tenantId, poId, tx);
  });
}

/**
 * Receive goods for a purchase order.
 * - Updates receivedQty on each PO line
 * - If all lines are fully received, marks PO as RECEIVED
 * - Increments stock for each received item
 * - Creates stock adjustment records
 */
export async function receiveGoods(
  tenantId: string,
  poId: string,
  lines: ReceiveGoodsInput['lines'],
  actorId: string,
) {
  const db = getPrismaClient();
  const po = await repo.findPurchaseOrder(tenantId, poId);

  if (po.status === 'CANCELLED' as const) {
    throw new ValidationError('Cannot receive goods for a cancelled PO');
  }

  return db.$transaction(async (tx) => {
    // Get first active warehouse
    const warehouses = await tx.warehouse.findMany({
      where: { tenantId, isActive: true },
      take: 1,
    });

    for (const lineInput of lines) {
      const poLine = po.lines.find((l) => l.id === lineInput.lineId);
      if (!poLine) {
        throw new NotFoundError('POLine', lineInput.lineId);
      }

      const newReceivedQty = Number(poLine.receivedQty) + lineInput.receivedQty;
      if (newReceivedQty > Number(poLine.quantity)) {
        throw new ValidationError(
          `Received quantity (${newReceivedQty}) exceeds ordered quantity (${Number(poLine.quantity)}) for line ${lineInput.lineId}`,
        );
      }

      await repo.updatePOLineReceivedQty(lineInput.lineId, newReceivedQty, tx);

      // Increment stock
      if (warehouses.length > 0) {
        await repo.adjustStockLevel(
          tenantId,
          poLine.productId,
          warehouses[0]!.id,
          lineInput.receivedQty,
          tx,
        );

        await repo.createStockAdjustment(
          tenantId,
          {
            productId: poLine.productId,
            warehouseId: warehouses[0]!.id,
            quantity: lineInput.receivedQty,
            reason: 'PURCHASE',
            createdBy: actorId,
          },
          tx,
        );
      }
    }

    // Check if all lines are fully received
    const updatedPO = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
      include: purchaseOrderWithLinesIncludeForTx,
    });

    const allReceived = updatedPO.lines.every(
      (l: { receivedQty: unknown; quantity: unknown }) =>
        Number(l.receivedQty) >= Number(l.quantity),
    );

    const someReceived = updatedPO.lines.some(
      (l: { receivedQty: unknown }) => Number(l.receivedQty) > 0,
    );

    let newStatus = po.status;
    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (someReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    }

    if (newStatus !== po.status) {
      return repo.updatePurchaseOrderStatus(
        tenantId,
        poId,
        newStatus,
        allReceived ? { receivedAt: new Date() } : {},
        tx,
      );
    }

    return repo.findPurchaseOrder(tenantId, poId);
  });
}

// Include fragment for transaction context
const purchaseOrderWithLinesIncludeForTx = {
  lines: {
    include: {
      product: {
        select: { id: true, sku: true, name: true },
      },
    },
  },
} as const;
