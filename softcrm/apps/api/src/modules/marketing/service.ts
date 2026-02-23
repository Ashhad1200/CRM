/**
 * Marketing module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ValidationError,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { logger } from '../../logger.js';
import * as repo from './repository.js';
import * as events from './events.js';

import type {
  SegmentFilters,
  CampaignFilters,
  CampaignMetrics,
  AttributionResult,
} from './types.js';
import type {
  CreateSegmentInput,
  UpdateSegmentInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  RecordTouchInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Segments ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSegment(
  tenantId: string,
  data: CreateSegmentInput,
  actorId: string,
) {
  // Check name uniqueness within tenant
  const existing = await repo.findSegmentByName(tenantId, data.name);
  if (existing) {
    throw new ValidationError(`Segment with name "${data.name}" already exists`);
  }

  return repo.createSegment(tenantId, data, actorId);
}

export async function getSegments(
  tenantId: string,
  filters: SegmentFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findSegments(tenantId, filters, pagination);
  return paginatedResult(data, total, { page: pagination.page, pageSize: pagination.limit });
}

export async function getSegment(tenantId: string, id: string) {
  const segment = await repo.findSegment(tenantId, id);
  if (!segment) {
    throw new NotFoundError('Segment', id);
  }
  return segment;
}

export async function updateSegment(
  tenantId: string,
  id: string,
  data: UpdateSegmentInput,
) {
  const segment = await repo.findSegment(tenantId, id);
  if (!segment) {
    throw new NotFoundError('Segment', id);
  }

  // If name is changing, check uniqueness
  if (data.name && data.name !== segment.name) {
    const existing = await repo.findSegmentByName(tenantId, data.name);
    if (existing) {
      throw new ValidationError(`Segment with name "${data.name}" already exists`);
    }
  }

  return repo.updateSegment(tenantId, id, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Campaigns ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function buildCampaign(
  tenantId: string,
  data: CreateCampaignInput,
  actorId: string,
) {
  // Validate segment exists if segmentId is provided
  if (data.segmentId) {
    const segment = await repo.findSegment(tenantId, data.segmentId);
    if (!segment) {
      throw new NotFoundError('Segment', data.segmentId);
    }
  }

  return repo.createCampaign(tenantId, data, actorId);
}

export async function getCampaigns(
  tenantId: string,
  filters: CampaignFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findCampaigns(tenantId, filters, pagination);
  return paginatedResult(data, total, { page: pagination.page, pageSize: pagination.limit });
}

export async function getCampaign(tenantId: string, id: string) {
  const campaign = await repo.findCampaign(tenantId, id);
  if (!campaign) {
    throw new NotFoundError('Campaign', id);
  }
  return campaign;
}

export async function updateCampaign(
  tenantId: string,
  id: string,
  data: UpdateCampaignInput,
) {
  const campaign = await repo.findCampaign(tenantId, id);
  if (!campaign) {
    throw new NotFoundError('Campaign', id);
  }

  if (campaign.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT campaigns can be updated');
  }

  return repo.updateCampaign(tenantId, id, data);
}

export async function scheduleCampaign(
  tenantId: string,
  campaignId: string,
  sendAt: Date,
  actorId: string,
) {
  const campaign = await repo.findCampaign(tenantId, campaignId);
  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  if (campaign.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT campaigns can be scheduled');
  }

  logger.info({ campaignId, sendAt }, 'Scheduling campaign');

  return repo.updateCampaignStatus(tenantId, campaignId, 'SCHEDULED', {
    scheduledAt: sendAt,
  });
}

export async function sendCampaign(
  tenantId: string,
  campaignId: string,
  contactIds: string[],
  actorId: string,
) {
  if (contactIds.length === 0) {
    throw new ValidationError('contactIds must not be empty');
  }

  const campaign = await repo.findCampaign(tenantId, campaignId);
  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
    throw new ValidationError('Campaign must be in DRAFT or SCHEDULED status to send');
  }

  const db = getPrismaClient();

  const result = await db.$transaction(async (tx: unknown) => {
    // Split contacts into A/B variants (50/50 split)
    const midpoint = Math.ceil(contactIds.length / 2);
    const recipients = contactIds.map((contactId, index) => ({
      contactId,
      variant: index < midpoint ? 'A' : 'B',
    }));

    // Create recipient records
    await repo.createCampaignRecipients(tenantId, campaignId, recipients, tx);

    // Update campaign status to SENT
    const updated = await repo.updateCampaignStatus(
      tenantId,
      campaignId,
      'SENT',
      { sentAt: new Date() },
      tx,
    );

    return updated;
  });

  // Publish campaign sent event (outside transaction for outbox pattern)
  await events.publishCampaignSent(tenantId, actorId, {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    segmentId: campaign.segmentId,
  });

  logger.info(
    { campaignId, recipientCount: contactIds.length },
    'Campaign sent successfully',
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Webhooks (engagement tracking) ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const webhookEventFieldMap: Record<string, string> = {
  delivered: 'deliveredAt',
  opened: 'openedAt',
  clicked: 'clickedAt',
  bounced: 'bouncedAt',
  unsubscribed: 'unsubscribedAt',
};

export async function processWebhook(
  tenantId: string,
  recipientId: string,
  eventType: string,
) {
  const field = webhookEventFieldMap[eventType];
  if (!field) {
    throw new ValidationError(`Unknown webhook event type: ${eventType}`);
  }

  // Find recipient to get campaignId and contactId
  const recipient = await repo.findRecipientById(tenantId, recipientId);
  if (!recipient) {
    throw new NotFoundError('CampaignRecipient', recipientId);
  }

  await repo.updateRecipientEvent(
    tenantId,
    recipient.campaignId,
    recipient.contactId,
    field,
  );

  // If unsubscribed, also create an unsubscribe record
  if (eventType === 'unsubscribed') {
    await repo.createUnsubscribe(tenantId, recipient.contactId, `campaign:${recipient.campaignId}`);
  }

  logger.info(
    { recipientId, eventType, campaignId: recipient.campaignId },
    'Webhook event processed',
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Metrics ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCampaignMetrics(
  tenantId: string,
  campaignId: string,
): Promise<CampaignMetrics> {
  const campaign = await repo.findCampaign(tenantId, campaignId);
  if (!campaign) {
    throw new NotFoundError('Campaign', campaignId);
  }

  return repo.getCampaignMetrics(tenantId, campaignId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Touches ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function recordTouch(
  tenantId: string,
  data: RecordTouchInput,
  actorId: string,
) {
  return repo.createMarketingTouch(tenantId, data, actorId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Attribution ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAttributionReport(
  tenantId: string,
  dateRange: { startDate?: Date; endDate?: Date },
  _model: 'first' | 'last' | 'linear',
  pagination: Pagination,
): Promise<PaginatedResult<AttributionResult>> {
  const touches = await repo.findTouchesWithDeals(tenantId, dateRange);

  // Group touches by campaignId
  const campaignMap = new Map<
    string,
    {
      campaignId: string;
      campaignName: string;
      dealIds: Set<string>;
      touchCount: number;
      isFirst: boolean;
      isLast: boolean;
    }
  >();

  // Group all touches by dealId first, to determine first/last per deal
  const dealTouches = new Map<string, Array<{ campaignId: string; campaignName: string; timestamp: Date }>>();
  for (const touch of touches) {
    const dealId = touch.dealId as string;
    if (!dealTouches.has(dealId)) {
      dealTouches.set(dealId, []);
    }
    dealTouches.get(dealId)!.push({
      campaignId: touch.campaignId,
      campaignName: (touch as unknown as { campaign: { name: string } }).campaign.name,
      timestamp: touch.timestamp,
    });
  }

  // Build campaign aggregation
  for (const [dealId, dtouches] of dealTouches.entries()) {
    // Sort by timestamp
    dtouches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < dtouches.length; i++) {
      const t = dtouches[i]!;
      if (!campaignMap.has(t.campaignId)) {
        campaignMap.set(t.campaignId, {
          campaignId: t.campaignId,
          campaignName: t.campaignName,
          dealIds: new Set(),
          touchCount: 0,
          isFirst: false,
          isLast: false,
        });
      }
      const entry = campaignMap.get(t.campaignId)!;
      entry.dealIds.add(dealId);
      entry.touchCount++;
      if (i === 0) entry.isFirst = true;
      if (i === dtouches.length - 1) entry.isLast = true;
    }
  }

  // Convert to AttributionResult[]
  // TODO: Revenue attribution requires cross-module data (deal amounts).
  // For now, revenue fields are stubbed to 0. Integrate with sales module for actual revenue.
  const allResults: AttributionResult[] = Array.from(campaignMap.values()).map((entry) => ({
    campaignId: entry.campaignId,
    campaignName: entry.campaignName,
    dealCount: entry.dealIds.size,
    firstTouchRevenue: 0,
    lastTouchRevenue: 0,
    linearRevenue: 0,
  }));

  // Sort by dealCount descending
  allResults.sort((a, b) => b.dealCount - a.dealCount);

  // Paginate
  const startIdx = (pagination.page - 1) * pagination.limit;
  const pageData = allResults.slice(startIdx, startIdx + pagination.limit);
  return paginatedResult(pageData, allResults.length, {
    page: pagination.page,
    pageSize: pagination.limit,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Deal Won Handler (cross-module) ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface DealWonEventPayload {
  dealId: string;
  contactId: string;
  accountId: string;
  amount: { amount: string; currency: string };
}

/**
 * Handle a deal.won event by linking existing marketing touches for the
 * contact to the deal and assigning touch type ordering (FIRST/MID/LAST).
 */
export async function handleDealWon(
  tenantId: string,
  payload: DealWonEventPayload,
): Promise<void> {
  try {
    const touches = await repo.findTouchesByContact(tenantId, payload.contactId);

    if (touches.length === 0) {
      logger.info(
        { dealId: payload.dealId, contactId: payload.contactId },
        'No marketing touches found for deal won contact',
      );
      return;
    }

    // Filter to touches not already assigned to a deal
    const unlinked = touches.filter((t: { dealId: string | null }) => t.dealId === null);
    if (unlinked.length === 0) {
      logger.info(
        { dealId: payload.dealId, contactId: payload.contactId },
        'All marketing touches already linked to deals',
      );
      return;
    }

    // Sort by timestamp ascending
    unlinked.sort((a: { timestamp: Date }, b: { timestamp: Date }) => a.timestamp.getTime() - b.timestamp.getTime());

    // Assign touchType ordering and link to deal
    for (let i = 0; i < unlinked.length; i++) {
      const touch = unlinked[i]!;
      let touchType: string;
      if (unlinked.length === 1) {
        touchType = 'FIRST';
      } else if (i === 0) {
        touchType = 'FIRST';
      } else if (i === unlinked.length - 1) {
        touchType = 'LAST';
      } else {
        touchType = 'MID';
      }

      await repo.updateTouchDealId(tenantId, touch.id, payload.dealId, touchType);
    }

    logger.info(
      { dealId: payload.dealId, contactId: payload.contactId, touchCount: unlinked.length },
      'Marketing touches linked to won deal',
    );
  } catch (error) {
    logger.error(
      { error, dealId: payload.dealId, contactId: payload.contactId },
      'Failed to handle deal.won for marketing attribution',
    );
  }
}
