/**
 * Comms module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
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

// ── Email events ───────────────────────────────────────────────────────────────

export async function publishEmailReceived(
  tenantId: string,
  actorId: string,
  activity: { id: string; contactId?: string | null; subject?: string | null },
): Promise<void> {
  await writeToOutbox(EventTypes.EMAIL_RECEIVED, activity.id, {
    tenantId,
    actorId,
    aggregateType: 'Activity',
    correlationId: generateId(),
    data: {
      activityId: activity.id,
      contactId: activity.contactId ?? null,
      subject: activity.subject ?? null,
    },
  });
}

// ── Call events ────────────────────────────────────────────────────────────────

export async function publishCallCompleted(
  tenantId: string,
  actorId: string,
  callLog: {
    id: string;
    activityId: string;
    fromNumber: string;
    toNumber: string;
    duration: number;
    status: string;
  },
): Promise<void> {
  await writeToOutbox(EventTypes.CALL_COMPLETED, callLog.activityId, {
    tenantId,
    actorId,
    aggregateType: 'CallLog',
    correlationId: generateId(),
    data: {
      callLogId: callLog.id,
      activityId: callLog.activityId,
      fromNumber: callLog.fromNumber,
      toNumber: callLog.toNumber,
      duration: callLog.duration,
      status: callLog.status,
    },
  });
}
