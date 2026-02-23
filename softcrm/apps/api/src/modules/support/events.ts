/**
 * Support module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
import type { TicketCreatedPayload } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

interface OutboxPayload {
  tenantId: string;
  actorId: string;
  aggregateType: string;
  correlationId: string;
  data: unknown;
}

async function writeToOutbox(
  eventType: string,
  aggregateId: string,
  payload: OutboxPayload,
): Promise<void> {
  const db = getPrismaClient();
  await db.outbox.create({
    data: {
      id: generateId(),
      eventType,
      aggregateId,
      payload: payload as never,
      publishedAt: null,
    },
  });
}

// ── Ticket events ──────────────────────────────────────────────────────────────

export async function publishTicketCreated(
  tenantId: string,
  actorId: string,
  ticket: { id: string; contactId?: string | null; subject: string; priority: string },
): Promise<void> {
  const payload: TicketCreatedPayload = {
    ticketId: ticket.id,
    contactId: ticket.contactId ?? '',
    subject: ticket.subject,
    priority: ticket.priority,
  };

  await writeToOutbox(EventTypes.TICKET_CREATED, ticket.id, {
    tenantId,
    actorId,
    aggregateType: 'Ticket',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishTicketResolved(
  tenantId: string,
  actorId: string,
  ticket: { id: string; contactId?: string | null; subject: string; resolvedAt: Date | null },
): Promise<void> {
  await writeToOutbox(EventTypes.TICKET_RESOLVED, ticket.id, {
    tenantId,
    actorId,
    aggregateType: 'Ticket',
    correlationId: generateId(),
    data: {
      ticketId: ticket.id,
      contactId: ticket.contactId ?? null,
      subject: ticket.subject,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    },
  });
}

export async function publishTicketSlaBreached(
  tenantId: string,
  actorId: string,
  ticket: { id: string; contactId?: string | null; subject: string; slaDeadline: Date | null },
): Promise<void> {
  await writeToOutbox(EventTypes.TICKET_SLA_BREACHED, ticket.id, {
    tenantId,
    actorId,
    aggregateType: 'Ticket',
    correlationId: generateId(),
    data: {
      ticketId: ticket.id,
      contactId: ticket.contactId ?? null,
      subject: ticket.subject,
      slaDeadline: ticket.slaDeadline?.toISOString() ?? null,
    },
  });
}
