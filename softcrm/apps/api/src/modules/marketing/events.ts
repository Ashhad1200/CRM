/**
 * Marketing module — domain event publishers.
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

// ── Campaign events ────────────────────────────────────────────────────────────

export async function publishCampaignSent(
  tenantId: string,
  actorId: string,
  campaign: { id: string; name: string; type: string; segmentId?: string | null },
): Promise<void> {
  await writeToOutbox(EventTypes.CAMPAIGN_SENT, campaign.id, {
    tenantId,
    actorId,
    aggregateType: 'Campaign',
    correlationId: generateId(),
    data: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignType: campaign.type,
      segmentId: campaign.segmentId ?? null,
    },
  });
}
