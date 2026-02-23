/**
 * Workflow Builder module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../../infra/outbox.ts`) polls for unpublished rows, projects
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

// ── Workflow events ────────────────────────────────────────────────────────────

export async function publishWorkflowExecuted(
  tenantId: string,
  actorId: string,
  execution: { id: string; workflowId: string; triggerEvent: string },
): Promise<void> {
  await writeToOutbox(EventTypes.WORKFLOW_EXECUTED, execution.id, {
    tenantId,
    actorId,
    aggregateType: 'WorkflowExecution',
    correlationId: generateId(),
    data: {
      executionId: execution.id,
      workflowId: execution.workflowId,
      triggerEvent: execution.triggerEvent,
    },
  });
}
