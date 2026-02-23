/**
 * Projects module — event listeners.
 *
 * Subscribes to domain events from other modules to trigger
 * project-related workflows (e.g. auto-create project when a deal is won).
 */

import { eventBus } from '../../infra/event-bus.js';
import { EventTypes } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

/**
 * Handle deal.won events — can trigger project creation from a template.
 */
export async function handleDealWon(
  tenantId: string,
  _actorId: string,
  payload: { dealId: string; accountId?: string },
): Promise<void> {
  try {
    // TODO: Look up tenant-level project template linked to the deal's pipeline
    // and auto-create a project from template if configured.
    logger.info(
      { tenantId, dealId: payload.dealId, accountId: payload.accountId },
      'Deal won — project creation hook triggered (TODO)',
    );
  } catch (error) {
    logger.error(
      { error, tenantId, dealId: payload.dealId },
      'Failed to handle deal.won for project creation',
    );
  }
}

/**
 * Register all Projects module event listeners.
 * Call once during application bootstrap.
 */
export function registerProjectListeners(): void {
  eventBus.subscribe(EventTypes.DEAL_WON, async (event) => {
    const payload = event.payload as { dealId: string; accountId?: string };
    await handleDealWon(
      event.tenantId,
      event.actorId,
      payload,
    );
  });
}
