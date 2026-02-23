/**
 * Marketing module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Sales deal.won) that the Marketing module needs to react to.
 */

import type { DealWonPayload } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';
import * as svc from './service.js';

/**
 * Handle the deal.won event.
 * Links existing marketing touches for the contact to the deal
 * and assigns touch type ordering for attribution.
 */
export async function handleDealWon(
  tenantId: string,
  _actorId: string,
  payload: DealWonPayload,
): Promise<void> {
  try {
    await svc.handleDealWon(tenantId, {
      dealId: payload.dealId,
      contactId: payload.contactId,
      accountId: payload.accountId,
      amount: payload.amount,
    });

    logger.info(
      { dealId: payload.dealId, contactId: payload.contactId },
      'Marketing attribution updated for won deal',
    );
  } catch (error) {
    logger.error(
      { error, dealId: payload.dealId },
      'Failed to update marketing attribution for deal.won',
    );
  }
}

/**
 * Register all marketing event listeners.
 * Called during module initialization.
 */
export function registerMarketingListeners(): void {
  // Listeners are registered via the event bus (BullMQ).
  // The actual registration happens in the module bootstrap.
  // This is a placeholder for the event handler mapping.
}
