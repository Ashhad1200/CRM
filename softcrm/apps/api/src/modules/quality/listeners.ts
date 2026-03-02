/**
 * Quality Control module — event listeners.
 *
 * Listens to cross-module events and triggers automatic quality inspections:
 * - warehouse.stock.received  → auto-create INCOMING inspection
 * - manufacturing.work_order.completed → auto-create FINAL inspection
 */

import { eventBus } from '../../infra/event-bus.js';
import { logger } from '../../logger.js';
import { generateId } from '@softcrm/shared-kernel';
import type { DomainEvent } from '@softcrm/shared-kernel';
import * as repo from './repository.js';

// ── Event type constants (from warehouse and manufacturing modules) ─────────────

const WAREHOUSE_STOCK_RECEIVED = 'warehouse.stock.received';
const MANUFACTURING_WORK_ORDER_COMPLETED = 'manufacturing.work_order.completed';

// ── Payload shapes (loosely typed for cross-module compatibility) ──────────────

interface StockReceivedPayload {
  tenantId: string;
  productId?: string;
  supplierId?: string;
  referenceId?: string;
  quantity?: number;
}

interface WorkOrderCompletedPayload {
  tenantId: string;
  workOrderId: string;
  productId?: string;
  quantity?: number;
}

// ── Auto-inspection creation helpers ──────────────────────────────────────────

async function autoCreateInspection(
  tenantId: string,
  type: 'INCOMING' | 'FINAL',
  referenceId: string | null | undefined,
  referenceType: string,
  productId: string | null | undefined,
): Promise<void> {
  // Check if an active template exists for this inspection type
  const template = await repo.findActiveTemplateByType(tenantId, type);
  if (!template) {
    logger.debug(
      { tenantId, type },
      'No active inspection template found — skipping auto-inspection',
    );
    return;
  }

  const inspectionId = generateId();
  const inspectionNumber = await repo.getNextInspectionNumber(tenantId);

  await repo.createInspection(tenantId, {
    id: inspectionId,
    inspectionNumber,
    templateId: template.id,
    type,
    referenceId: referenceId ?? undefined,
    referenceType,
    productId: productId ?? undefined,
    inspectorId: tenantId, // placeholder — real assignment would come from configuration
    scheduledDate: new Date(),
    createdBy: 'system',
  });

  logger.info(
    { tenantId, inspectionId, inspectionNumber, type, referenceId },
    'Auto-created inspection',
  );
}

// ── Listener registration ──────────────────────────────────────────────────────

/**
 * Register quality module event listeners.
 *
 * - warehouse.stock.received → auto-create INCOMING inspection if template exists
 * - manufacturing.work_order.completed → auto-create FINAL inspection if template exists
 */
export function registerQualityListeners(): void {
  // ── Goods receipt → INCOMING inspection ─────────────────────────────────────
  eventBus.subscribe<StockReceivedPayload>(
    WAREHOUSE_STOCK_RECEIVED,
    async (event: DomainEvent<StockReceivedPayload>) => {
      const payload = event.payload;
      const tenantId = payload.tenantId ?? event.tenantId;

      try {
        await autoCreateInspection(
          tenantId,
          'INCOMING',
          payload.referenceId,
          'GoodsReceipt',
          payload.productId,
        );
      } catch (err) {
        logger.error(
          { err, eventId: event.id, tenantId },
          'Failed to auto-create INCOMING inspection from warehouse.stock.received',
        );
        // Do not rethrow — we don't want to block goods receipt processing
      }
    },
  );

  // ── Work order completed → FINAL inspection ──────────────────────────────────
  eventBus.subscribe<WorkOrderCompletedPayload>(
    MANUFACTURING_WORK_ORDER_COMPLETED,
    async (event: DomainEvent<WorkOrderCompletedPayload>) => {
      const payload = event.payload;
      const tenantId = payload.tenantId ?? event.tenantId;

      try {
        await autoCreateInspection(
          tenantId,
          'FINAL',
          payload.workOrderId,
          'WorkOrder',
          payload.productId,
        );
      } catch (err) {
        logger.error(
          { err, eventId: event.id, tenantId },
          'Failed to auto-create FINAL inspection from manufacturing.work_order.completed',
        );
        // Do not rethrow — we don't want to block work order completion
      }
    },
  );

  logger.info('Quality module event listeners registered');
}
