/**
 * Manufacturing module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows, projects them into full `DomainEvent` objects
 * and publishes them to the event bus (BullMQ). This guarantees at-least-once
 * delivery even if the process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Manufacturing event type constants ────────────────────────────────────────

export const MANUFACTURING_EVENTS = {
  WORK_ORDER_CREATED: 'manufacturing.work_order.created',
  WORK_ORDER_RELEASED: 'manufacturing.work_order.released',
  WORK_ORDER_COMPLETED: 'manufacturing.work_order.completed',
  PRODUCTION_OUTPUT_RECORDED: 'manufacturing.production.output_recorded',
  MRP_RUN_COMPLETED: 'manufacturing.mrp.completed',
} as const;

export type ManufacturingEventType =
  (typeof MANUFACTURING_EVENTS)[keyof typeof MANUFACTURING_EVENTS];

// ── Payload types ──────────────────────────────────────────────────────────────

export interface WorkOrderCreatedPayload {
  workOrderId: string;
  workOrderNumber: string;
  tenantId: string;
  bomId: string;
  productId: string;
  plannedQuantity: number;
}

export interface WorkOrderReleasedPayload {
  workOrderId: string;
  workOrderNumber: string;
  tenantId: string;
  productId: string;
  plannedQuantity: number;
}

export interface WorkOrderCompletedPayload {
  workOrderId: string;
  workOrderNumber: string;
  tenantId: string;
  productId: string;
  producedQuantity: number;
}

export interface ProductionOutputRecordedPayload {
  workOrderId: string;
  productId: string;
  tenantId: string;
  quantity: number;
  unit: string;
  lotNumber: string | null;
  warehouseLocationId: string | null;
}

export interface MRPRunCompletedPayload {
  mrpRunId: string;
  tenantId: string;
  horizon: number;
  recommendationCount: number;
}

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

// ── Event publishers ───────────────────────────────────────────────────────────

export async function publishWorkOrderCreated(
  tenantId: string,
  actorId: string,
  payload: WorkOrderCreatedPayload,
): Promise<void> {
  await writeToOutbox(MANUFACTURING_EVENTS.WORK_ORDER_CREATED, payload.workOrderId, {
    tenantId,
    actorId,
    aggregateType: 'WorkOrder',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishWorkOrderReleased(
  tenantId: string,
  actorId: string,
  payload: WorkOrderReleasedPayload,
): Promise<void> {
  await writeToOutbox(MANUFACTURING_EVENTS.WORK_ORDER_RELEASED, payload.workOrderId, {
    tenantId,
    actorId,
    aggregateType: 'WorkOrder',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishWorkOrderCompleted(
  tenantId: string,
  actorId: string,
  payload: WorkOrderCompletedPayload,
): Promise<void> {
  await writeToOutbox(MANUFACTURING_EVENTS.WORK_ORDER_COMPLETED, payload.workOrderId, {
    tenantId,
    actorId,
    aggregateType: 'WorkOrder',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishProductionOutputRecorded(
  tenantId: string,
  actorId: string,
  payload: ProductionOutputRecordedPayload,
): Promise<void> {
  await writeToOutbox(
    MANUFACTURING_EVENTS.PRODUCTION_OUTPUT_RECORDED,
    payload.workOrderId,
    {
      tenantId,
      actorId,
      aggregateType: 'ProductionOutput',
      correlationId: generateId(),
      data: payload,
    },
  );
}

export async function publishMRPRunCompleted(
  tenantId: string,
  actorId: string,
  payload: MRPRunCompletedPayload,
): Promise<void> {
  await writeToOutbox(MANUFACTURING_EVENTS.MRP_RUN_COMPLETED, payload.mrpRunId, {
    tenantId,
    actorId,
    aggregateType: 'MRPRun',
    correlationId: generateId(),
    data: payload,
  });
}
