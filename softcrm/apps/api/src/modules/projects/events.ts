/**
 * Projects module — domain event publishers.
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

// ── Project events ─────────────────────────────────────────────────────────────

export async function publishProjectCreated(
  tenantId: string,
  actorId: string,
  project: { id: string; name: string; dealId?: string | null; accountId?: string | null },
): Promise<void> {
  await writeToOutbox(EventTypes.PROJECT_CREATED, project.id, {
    tenantId,
    actorId,
    aggregateType: 'Project',
    correlationId: generateId(),
    data: {
      projectId: project.id,
      projectName: project.name,
      dealId: project.dealId ?? null,
      accountId: project.accountId ?? null,
    },
  });
}

// ── Milestone events ───────────────────────────────────────────────────────────

export async function publishMilestoneCompleted(
  tenantId: string,
  actorId: string,
  milestone: { id: string; name: string; projectId: string },
): Promise<void> {
  await writeToOutbox(EventTypes.MILESTONE_COMPLETED, milestone.id, {
    tenantId,
    actorId,
    aggregateType: 'Milestone',
    correlationId: generateId(),
    data: {
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      projectId: milestone.projectId,
    },
  });
}

// ── Time entry events ──────────────────────────────────────────────────────────

export async function publishTimeLogged(
  tenantId: string,
  actorId: string,
  entry: { id: string; taskId: string; hours: number; isBillable: boolean },
): Promise<void> {
  await writeToOutbox(EventTypes.TIME_LOGGED, entry.id, {
    tenantId,
    actorId,
    aggregateType: 'TimeEntry',
    correlationId: generateId(),
    data: {
      timeEntryId: entry.id,
      taskId: entry.taskId,
      hours: entry.hours,
      isBillable: entry.isBillable,
    },
  });
}
