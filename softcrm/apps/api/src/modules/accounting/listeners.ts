/**
 * Accounting module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Sales) that the Accounting module needs to react to.
 */

import { EventTypes } from '@softcrm/shared-kernel';
import type { DealWonPayload } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';
import * as invoiceService from './invoicing/invoice.service.js';
import { logger } from '../../logger.js';

/**
 * Subscribe to deal.won event to auto-create invoices.
 * When a deal is won, find the most recent accepted quote,
 * and create an invoice from it.
 */
export async function handleDealWon(
  tenantId: string,
  actorId: string,
  payload: DealWonPayload,
): Promise<void> {
  try {
    const db = getPrismaClient();

    // Find the deal's most recent accepted (or any) quote with lines
    const quote = await db.quote.findFirst({
      where: { dealId: payload.dealId, tenantId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!quote || quote.lines.length === 0) {
      logger.warn(
        { dealId: payload.dealId },
        'No quote found for won deal — skipping invoice creation',
      );
      return;
    }

    // Map quote lines for invoice creation
    const quoteLines = quote.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      discount: Number(l.discount),
      taxRate: Number(l.taxRate),
    }));

    await invoiceService.createInvoiceFromDeal(
      tenantId,
      { id: payload.dealId, accountId: payload.accountId || null },
      { lines: quoteLines },
      payload.contactId || undefined,
      actorId,
    );

    logger.info({ dealId: payload.dealId }, 'Invoice auto-created from won deal');
  } catch (error) {
    logger.error(
      { error, dealId: payload.dealId },
      'Failed to create invoice from won deal',
    );
  }
}

/**
 * Register all accounting event listeners.
 * Called during module initialization.
 */
export function registerListeners(): void {
  // Listeners are registered via the event bus (BullMQ).
  // The actual registration happens in the module bootstrap.
  // This is a placeholder for the event handler mapping.
}
