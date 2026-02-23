/**
 * Analytics module — domain event publishers.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

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

export async function publishMetricsUpdated(
  tenantId: string,
  actorId: string,
  dashboard: { id: string; name: string },
): Promise<void> {
  await writeToOutbox(EventTypes.DASHBOARD_METRICS_UPDATED, dashboard.id, {
    tenantId,
    actorId,
    aggregateType: 'Dashboard',
    correlationId: generateId(),
    data: {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    },
  });
}
