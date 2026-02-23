/**
 * Comms module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Support) that the Comms module needs to react to.
 */

import type { TicketCreatedPayload } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';
import * as svc from './service.js';

/**
 * Handle the ticket.created event.
 * Creates a NOTE activity linked to the ticket to log that a ticket was created.
 */
export async function handleTicketCreated(
  tenantId: string,
  actorId: string,
  payload: TicketCreatedPayload,
): Promise<void> {
  try {
    await svc.createActivity(tenantId, {
      type: 'NOTE',
      direction: 'INBOUND',
      ticketId: payload.ticketId,
      contactId: payload.contactId,
      subject: `Ticket created: ${payload.subject}`,
      body: `Support ticket "${payload.subject}" was created with priority ${payload.priority}.`,
    }, actorId);

    logger.info(
      { ticketId: payload.ticketId, contactId: payload.contactId },
      'Activity note created for new ticket',
    );
  } catch (error) {
    logger.error(
      { error, ticketId: payload.ticketId },
      'Failed to create activity note for ticket',
    );
  }
}

/**
 * Register all comms event listeners.
 * Called during module initialization.
 */
export function registerCommsListeners(): void {
  // Listeners are registered via the event bus (BullMQ).
  // The actual registration happens in the module bootstrap.
  // This is a placeholder for the event handler mapping.
}
