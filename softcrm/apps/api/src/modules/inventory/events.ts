/**
 * Inventory module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
import type { StockLowPayload } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Order events ───────────────────────────────────────────────────────────────

export async function publishOrderFulfilled(
  tenantId: string,
  actorId: string,
  order: { id: string; orderNumber: number; total: unknown },
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    cost: number;
    lineTotal: number;
  }>,
): Promise<void> {
  await writeToOutbox(EventTypes.ORDER_FULFILLED, order.id, {
    tenantId,
    actorId,
    aggregateType: 'SalesOrder',
    correlationId: generateId(),
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      lines,
    },
  });
}

// ── Stock events ───────────────────────────────────────────────────────────────

export async function publishStockLow(
  tenantId: string,
  productId: string,
  currentLevel: number,
  reorderPoint: number,
  sku: string,
): Promise<void> {
  const payload: StockLowPayload = {
    productId,
    currentLevel,
    reorderPoint,
    sku,
  };

  await writeToOutbox(EventTypes.STOCK_LOW, productId, {
    tenantId,
    actorId: 'system',
    aggregateType: 'StockLevel',
    correlationId: generateId(),
    data: payload,
  });
}
