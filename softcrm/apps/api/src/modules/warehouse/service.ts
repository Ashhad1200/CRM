/**
 * Warehouse / WMS module — business-logic / service layer.
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
  WarehouseFilters,
  LocationFilters,
  StockLotFilters,
  StockLevelFilters,
  StockMoveFilters,
  PickListFilters,
  ShipmentFilters,
  CycleCountFilters,
  CycleCountDiscrepancy,
} from './types.js';
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateLocationInput,
  UpdateLocationInput,
  ReceiveStockInput,
  MoveStockInput,
  AdjustStockInput,
  CreatePickListInput,
  AssignPickListInput,
  CompletePickListInput,
  CreateShipmentInput,
  DispatchShipmentInput,
  CreateCycleCountInput,
  CompleteCycleCountInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Warehouses ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWarehouses(
  tenantId: string,
  filters: WarehouseFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findWarehouses(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getWarehouse(tenantId: string, id: string) {
  return repo.findWarehouse(tenantId, id);
}

export async function createWarehouse(
  tenantId: string,
  data: CreateWarehouseInput,
  actorId: string,
) {
  return repo.createWarehouse(tenantId, data, actorId);
}

export async function updateWarehouse(
  tenantId: string,
  id: string,
  data: UpdateWarehouseInput,
) {
  return repo.updateWarehouse(tenantId, id, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Locations ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLocations(
  tenantId: string,
  warehouseId: string,
  filters: LocationFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  // Validate warehouse belongs to tenant
  await repo.findWarehouse(tenantId, warehouseId);

  const { data, total } = await repo.findLocations(tenantId, warehouseId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function createLocation(
  tenantId: string,
  warehouseId: string,
  data: CreateLocationInput,
) {
  // Validate warehouse belongs to tenant
  await repo.findWarehouse(tenantId, warehouseId);
  return repo.createLocation(tenantId, warehouseId, data);
}

export async function updateLocation(
  tenantId: string,
  id: string,
  data: UpdateLocationInput,
) {
  return repo.updateLocation(tenantId, id, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Levels ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get aggregated stock levels. Optionally filtered by productId, warehouseId,
 * or locationId. Returns available, reserved, and total quantities per
 * product/warehouse/location combination.
 */
export async function getStockLevels(
  tenantId: string,
  filters: StockLevelFilters,
) {
  return repo.getAggregatedStockLevels(tenantId, filters);
}

export async function getStockLots(
  tenantId: string,
  filters: StockLotFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findStockLots(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock Operations ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Receive stock into the warehouse.
 * Creates a StockLot and a RECEIPT StockMove, then emits STOCK_RECEIVED.
 */
export async function receiveStock(
  tenantId: string,
  data: ReceiveStockInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Validate warehouse exists and is active
    const warehouse = await repo.findWarehouse(tenantId, data.warehouseId);
    if (warehouse.status === 'INACTIVE') {
      throw new ValidationError(`Warehouse "${warehouse.name}" is inactive`);
    }

    const now = new Date();
    const scheduledDate = data.scheduledDate ?? now;

    // Create stock lot
    const lot = await repo.createStockLot(
      tenantId,
      {
        productId: data.productId,
        warehouseId: data.warehouseId,
        locationId: data.locationId ?? null,
        lotNumber: data.lotNumber,
        serialNumber: data.serialNumber ?? null,
        quantity: data.quantity,
        expiryDate: data.expiryDate ?? null,
        receivedAt: now,
      },
      tx,
    );

    // Generate move reference
    const reference = await repo.generateMoveReference(tenantId, 'RCV', tx);

    // Create RECEIPT stock move
    const move = await repo.createStockMove(
      tenantId,
      {
        reference,
        moveType: 'RECEIPT',
        productId: data.productId,
        warehouseId: data.warehouseId,
        lotId: lot.id,
        fromLocationId: null,
        toLocationId: data.locationId ?? null,
        plannedQty: data.quantity,
        doneQty: data.quantity,
        status: 'DONE',
        sourceDocument: data.sourceDocument ?? null,
        scheduledDate,
        doneDate: now,
        createdBy: actorId,
      },
      tx,
    );

    // Emit STOCK_RECEIVED event (outside tx — outbox pattern handles delivery)
    await events.publishStockReceived(tenantId, actorId, {
      warehouseId: data.warehouseId,
      locationId: data.locationId ?? null,
      productId: data.productId,
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      quantity: data.quantity,
      sourceDocument: data.sourceDocument ?? null,
    });

    return { lot, move };
  });
}

/**
 * Move stock between locations within the same warehouse.
 * Creates an INTERNAL StockMove and updates the lot's locationId.
 */
export async function moveStock(
  tenantId: string,
  data: MoveStockInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const lot = await repo.findStockLot(tenantId, data.lotId, tx);

    const availableQty = Number(lot.quantity) - Number(lot.reservedQty);
    if (availableQty < data.quantity) {
      throw new ValidationError(
        `Insufficient available quantity. Available: ${availableQty}, requested: ${data.quantity}`,
      );
    }

    if (lot.warehouseId !== data.warehouseId) {
      throw new ValidationError('Stock lot does not belong to the specified warehouse');
    }

    const reference = await repo.generateMoveReference(tenantId, 'INT', tx);

    const move = await repo.createStockMove(
      tenantId,
      {
        reference,
        moveType: 'INTERNAL',
        productId: lot.productId,
        warehouseId: data.warehouseId,
        lotId: lot.id,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        plannedQty: data.quantity,
        doneQty: data.quantity,
        status: 'DONE',
        sourceDocument: data.sourceDocument ?? null,
        scheduledDate: new Date(),
        doneDate: new Date(),
        createdBy: actorId,
      },
      tx,
    );

    // Update lot location
    await repo.updateStockLotLocation(lot.id, data.toLocationId, tx);

    // Emit STOCK_MOVED event
    await events.publishStockMoved(tenantId, actorId, {
      warehouseId: data.warehouseId,
      productId: lot.productId,
      lotId: lot.id,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      quantity: data.quantity,
      moveId: move.id,
    });

    return { move, lot };
  });
}

/**
 * Manually adjust stock quantity for a lot.
 * Creates an ADJUSTMENT StockMove and updates the lot quantity.
 * Emits STOCK_ADJUSTED event.
 */
export async function adjustStock(
  tenantId: string,
  data: AdjustStockInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Find an available lot for the product, or use explicit lotId
    let lotId = data.lotId;

    if (!lotId) {
      const lots = await tx.wHStockLot.findMany({
        where: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          ...(data.locationId ? { locationId: data.locationId } : {}),
          status: 'AVAILABLE',
        },
        orderBy: { receivedAt: 'asc' },
        take: 1,
      });

      if (lots.length === 0 && data.quantityDelta > 0) {
        // No existing lot — create a new one for positive adjustment
        const newLot = await repo.createStockLot(
          tenantId,
          {
            productId: data.productId,
            warehouseId: data.warehouseId,
            locationId: data.locationId ?? null,
            lotNumber: `ADJ-${Date.now()}`,
            quantity: 0,
            receivedAt: new Date(),
          },
          tx,
        );
        lotId = newLot.id;
      } else if (lots.length === 0) {
        throw new ValidationError('No stock lot found for this product/location combination');
      } else {
        lotId = lots[0]!.id;
      }
    }

    const lot = await repo.findStockLot(tenantId, lotId, tx);

    const newQty = Number(lot.quantity) + data.quantityDelta;
    if (newQty < 0) {
      throw new ValidationError(
        `Adjustment would result in negative quantity (current: ${Number(lot.quantity)}, delta: ${data.quantityDelta})`,
      );
    }

    // Update lot quantity
    await repo.updateStockLotQuantity(lot.id, data.quantityDelta, tx);

    const reference = await repo.generateMoveReference(tenantId, 'ADJ', tx);

    const move = await repo.createStockMove(
      tenantId,
      {
        reference,
        moveType: 'ADJUSTMENT',
        productId: data.productId,
        warehouseId: data.warehouseId,
        lotId: lot.id,
        fromLocationId: data.quantityDelta < 0 ? (data.locationId ?? null) : null,
        toLocationId: data.quantityDelta > 0 ? (data.locationId ?? null) : null,
        plannedQty: Math.abs(data.quantityDelta),
        doneQty: Math.abs(data.quantityDelta),
        status: 'DONE',
        sourceDocument: data.reference ?? null,
        scheduledDate: new Date(),
        doneDate: new Date(),
        createdBy: actorId,
      },
      tx,
    );

    await events.publishStockAdjusted(tenantId, actorId, {
      warehouseId: data.warehouseId,
      productId: data.productId,
      lotId: lot.id,
      quantityDelta: data.quantityDelta,
      reason: data.reason,
      reference: data.reference ?? null,
      moveId: move.id,
    });

    return { lot, move };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Pick Lists ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPickLists(
  tenantId: string,
  filters: PickListFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findPickLists(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getPickList(tenantId: string, id: string) {
  return repo.findPickList(tenantId, id);
}

/**
 * Create a pick list, optionally linked to a sales or work order.
 * Validates that each specified lot has sufficient available quantity.
 */
export async function createPickList(
  tenantId: string,
  data: CreatePickListInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Validate warehouse
    await repo.findWarehouse(tenantId, data.warehouseId);

    // Validate lots have available qty
    for (const line of data.lines) {
      if (line.lotId) {
        const lot = await repo.findStockLot(tenantId, line.lotId, tx);
        const available = Number(lot.quantity) - Number(lot.reservedQty);
        if (available < line.requestedQty) {
          throw new ValidationError(
            `Insufficient quantity in lot ${lot.lotNumber}. Available: ${available}, requested: ${line.requestedQty}`,
          );
        }
      }
    }

    return repo.createPickList(tenantId, data, actorId, tx);
  });
}

/**
 * Assign a pick list to a picker (worker).
 */
export async function assignPickList(
  tenantId: string,
  id: string,
  data: AssignPickListInput,
) {
  const pickList = await repo.findPickList(tenantId, id);

  if (pickList.status === 'COMPLETED' || pickList.status === 'CANCELLED') {
    throw new ValidationError(`Cannot assign a pick list in status "${pickList.status}"`);
  }

  return repo.updatePickListStatus(id, 'ASSIGNED', { assignedTo: data.assignedTo });
}

/**
 * Complete a pick list.
 * - Updates each line with picked quantity and status
 * - Deducts reservedQty from lots
 * - Emits PICK_LIST_COMPLETED event
 */
export async function completePickList(
  tenantId: string,
  id: string,
  data: CompletePickListInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const pickList = await repo.findPickList(tenantId, id);

  if (pickList.status === 'COMPLETED') {
    throw new ValidationError('Pick list is already completed');
  }
  if (pickList.status === 'CANCELLED') {
    throw new ValidationError('Cannot complete a cancelled pick list');
  }

  return db.$transaction(async (tx) => {
    const updatedLines: Array<{
      productId: string;
      locationId: string;
      lotId: string | null;
      requestedQty: number;
      pickedQty: number;
    }> = [];

    for (const lineInput of data.lines) {
      const line = pickList.lines.find((l) => l.id === lineInput.lineId);
      if (!line) {
        throw new NotFoundError('PickListLine', lineInput.lineId);
      }

      const requestedQty = Number(line.requestedQty);
      const pickedQty = lineInput.pickedQty;

      let lineStatus: 'PENDING' | 'PARTIAL' | 'DONE' = 'PENDING';
      if (pickedQty >= requestedQty) {
        lineStatus = 'DONE';
      } else if (pickedQty > 0) {
        lineStatus = 'PARTIAL';
      }

      await repo.updatePickListLine(line.id, pickedQty, lineStatus, tx);

      // If lot is linked, deduct reserved qty and reduce quantity
      if (line.lotId && pickedQty > 0) {
        const lot = await repo.findStockLot(tenantId, line.lotId, tx);
        const currentReserved = Number(lot.reservedQty);
        const deductReserved = Math.min(pickedQty, currentReserved);

        if (deductReserved > 0) {
          await repo.updateStockLotReserved(lot.id, -deductReserved, tx);
        }

        // Physically deduct from lot quantity (stock leaving the warehouse)
        await repo.updateStockLotQuantity(lot.id, -pickedQty, tx);
      }

      updatedLines.push({
        productId: line.productId,
        locationId: line.locationId,
        lotId: line.lotId,
        requestedQty,
        pickedQty,
      });
    }

    const completed = await repo.updatePickListStatus(id, 'COMPLETED', {}, tx);

    // Emit PICK_LIST_COMPLETED event
    await events.publishPickListCompleted(tenantId, actorId, {
      pickListId: pickList.id,
      warehouseId: pickList.warehouseId,
      sourceOrderId: pickList.sourceOrderId,
      sourceOrderType: pickList.sourceOrderType,
      lines: updatedLines,
    });

    return completed;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Shipments ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getShipments(
  tenantId: string,
  filters: ShipmentFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findShipments(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getShipment(tenantId: string, id: string) {
  return repo.findShipment(tenantId, id);
}

export async function createShipment(
  tenantId: string,
  data: CreateShipmentInput,
  actorId: string,
) {
  // Validate warehouse
  await repo.findWarehouse(tenantId, data.warehouseId);

  // If linked to a pick list, validate it exists and belongs to this tenant
  if (data.pickListId) {
    const pickList = await repo.findPickList(tenantId, data.pickListId);
    if (pickList.status !== 'COMPLETED') {
      throw new ValidationError('Pick list must be completed before creating a shipment');
    }
  }

  return repo.createShipment(tenantId, data, actorId);
}

/**
 * Dispatch a shipment.
 * - Marks shipment as SHIPPED with dispatch details
 * - Emits SHIPMENT_DISPATCHED event (which downstream listeners use to update
 *   associated sales order status)
 */
export async function dispatchShipment(
  tenantId: string,
  id: string,
  data: DispatchShipmentInput,
  actorId: string,
) {
  const shipment = await repo.findShipment(tenantId, id);

  if (shipment.status !== 'PENDING') {
    throw new ValidationError(
      `Shipment cannot be dispatched from status "${shipment.status}". Must be PENDING.`,
    );
  }

  const shippedAt = data.shippedAt ?? new Date();

  const updated = await repo.updateShipmentStatus(id, 'SHIPPED', {
    shippedAt,
    carrier: data.carrier ?? shipment.carrier,
    trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
    status: 'SHIPPED',
  });

  // Look up sourceOrderId if linked pick list has one
  let sourceOrderId: string | null = null;
  if (shipment.pickListId) {
    try {
      const pickList = await repo.findPickList(tenantId, shipment.pickListId);
      sourceOrderId = pickList.sourceOrderId;
    } catch {
      // Pick list lookup failure should not block dispatch
    }
  }

  // Emit SHIPMENT_DISPATCHED event — downstream listeners (sales module, etc.)
  // react to this to update order status
  await events.publishShipmentDispatched(tenantId, actorId, {
    shipmentId: shipment.id,
    warehouseId: shipment.warehouseId,
    pickListId: shipment.pickListId,
    sourceOrderId,
    carrier: data.carrier ?? (shipment.carrier as string | null) ?? null,
    trackingNumber: data.trackingNumber ?? (shipment.trackingNumber as string | null) ?? null,
    shippedAt: shippedAt.toISOString(),
  });

  return updated;
}

export async function updateShipment(
  tenantId: string,
  id: string,
  data: Partial<CreateShipmentInput>,
) {
  const shipment = await repo.findShipment(tenantId, id);

  if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
    throw new ValidationError(`Cannot update a shipment in status "${shipment.status}"`);
  }

  return repo.updateShipmentStatus(id, shipment.status as string, {
    carrier: data.carrier ?? shipment.carrier,
    trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
    estimatedDelivery: data.estimatedDelivery ?? shipment.estimatedDelivery,
    recipientName: data.recipientName ?? shipment.recipientName,
    recipientAddress: data.recipientAddress
      ? (data.recipientAddress as never)
      : shipment.recipientAddress,
    weight: data.weight ?? shipment.weight,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Cycle Counts ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCycleCounts(
  tenantId: string,
  filters: CycleCountFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findCycleCounts(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function createCycleCount(
  tenantId: string,
  data: CreateCycleCountInput,
  actorId: string,
) {
  // Validate warehouse
  await repo.findWarehouse(tenantId, data.warehouseId);

  return repo.createCycleCount(tenantId, data, actorId);
}

/**
 * Complete a cycle count.
 * - Compares counted quantities vs system quantities (available lot qty)
 * - For each discrepancy, creates an ADJUSTMENT StockMove
 * - Stores discrepancy summary on the cycle count record
 * - Emits CYCLE_COUNT_COMPLETED event
 */
export async function completeCycleCount(
  tenantId: string,
  id: string,
  data: CompleteCycleCountInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const cycleCount = await repo.findCycleCount(tenantId, id);

  if (cycleCount.status === 'COMPLETED') {
    throw new ValidationError('Cycle count is already completed');
  }

  return db.$transaction(async (tx) => {
    const discrepancies: CycleCountDiscrepancy[] = [];

    for (const count of data.counts) {
      // Get system quantity for this product/lot combination
      let systemQty = 0;
      const lotsWhere: Record<string, unknown> = {
        tenantId,
        productId: count.productId,
        warehouseId: cycleCount.warehouseId,
        status: 'AVAILABLE',
      };
      if (count.lotId) {
        lotsWhere['id'] = count.lotId;
      }
      if (cycleCount.locationId) {
        lotsWhere['locationId'] = cycleCount.locationId;
      }

      const systemLots = await tx.wHStockLot.findMany({
        where: lotsWhere,
        select: { quantity: true },
      });
      systemQty = systemLots.reduce((sum, l) => sum + Number(l.quantity), 0);

      const difference = count.countedQty - systemQty;

      if (difference !== 0) {
        discrepancies.push({
          productId: count.productId,
          lotId: count.lotId ?? null,
          systemQty,
          countedQty: count.countedQty,
          difference,
        });

        // Create adjustment move for discrepancy
        const reference = await repo.generateMoveReference(tenantId, 'CC', tx);
        await repo.createStockMove(
          tenantId,
          {
            reference,
            moveType: 'ADJUSTMENT',
            productId: count.productId,
            warehouseId: cycleCount.warehouseId,
            lotId: count.lotId ?? null,
            fromLocationId: difference < 0 ? cycleCount.locationId : null,
            toLocationId: difference > 0 ? cycleCount.locationId : null,
            plannedQty: Math.abs(difference),
            doneQty: Math.abs(difference),
            status: 'DONE',
            sourceDocument: `CC-${id}`,
            scheduledDate: new Date(),
            doneDate: new Date(),
            createdBy: actorId,
          },
          tx,
        );

        // Update lot quantity for the discrepancy
        if (count.lotId) {
          await repo.updateStockLotQuantity(count.lotId, difference, tx);
        } else if (difference > 0 && systemLots.length === 0) {
          // Positive adjustment with no existing lot — create one
          const lotNumber = `CC-${id}-${count.productId}`;
          await repo.createStockLot(
            tenantId,
            {
              productId: count.productId,
              warehouseId: cycleCount.warehouseId,
              locationId: cycleCount.locationId,
              lotNumber,
              quantity: difference,
              receivedAt: new Date(),
            },
            tx,
          );
        }
      }
    }

    // Complete the cycle count with discrepancies
    const completedAt = new Date();
    const completed = await repo.updateCycleCountStatus(id, 'COMPLETED', {
      completedAt,
      discrepancies: discrepancies as never,
    }, tx);

    // Emit CYCLE_COUNT_COMPLETED event
    await events.publishCycleCountCompleted(tenantId, actorId, {
      cycleCountId: cycleCount.id,
      warehouseId: cycleCount.warehouseId,
      locationId: cycleCount.locationId,
      discrepancies,
    });

    return completed;
  });
}
