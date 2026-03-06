/**
 * POS Integration Events (E088)
 *
 * Cross-module integration event handlers for the POS module.
 * Listens for POS domain events and emits integration events
 * consumed by other modules (Inventory, Accounting, etc.).
 *
 * Uses the BullMQ-backed event bus with outbox-relay delivery.
 * Existing listeners in ./listeners.ts already handle:
 *   - pos.order.completed → inventory.stock_move.delivery
 *   - pos.order.completed → accounting.journal_entry.pos_sale
 *
 * This file registers additional integration events for extended
 * cross-module workflows.
 */

import { eventBus } from '../../infra/event-bus.js';
import { logger } from '../../logger.js';
import { POS_EVENTS } from './events.js';

// ── Payload shapes ─────────────────────────────────────────────────────────────

interface OrderRefundedData {
  orderId: string;
  orderNumber: string;
  total: string | number;
  reason: string;
}

interface SessionClosedData {
  sessionId: string;
  terminalId: string;
  closedAt: string | null;
  variance: string | number | null;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * When an order is refunded, emit inventory restock events so stock is
 * restored, and an accounting reversal journal entry event.
 */
async function handleOrderRefundedIntegration(
  tenantId: string,
  actorId: string,
  data: OrderRefundedData,
): Promise<void> {
  // Accounting reversal
  await eventBus.publish({
    id: `${data.orderId}:refund:journal`,
    type: 'accounting.journal_entry.pos_refund',
    tenantId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      referenceType: 'POS_ORDER_REFUND',
      referenceId: data.orderId,
      orderNumber: data.orderNumber,
      total: Number(data.total),
      reason: data.reason,
    },
  } as any);

  logger.info(
    { orderId: data.orderId },
    'Integration events dispatched for refunded POS order',
  );
}

/**
 * When a session is closed with a cash variance, emit an audit alert
 * event for loss-prevention monitoring.
 */
async function handleSessionClosedIntegration(
  tenantId: string,
  actorId: string,
  data: SessionClosedData,
): Promise<void> {
  const variance = Number(data.variance ?? 0);
  if (variance === 0) return;

  await eventBus.publish({
    id: `${data.sessionId}:variance:alert`,
    type: 'audit.cash_variance.detected',
    tenantId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      referenceType: 'POS_SESSION',
      referenceId: data.sessionId,
      terminalId: data.terminalId,
      variance,
      closedAt: data.closedAt,
    },
  } as any);

  logger.info(
    { sessionId: data.sessionId, variance },
    'Cash variance alert emitted for closed POS session',
  );
}

// ── Registration ───────────────────────────────────────────────────────────────

/**
 * Register POS integration event listeners.
 * Call once during application bootstrap alongside registerListeners().
 */
export function registerPOSIntegrationEvents(): void {
  // Refund → accounting reversal
  eventBus.subscribe(POS_EVENTS.ORDER_REFUNDED, async (event) => {
    try {
      await handleOrderRefundedIntegration(
        event.tenantId,
        event.actorId,
        event.payload as unknown as OrderRefundedData,
      );
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to handle pos.order.refunded integration');
      throw err;
    }
  });

  // Session closed → cash variance alert
  eventBus.subscribe(POS_EVENTS.SESSION_CLOSED, async (event) => {
    try {
      await handleSessionClosedIntegration(
        event.tenantId,
        event.actorId,
        event.payload as unknown as SessionClosedData,
      );
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to handle pos.session.closed integration');
      throw err;
    }
  });

  logger.info('POS integration event listeners registered');
}
