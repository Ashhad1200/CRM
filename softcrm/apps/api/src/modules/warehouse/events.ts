/**
 * Warehouse / WMS module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows, projects them into full `DomainEvent` objects
 * and publishes them to the event bus (BullMQ). This guarantees at-least-once
 * delivery even if the process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Event type constants ───────────────────────────────────────────────────────

export const WAREHOUSE_EVENTS = {
  STOCK_RECEIVED: 'warehouse.stock.received',
  STOCK_MOVED: 'warehouse.stock.moved',
  PICK_LIST_COMPLETED: 'warehouse.pick_list.completed',
  SHIPMENT_DISPATCHED: 'warehouse.shipment.dispatched',
  CYCLE_COUNT_COMPLETED: 'warehouse.cycle_count.completed',
  STOCK_ADJUSTED: 'warehouse.stock.adjusted',
} as const;

export type WarehouseEventType = (typeof WAREHOUSE_EVENTS)[keyof typeof WAREHOUSE_EVENTS];

// ── Payload types ──────────────────────────────────────────────────────────────

export interface StockReceivedPayload {
  warehouseId: string;
  locationId: string | null;
  productId: string;
  lotId: string;
  lotNumber: string;
  quantity: number;
  sourceDocument: string | null;
}

export interface StockMovedPayload {
  warehouseId: string;
  productId: string;
  lotId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  moveId: string;
}

export interface PickListCompletedPayload {
  pickListId: string;
  warehouseId: string;
  sourceOrderId: string | null;
  sourceOrderType: string | null;
  lines: Array<{
    productId: string;
    locationId: string;
    lotId: string | null;
    requestedQty: number;
    pickedQty: number;
  }>;
}

export interface ShipmentDispatchedPayload {
  shipmentId: string;
  warehouseId: string;
  pickListId: string | null;
  sourceOrderId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string;
}

export interface CycleCountCompletedPayload {
  cycleCountId: string;
  warehouseId: string;
  locationId: string | null;
  discrepancies: Array<{
    productId: string;
    lotId: string | null;
    systemQty: number;
    countedQty: number;
    difference: number;
  }>;
}

export interface StockAdjustedPayload {
  warehouseId: string;
  productId: string;
  lotId: string | null;
  quantityDelta: number;
  reason: string;
  reference: string | null;
  moveId: string;
}

// ── Outbox helper ──────────────────────────────────────────────────────────────

interface OutboxPayload {
  tenantId: string;
  actorId: string;
  aggregateType: string;
  correlationId: string;
  data: unknown;
}

async function writeToOutbox(
  eventType: string,
  aggregateId: string,
  payload: OutboxPayload,
): Promise<void> {
  const db = getPrismaClient();
  await db.outbox.create({
    data: {
      id: generateId(),
      eventType,
      aggregateId,
      payload: payload as never,
      publishedAt: null,
    },
  });
}

// ── Event publishers ───────────────────────────────────────────────────────────

export async function publishStockReceived(
  tenantId: string,
  actorId: string,
  payload: StockReceivedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.STOCK_RECEIVED, payload.lotId, {
    tenantId,
    actorId,
    aggregateType: 'WHStockLot',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishStockMoved(
  tenantId: string,
  actorId: string,
  payload: StockMovedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.STOCK_MOVED, payload.moveId, {
    tenantId,
    actorId,
    aggregateType: 'WHStockMove',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishPickListCompleted(
  tenantId: string,
  actorId: string,
  payload: PickListCompletedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.PICK_LIST_COMPLETED, payload.pickListId, {
    tenantId,
    actorId,
    aggregateType: 'WHPickList',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishShipmentDispatched(
  tenantId: string,
  actorId: string,
  payload: ShipmentDispatchedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.SHIPMENT_DISPATCHED, payload.shipmentId, {
    tenantId,
    actorId,
    aggregateType: 'WHShipment',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishCycleCountCompleted(
  tenantId: string,
  actorId: string,
  payload: CycleCountCompletedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.CYCLE_COUNT_COMPLETED, payload.cycleCountId, {
    tenantId,
    actorId,
    aggregateType: 'WHCycleCount',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishStockAdjusted(
  tenantId: string,
  actorId: string,
  payload: StockAdjustedPayload,
): Promise<void> {
  await writeToOutbox(WAREHOUSE_EVENTS.STOCK_ADJUSTED, payload.moveId, {
    tenantId,
    actorId,
    aggregateType: 'WHStockMove',
    correlationId: generateId(),
    data: payload,
  });
}
