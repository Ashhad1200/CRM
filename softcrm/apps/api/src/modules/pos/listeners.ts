/**
 * POS module — event listeners.
 *
 * Registers handlers on the event bus for events that the POS module
 * needs to react to.
 *
 * Currently handles:
 *   pos.order.completed → triggers inventory StockMove DELIVERY for each
 *   order line, so warehouse stock is decremented automatically.
 */

import { eventBus } from '../../infra/event-bus.js';
import { logger } from '../../logger.js';
import { POS_EVENTS } from './events.js';

// ── Payload shape for pos.order.completed ─────────────────────────────────────

interface OrderCompletedData {
  orderId: string;
  orderNumber: string;
  sessionId: string;
  total: string | number;
  currency: string;
  customerId: string | null;
  lines: Array<{
    productId: string;
    quantity: string | number;
    unitPrice: string | number;
  }>;
}

// ── Handler: inventory deduction on order completion ──────────────────────────

/**
 * When an order is completed, publish an inventory.stock_move event for each
 * order line. The inventory module listens for this event to create a DELIVERY
 * StockMove and decrement warehouse stock.
 *
 * This is a fire-and-forget cross-module integration via the event bus —
 * no direct import of the inventory module is required.
 */
async function handleOrderCompleted(
  tenantId: string,
  actorId: string,
  data: OrderCompletedData,
): Promise<void> {
  for (const line of data.lines) {
    await eventBus.publish({
      id: `${data.orderId}:${line.productId}:stock`,
      type: 'inventory.stock_move.delivery',
      tenantId,
      actorId,
      occurredAt: new Date().toISOString(),
      payload: {
        referenceType: 'POS_ORDER',
        referenceId: data.orderId,
        productId: line.productId,
        quantity: Number(line.quantity),
        direction: 'OUT',
        notes: `POS order ${data.orderNumber}`,
      },
    } as any);
  }

  logger.info(
    { orderId: data.orderId, lineCount: data.lines.length },
    'Inventory deduction events dispatched for completed POS order',
  );
}

/**
 * When an order is completed, publish an accounting journal entry event
 * so that revenue is recognised and cash/card account is debited.
 */
async function handleOrderCompletedAccounting(
  tenantId: string,
  actorId: string,
  data: OrderCompletedData,
): Promise<void> {
  await eventBus.publish({
    id: `${data.orderId}:journal`,
    type: 'accounting.journal_entry.pos_sale',
    tenantId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      referenceType: 'POS_ORDER',
      referenceId: data.orderId,
      orderNumber: data.orderNumber,
      total: Number(data.total),
      currency: data.currency,
    },
  } as any);

  logger.info(
    { orderId: data.orderId },
    'Accounting journal entry event dispatched for completed POS order',
  );
}

// ── Registration ───────────────────────────────────────────────────────────────

/**
 * Register all POS event listeners on the event bus.
 * Call once during application bootstrap (e.g. in server.ts after startWorker).
 */
export function registerListeners(): void {
  // Inventory deduction
  eventBus.subscribe<{ tenantId: string; actorId: string; data: OrderCompletedData }>(
    POS_EVENTS.ORDER_COMPLETED,
    async (event) => {
      try {
        await handleOrderCompleted(
          event.tenantId,
          event.actorId,
          event.payload as unknown as OrderCompletedData,
        );
      } catch (err) {
        logger.error({ err, eventId: event.id }, 'Failed to handle pos.order.completed (inventory)');
        throw err;
      }
    },
  );

  // Accounting journal entry
  eventBus.subscribe<{ tenantId: string; actorId: string; data: OrderCompletedData }>(
    POS_EVENTS.ORDER_COMPLETED,
    async (event) => {
      try {
        await handleOrderCompletedAccounting(
          event.tenantId,
          event.actorId,
          event.payload as unknown as OrderCompletedData,
        );
      } catch (err) {
        logger.error({ err, eventId: event.id }, 'Failed to handle pos.order.completed (accounting)');
        throw err;
      }
    },
  );

  logger.info('POS event listeners registered');
}
