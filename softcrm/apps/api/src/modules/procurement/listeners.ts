/**
 * Procurement module — event listeners.
 *
 * Registers handlers for domain events published by this and other modules.
 * The GOODS_RECEIVED listener emits to the warehouse module to trigger a
 * stock receipt, and also triggers accounting to create an AP bill.
 */

import { logger } from '../../logger.js';
import { eventBus } from '../../infra/event-bus.js';
import { PROCUREMENT_EVENTS } from './events.js';

// ── Payload types ──────────────────────────────────────────────────────────────

interface GoodsReceivedLine {
  productId: string;
  receivedQty: number;
  lotNumber: string | null;
}

interface GoodsReceivedData {
  receiptId: string;
  receiptNumber: string;
  poId: string;
  warehouseId: string | null;
  receivedAt: string;
  lines: GoodsReceivedLine[];
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Handle the procurement.goods_received event.
 *
 * 1. Forwards to the warehouse module via a warehouse.stock_receipt event so
 *    physical stock is updated on the warehouse side.
 * 2. Forwards to the accounting module via an accounting.ap_bill_create event
 *    so an accounts-payable bill is created for the received goods.
 */
async function handleGoodsReceived(
  tenantId: string,
  actorId: string,
  data: GoodsReceivedData,
): Promise<void> {
  logger.info(
    { receiptId: data.receiptId, poId: data.poId, lineCount: data.lines.length },
    'Goods received — forwarding to warehouse and accounting',
  );

  // Emit warehouse stock receipt event
  await eventBus.publish({
    id: `${data.receiptId}-warehouse`,
    type: 'warehouse.stock_receipt',
    tenantId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      receiptId: data.receiptId,
      receiptNumber: data.receiptNumber,
      warehouseId: data.warehouseId,
      receivedAt: data.receivedAt,
      lines: data.lines.map((l) => ({
        productId: l.productId,
        quantity: l.receivedQty,
        lotNumber: l.lotNumber,
      })),
    },
  } as any);

  // Emit accounting AP bill creation event
  await eventBus.publish({
    id: `${data.receiptId}-accounting`,
    type: 'accounting.ap_bill_create',
    tenantId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      sourceType: 'GOODS_RECEIPT',
      sourceId: data.receiptId,
      poId: data.poId,
      receivedAt: data.receivedAt,
      lines: data.lines.map((l) => ({
        productId: l.productId,
        quantity: l.receivedQty,
      })),
    },
  } as any);
}

// ── Registration ───────────────────────────────────────────────────────────────

/**
 * Register all procurement event listeners on the event bus.
 * Call once during application bootstrap.
 */
export function registerProcurementListeners(): void {
  eventBus.subscribe<{ tenantId: string; actorId: string; data: GoodsReceivedData }>(
    PROCUREMENT_EVENTS.GOODS_RECEIVED,
    async (event) => {
      try {
        await handleGoodsReceived(
          event.tenantId,
          event.actorId,
          event.payload.data,
        );
      } catch (error) {
        logger.error(
          { error, receiptId: event.payload?.data?.receiptId },
          'Failed to handle goods_received event',
        );
        throw error;
      }
    },
  );

  logger.info('Procurement event listeners registered');
}
