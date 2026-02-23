/**
 * Sales module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Accounting, Support) that the Sales module needs to react to.
 */

import { eventBus } from '../../infra/event-bus.js';
import { EventTypes } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

/**
 * Register all Sales-module event listeners.
 * Call once during application bootstrap.
 */
export function registerSalesListeners(): void {
  eventBus.subscribe(EventTypes.PAYMENT_RECEIVED, async (event) => {
    logger.info(
      { eventId: event.id, dealId: event.aggregateId, payload: event.payload },
      'Payment received — updating deal payment status (TODO)',
    );
    // Future: update deal payment status based on payment data
  });

  eventBus.subscribe(EventTypes.INVOICE_PAID, async (event) => {
    logger.info(
      { eventId: event.id, payload: event.payload },
      'Invoice paid — linking payment to deal (TODO)',
    );
    // Future: reconcile invoice payment with the associated deal
  });
}
