/**
 * Sales module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
import type {
  DealWonPayload,
  DealStageChangedPayload,
  LeadConvertedPayload,
} from '@softcrm/shared-kernel';
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

// ── Lead events ────────────────────────────────────────────────────────────────

export async function publishLeadCreated(
  tenantId: string,
  actorId: string,
  lead: { id: string; firstName: string; lastName: string; email: string; source: string },
): Promise<void> {
  await writeToOutbox(EventTypes.LEAD_CREATED, lead.id, {
    tenantId,
    actorId,
    aggregateType: 'Lead',
    correlationId: generateId(),
    data: {
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      source: lead.source,
    },
  });
}

export async function publishLeadConverted(
  tenantId: string,
  actorId: string,
  result: LeadConvertedPayload,
): Promise<void> {
  await writeToOutbox(EventTypes.LEAD_CONVERTED, result.leadId, {
    tenantId,
    actorId,
    aggregateType: 'Lead',
    correlationId: generateId(),
    data: result,
  });
}

// ── Deal events ────────────────────────────────────────────────────────────────

export async function publishDealStageChanged(
  tenantId: string,
  actorId: string,
  deal: { id: string },
  fromStage: string,
  toStage: string,
): Promise<void> {
  const payload: DealStageChangedPayload = {
    dealId: deal.id,
    fromStage,
    toStage,
  };

  await writeToOutbox(EventTypes.DEAL_STAGE_CHANGED, deal.id, {
    tenantId,
    actorId,
    aggregateType: 'Deal',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishDealWon(
  tenantId: string,
  actorId: string,
  deal: { id: string; value: unknown; currency: string; accountId?: string | null },
  contactIds: string[],
): Promise<void> {
  const payload: DealWonPayload = {
    dealId: deal.id,
    contactId: contactIds[0] ?? '',
    accountId: deal.accountId ?? '',
    amount: {
      amount: String(deal.value),
      currency: deal.currency,
    },
    products: [], // Populated when quote/product integration is available
  };

  await writeToOutbox(EventTypes.DEAL_WON, deal.id, {
    tenantId,
    actorId,
    aggregateType: 'Deal',
    correlationId: generateId(),
    data: payload,
  });
}

export async function publishDealLost(
  tenantId: string,
  actorId: string,
  deal: { id: string; lostReason?: string | null },
): Promise<void> {
  await writeToOutbox(EventTypes.DEAL_LOST, deal.id, {
    tenantId,
    actorId,
    aggregateType: 'Deal',
    correlationId: generateId(),
    data: {
      dealId: deal.id,
      lostReason: deal.lostReason ?? null,
    },
  });
}
