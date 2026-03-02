/**
 * Manufacturing module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Inventory, Sales) that the Manufacturing module needs to react to.
 */

import { eventBus } from '../../infra/event-bus.js';
import { EventTypes } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

/**
 * Register all Manufacturing-module event listeners.
 * Call once during application bootstrap.
 */
export function registerManufacturingListeners(): void {
  eventBus.subscribe(EventTypes.STOCK_LOW, async (event) => {
    logger.info(
      { eventId: event.id, productId: event.aggregateId, payload: event.payload },
      'Stock low event received — consider triggering MRP run (TODO)',
    );
    // Future: auto-trigger an MRP run when stock drops below reorder point
  });

  eventBus.subscribe(EventTypes.ORDER_FULFILLED, async (event) => {
    logger.info(
      { eventId: event.id, payload: event.payload },
      'Order fulfilled event received — update production demand (TODO)',
    );
    // Future: adjust production plans based on fulfilled orders
  });
}
