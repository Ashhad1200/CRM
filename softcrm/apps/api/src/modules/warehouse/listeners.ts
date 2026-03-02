/**
 * Warehouse / WMS module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * that the Warehouse module needs to react to.
 *
 * Currently handles:
 *   - manufacturing.work_order.completed → receive production output into stock
 */

import type { DomainEvent } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';
import * as svc from './service.js';
import { WAREHOUSE_EVENTS } from './events.js';

// ── Payload types from external modules ───────────────────────────────────────

interface WorkOrderCompletedPayload {
  workOrderId: string;
  productId: string;
  warehouseId: string;
  locationId?: string | null;
  producedQty: number;
  lotNumber?: string | null;
  completedAt: string;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Handle manufacturing.work_order.completed event.
 * Receives the finished goods into warehouse stock as a RECEIPT move.
 */
export async function handleWorkOrderCompleted(
  event: DomainEvent<WorkOrderCompletedPayload>,
): Promise<void> {
  const { tenantId, actorId, payload } = event;

  try {
    if (!payload.producedQty || payload.producedQty <= 0) {
      logger.warn(
        { workOrderId: payload.workOrderId },
        'Work order completed event has zero quantity — skipping stock receipt',
      );
      return;
    }

    const lotNumber = payload.lotNumber ?? `WO-${payload.workOrderId}`;

    await svc.receiveStock(tenantId, {
      warehouseId: payload.warehouseId,
      locationId: payload.locationId ?? undefined,
      productId: payload.productId,
      lotNumber,
      quantity: payload.producedQty,
      sourceDocument: `WO-${payload.workOrderId}`,
      scheduledDate: new Date(payload.completedAt),
    }, actorId ?? 'system');

    logger.info(
      {
        workOrderId: payload.workOrderId,
        productId: payload.productId,
        qty: payload.producedQty,
      },
      'Production output received into warehouse stock',
    );
  } catch (error) {
    logger.error(
      { error, workOrderId: payload.workOrderId },
      'Failed to receive production output into warehouse',
    );
    throw error; // Re-throw so BullMQ can retry
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Register all warehouse event listeners against the event bus.
 * Called once during module bootstrap.
 */
export function registerWarehouseListeners(
  eventBus: {
    subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void;
  },
): void {
  eventBus.subscribe<WorkOrderCompletedPayload>(
    'manufacturing.work_order.completed',
    handleWorkOrderCompleted,
  );

  logger.info(
    { events: ['manufacturing.work_order.completed'] },
    'Warehouse event listeners registered',
  );
}

export { WAREHOUSE_EVENTS };
