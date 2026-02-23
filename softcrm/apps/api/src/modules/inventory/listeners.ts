/**
 * Inventory module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Sales) that the Inventory module needs to react to.
 */

import type { DealWonPayload } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';
import * as svc from './service.js';

/**
 * Handle the deal.won event.
 * Creates a sales order from the deal's products and reserves stock.
 */
export async function handleDealWon(
  tenantId: string,
  actorId: string,
  payload: DealWonPayload,
): Promise<void> {
  try {
    if (!payload.products || payload.products.length === 0) {
      logger.warn(
        { dealId: payload.dealId },
        'Deal won event has no products — skipping sales order creation',
      );
      return;
    }

    await svc.createSalesOrderFromDeal(tenantId, payload, actorId);

    logger.info(
      { dealId: payload.dealId, productCount: payload.products.length },
      'Sales order auto-created from won deal',
    );
  } catch (error) {
    logger.error(
      { error, dealId: payload.dealId },
      'Failed to create sales order from won deal',
    );
  }
}

/**
 * Register all inventory event listeners.
 * Called during module initialization.
 */
export function registerInventoryListeners(): void {
  // Listeners are registered via the event bus (BullMQ).
  // The actual registration happens in the module bootstrap.
  // This is a placeholder for the event handler mapping.
}
