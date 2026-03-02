/**
 * POS module — domain event constants and publishers.
 *
 * Events are written to the outbox table for reliable at-least-once delivery.
 * The outbox relay picks them up and publishes to the event bus (BullMQ).
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Event type constants ───────────────────────────────────────────────────────

export const POS_EVENTS = {
  ORDER_COMPLETED: 'pos.order.completed',
  ORDER_REFUNDED: 'pos.order.refunded',
  SESSION_OPENED: 'pos.session.opened',
  SESSION_CLOSED: 'pos.session.closed',
  KITCHEN_ORDER_READY: 'pos.kitchen_order.ready',
} as const;

export type POSEventType = (typeof POS_EVENTS)[keyof typeof POS_EVENTS];

// ── Outbox helper ─────────────────────────────────────────────────────────────

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

// ── Session events ─────────────────────────────────────────────────────────────

export async function publishSessionOpened(
  tenantId: string,
  actorId: string,
  session: { id: string; terminalId: string; cashierId: string; openedAt: Date },
): Promise<void> {
  await writeToOutbox(POS_EVENTS.SESSION_OPENED, session.id, {
    tenantId,
    actorId,
    aggregateType: 'POSSession',
    correlationId: generateId(),
    data: {
      sessionId: session.id,
      terminalId: session.terminalId,
      cashierId: session.cashierId,
      openedAt: session.openedAt.toISOString(),
    },
  });
}

export async function publishSessionClosed(
  tenantId: string,
  actorId: string,
  session: {
    id: string;
    terminalId: string;
    closedAt: Date | null;
    variance: unknown;
  },
): Promise<void> {
  await writeToOutbox(POS_EVENTS.SESSION_CLOSED, session.id, {
    tenantId,
    actorId,
    aggregateType: 'POSSession',
    correlationId: generateId(),
    data: {
      sessionId: session.id,
      terminalId: session.terminalId,
      closedAt: session.closedAt?.toISOString() ?? null,
      variance: session.variance,
    },
  });
}

// ── Order events ───────────────────────────────────────────────────────────────

export async function publishOrderCompleted(
  tenantId: string,
  actorId: string,
  order: {
    id: string;
    orderNumber: string;
    sessionId: string;
    total: unknown;
    currency: string;
    customerId: string | null;
    lines: Array<{
      productId: string;
      quantity: unknown;
      unitPrice: unknown;
    }>;
  },
): Promise<void> {
  await writeToOutbox(POS_EVENTS.ORDER_COMPLETED, order.id, {
    tenantId,
    actorId,
    aggregateType: 'POSOrder',
    correlationId: generateId(),
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId: order.sessionId,
      total: order.total,
      currency: order.currency,
      customerId: order.customerId ?? null,
      lines: order.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    },
  });
}

export async function publishOrderRefunded(
  tenantId: string,
  actorId: string,
  order: {
    id: string;
    orderNumber: string;
    total: unknown;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(POS_EVENTS.ORDER_REFUNDED, order.id, {
    tenantId,
    actorId,
    aggregateType: 'POSOrder',
    correlationId: generateId(),
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      reason: order.reason,
    },
  });
}

// ── Kitchen events ─────────────────────────────────────────────────────────────

export async function publishKitchenOrderReady(
  tenantId: string,
  actorId: string,
  kitchenOrder: {
    id: string;
    ticketNumber: string;
    orderId: string;
    tableId: string | null;
  },
): Promise<void> {
  await writeToOutbox(POS_EVENTS.KITCHEN_ORDER_READY, kitchenOrder.id, {
    tenantId,
    actorId,
    aggregateType: 'KitchenOrder',
    correlationId: generateId(),
    data: {
      kitchenOrderId: kitchenOrder.id,
      ticketNumber: kitchenOrder.ticketNumber,
      orderId: kitchenOrder.orderId,
      tableId: kitchenOrder.tableId ?? null,
    },
  });
}
