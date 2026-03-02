/**
 * HR & Payroll module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * that the HR module needs to react to.
 */

import { eventBus } from '../../infra/event-bus.js';
import { EventTypes } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

/**
 * Register all HR-module event listeners.
 * Call once during application bootstrap.
 */
export function registerHrListeners(): void {
  // Listen for won deals — potentially trigger commission calculations for
  // sales employees. The full commission logic is deferred to a future sprint
  // once the compensation-plans feature is implemented.
  eventBus.subscribe(EventTypes.DEAL_WON, async (event) => {
    logger.info(
      {
        eventId: event.id,
        dealId: event.aggregateId,
        payload: event.payload,
      },
      'Deal won — checking employee commission eligibility (TODO)',
    );
    // Future: resolve deal owner -> employee record -> apply commission plan
    // e.g. await commissionService.applyCommission(tenantId, dealId, ownerId);
  });
}
