/**
 * Asset Management module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * that the Asset Management module needs to react to.
 */

import type { DomainEvent } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

// ── Invoice paid listener (stub) ───────────────────────────────────────────────

/**
 * Handle accounting.invoice.paid event.
 *
 * When an invoice is paid, check if it was a purchase invoice linked to
 * a fixed asset. If so, confirm the asset's purchaseInvoiceId is set and
 * the asset is active.
 *
 * This is a stub implementation — full auto-creation logic would require
 * additional metadata on the invoice (e.g. asset flags on line items).
 */
export async function handleInvoicePaid(
  event: DomainEvent<{
    invoiceId: string;
    dealId: string;
    amount: { amount: string; currency: string };
    paymentMethod: string;
  }>,
): Promise<void> {
  try {
    const { invoiceId } = event.payload;

    // Stub: In a full implementation, query assets where purchaseInvoiceId === invoiceId
    // and auto-activate or confirm any PENDING assets tied to that invoice.
    logger.debug(
      { invoiceId, tenantId: event.tenantId },
      '[assets] invoice.paid received — no auto-create action taken (stub)',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle invoice.paid event',
    );
  }
}

/**
 * Register all asset management event listeners.
 * Called during module initialisation (e.g. from server.ts or a bootstrap file).
 *
 * Usage:
 *   import { eventBus } from '../../infra/event-bus.js';
 *   import { registerListeners } from './modules/assets/listeners.js';
 *   registerListeners(eventBus);
 */
export function registerListeners(eventBus: {
  subscribe: <T>(type: string, handler: (event: DomainEvent<T>) => Promise<void>) => void;
}): void {
  eventBus.subscribe('invoice.paid', handleInvoicePaid);

  logger.debug('[assets] Event listeners registered');
}
