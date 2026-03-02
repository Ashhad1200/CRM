/**
 * Quality Control module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Event type constants ───────────────────────────────────────────────────────

export const QUALITY_EVENTS = {
  INSPECTION_FAILED: 'quality.inspection.failed',
  INSPECTION_PASSED: 'quality.inspection.passed',
  NCR_CREATED: 'quality.ncr.created',
  NCR_RESOLVED: 'quality.ncr.resolved',
  CORRECTIVE_ACTION_OVERDUE: 'quality.corrective_action.overdue',
} as const;

export type QualityEventType =
  (typeof QUALITY_EVENTS)[keyof typeof QUALITY_EVENTS];

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

// ── Inspection events ──────────────────────────────────────────────────────────

/** Publish quality.inspection.passed when an inspection passes. */
export async function publishInspectionPassed(
  tenantId: string,
  actorId: string,
  inspection: {
    id: string;
    inspectionNumber: string;
    type: string;
    productId: string | null;
    referenceId: string | null;
  },
): Promise<void> {
  await writeToOutbox(QUALITY_EVENTS.INSPECTION_PASSED, inspection.id, {
    tenantId,
    actorId,
    aggregateType: 'Inspection',
    correlationId: generateId(),
    data: {
      inspectionId: inspection.id,
      inspectionNumber: inspection.inspectionNumber,
      type: inspection.type,
      productId: inspection.productId,
      referenceId: inspection.referenceId,
    },
  });
}

/** Publish quality.inspection.failed when an inspection fails. */
export async function publishInspectionFailed(
  tenantId: string,
  actorId: string,
  inspection: {
    id: string;
    inspectionNumber: string;
    type: string;
    productId: string | null;
    referenceId: string | null;
  },
): Promise<void> {
  await writeToOutbox(QUALITY_EVENTS.INSPECTION_FAILED, inspection.id, {
    tenantId,
    actorId,
    aggregateType: 'Inspection',
    correlationId: generateId(),
    data: {
      inspectionId: inspection.id,
      inspectionNumber: inspection.inspectionNumber,
      type: inspection.type,
      productId: inspection.productId,
      referenceId: inspection.referenceId,
    },
  });
}

// ── NCR events ────────────────────────────────────────────────────────────────

/** Publish quality.ncr.created when a new NCR is raised. */
export async function publishNcrCreated(
  tenantId: string,
  actorId: string,
  ncr: {
    id: string;
    ncrNumber: string;
    severity: string;
    title: string;
    inspectionId: string | null;
    supplierId: string | null;
  },
): Promise<void> {
  await writeToOutbox(QUALITY_EVENTS.NCR_CREATED, ncr.id, {
    tenantId,
    actorId,
    aggregateType: 'NonConformanceReport',
    correlationId: generateId(),
    data: {
      ncrId: ncr.id,
      ncrNumber: ncr.ncrNumber,
      severity: ncr.severity,
      title: ncr.title,
      inspectionId: ncr.inspectionId,
      supplierId: ncr.supplierId,
    },
  });
}

/** Publish quality.ncr.resolved when an NCR is resolved. */
export async function publishNcrResolved(
  tenantId: string,
  actorId: string,
  ncr: {
    id: string;
    ncrNumber: string;
    severity: string;
    title: string;
  },
): Promise<void> {
  await writeToOutbox(QUALITY_EVENTS.NCR_RESOLVED, ncr.id, {
    tenantId,
    actorId,
    aggregateType: 'NonConformanceReport',
    correlationId: generateId(),
    data: {
      ncrId: ncr.id,
      ncrNumber: ncr.ncrNumber,
      severity: ncr.severity,
      title: ncr.title,
    },
  });
}

/** Publish quality.corrective_action.overdue for an overdue CAPA. */
export async function publishCorrectiveActionOverdue(
  tenantId: string,
  actorId: string,
  ca: {
    id: string;
    ncrId: string;
    assignedTo: string;
    dueDate: Date;
  },
): Promise<void> {
  await writeToOutbox(QUALITY_EVENTS.CORRECTIVE_ACTION_OVERDUE, ca.id, {
    tenantId,
    actorId,
    aggregateType: 'CorrectiveAction',
    correlationId: generateId(),
    data: {
      correctiveActionId: ca.id,
      ncrId: ca.ncrId,
      assignedTo: ca.assignedTo,
      dueDate: ca.dueDate.toISOString(),
    },
  });
}
