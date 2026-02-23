/**
 * Marketing module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  generateId,
} from '@softcrm/shared-kernel';

// Prisma enum type helpers — we extract enum types from the Prisma client
// to safely cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type CampaignCreateInput = NonNullable<Parameters<PrismaClient['campaign']['create']>[0]>['data'];
type PrismaCampaignStatus = NonNullable<CampaignCreateInput>['status'];
type PrismaCampaignType = NonNullable<CampaignCreateInput>['type'];
type RecipientCreateInput = NonNullable<Parameters<PrismaClient['campaignRecipient']['create']>[0]>['data'];
type PrismaABVariant = NonNullable<RecipientCreateInput>['variant'];
type TouchCreateInput = NonNullable<Parameters<PrismaClient['marketingTouch']['create']>[0]>['data'];
type PrismaTouchType = NonNullable<TouchCreateInput>['touchType'];

import type { SegmentFilters, CampaignFilters, CampaignMetrics } from './types.js';
import type {
  CreateSegmentInput,
  UpdateSegmentInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  RecordTouchInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
}

/** Transaction client for use in multi-step operations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): { skip: number; take: number } {
  const skip = (pagination.page - 1) * pagination.limit;
  return { skip, take: pagination.limit };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Segments ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSegment(
  tenantId: string,
  data: CreateSegmentInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.segment.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      description: data.description ?? null,
      criteria: data.criteria ? (data.criteria as never) : undefined,
      isDynamic: data.isDynamic ?? true,
      memberCount: 0,
      createdBy: actorId,
    },
  });
}

export async function findSegment(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.segment.findFirst({
    where: { id, tenantId },
  });
}

export async function findSegmentByName(
  tenantId: string,
  name: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.segment.findFirst({
    where: { tenantId, name },
  });
}

export async function findSegments(
  tenantId: string,
  filters: SegmentFilters,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.isDynamic !== undefined) {
    where['isDynamic'] = filters.isDynamic;
  }

  const [data, total] = await Promise.all([
    client.segment.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    client.segment.count({ where }),
  ]);

  return { data, total };
}

export async function updateSegment(
  tenantId: string,
  id: string,
  data: UpdateSegmentInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.segment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.criteria !== undefined && { criteria: data.criteria as never }),
      ...(data.isDynamic !== undefined && { isDynamic: data.isDynamic }),
    },
  });
}

export async function updateSegmentMemberCount(
  tenantId: string,
  id: string,
  memberCount: number,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.segment.update({
    where: { id },
    data: { memberCount },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Campaigns ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const campaignWithSegmentInclude = {
  segment: true,
} as const;

export async function createCampaign(
  tenantId: string,
  data: CreateCampaignInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaign.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      type: (data.type ?? 'EMAIL') as PrismaCampaignType,
      segmentId: data.segmentId ?? null,
      subjectA: data.subjectA,
      subjectB: data.subjectB ?? null,
      bodyHtml: data.bodyHtml,
      scheduledAt: data.scheduledAt ?? null,
      status: 'DRAFT' as PrismaCampaignStatus,
      createdBy: actorId,
    },
    include: campaignWithSegmentInclude,
  });
}

export async function findCampaign(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaign.findFirst({
    where: { id, tenantId },
    include: campaignWithSegmentInclude,
  });
}

export async function findCampaignWithRecipients(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaign.findFirst({
    where: { id, tenantId },
    include: {
      segment: true,
      recipients: true,
    },
  });
}

export async function findCampaigns(
  tenantId: string,
  filters: CampaignFilters,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where['status'] = filters.status as PrismaCampaignStatus;
  }
  if (filters.type) {
    where['type'] = filters.type as PrismaCampaignType;
  }
  if (filters.segmentId) {
    where['segmentId'] = filters.segmentId;
  }
  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    client.campaign.findMany({
      where,
      include: campaignWithSegmentInclude,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    client.campaign.count({ where }),
  ]);

  return { data, total };
}

export async function updateCampaign(
  tenantId: string,
  id: string,
  data: UpdateCampaignInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type as PrismaCampaignType }),
      ...(data.segmentId !== undefined && { segmentId: data.segmentId }),
      ...(data.subjectA !== undefined && { subjectA: data.subjectA }),
      ...(data.subjectB !== undefined && { subjectB: data.subjectB }),
      ...(data.bodyHtml !== undefined && { bodyHtml: data.bodyHtml }),
      ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt }),
    },
    include: campaignWithSegmentInclude,
  });
}

export async function updateCampaignStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: { scheduledAt?: Date; sentAt?: Date },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaign.update({
    where: { id },
    data: {
      status: status as PrismaCampaignStatus,
      ...(extra?.scheduledAt !== undefined && { scheduledAt: extra.scheduledAt }),
      ...(extra?.sentAt !== undefined && { sentAt: extra.sentAt }),
    },
    include: campaignWithSegmentInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Campaign Recipients ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createCampaignRecipients(
  tenantId: string,
  campaignId: string,
  recipients: Array<{ contactId: string; variant: string }>,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaignRecipient.createMany({
    data: recipients.map((r) => ({
      id: generateId(),
      tenantId,
      campaignId,
      contactId: r.contactId,
      variant: r.variant as PrismaABVariant,
      sentAt: new Date(),
    })),
  });
}

export async function updateRecipientEvent(
  tenantId: string,
  campaignId: string,
  contactId: string,
  eventField: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();

  // Find the recipient first
  const recipient = await client.campaignRecipient.findFirst({
    where: { tenantId, campaignId, contactId },
  });

  if (!recipient) {
    throw new NotFoundError('CampaignRecipient', `${campaignId}:${contactId}`);
  }

  return client.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      [eventField]: new Date(),
    },
  });
}

export async function findRecipientById(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.campaignRecipient.findFirst({
    where: { id, tenantId },
  });
}

export async function getCampaignMetrics(
  tenantId: string,
  campaignId: string,
  tx?: TransactionClient,
): Promise<CampaignMetrics> {
  const client = tx ?? getPrismaClient();

  const recipients = await client.campaignRecipient.findMany({
    where: { tenantId, campaignId },
    select: {
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      unsubscribedAt: true,
    },
  });

  const total = recipients.length;
  const delivered = recipients.filter((r: { deliveredAt: Date | null }) => r.deliveredAt !== null).length;
  const opened = recipients.filter((r: { openedAt: Date | null }) => r.openedAt !== null).length;
  const clicked = recipients.filter((r: { clickedAt: Date | null }) => r.clickedAt !== null).length;
  const bounced = recipients.filter((r: { bouncedAt: Date | null }) => r.bouncedAt !== null).length;
  const unsubscribed = recipients.filter((r: { unsubscribedAt: Date | null }) => r.unsubscribedAt !== null).length;

  return {
    total,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    openRate: total > 0 ? opened / total : 0,
    clickRate: total > 0 ? clicked / total : 0,
    bounceRate: total > 0 ? bounced / total : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Marketing Touches ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createMarketingTouch(
  tenantId: string,
  data: RecordTouchInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.marketingTouch.create({
    data: {
      id: generateId(),
      tenantId,
      contactId: data.contactId,
      campaignId: data.campaignId,
      dealId: data.dealId ?? null,
      touchType: (data.touchType ?? 'MID') as PrismaTouchType,
      timestamp: new Date(),
    },
  });
}

export async function findTouchesByDeal(
  tenantId: string,
  dealId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.marketingTouch.findMany({
    where: { tenantId, dealId },
    include: { campaign: true },
    orderBy: { timestamp: 'asc' },
  });
}

export async function findTouchesByCampaign(
  tenantId: string,
  campaignId: string,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where = { tenantId, campaignId };

  const [data, total] = await Promise.all([
    client.marketingTouch.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { timestamp: 'asc' },
    }),
    client.marketingTouch.count({ where }),
  ]);

  return { data, total };
}

export async function findTouchesByContact(
  tenantId: string,
  contactId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.marketingTouch.findMany({
    where: { tenantId, contactId },
    include: { campaign: true },
    orderBy: { timestamp: 'asc' },
  });
}

export async function updateTouchDealId(
  tenantId: string,
  touchId: string,
  dealId: string,
  touchType: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.marketingTouch.update({
    where: { id: touchId },
    data: {
      dealId,
      touchType: touchType as PrismaTouchType,
    },
  });
}

export async function findTouchesWithDeals(
  tenantId: string,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = {
    tenantId,
    dealId: { not: null },
  };

  if (dateRange?.startDate || dateRange?.endDate) {
    const timestampFilter: Record<string, Date> = {};
    if (dateRange.startDate) timestampFilter['gte'] = dateRange.startDate;
    if (dateRange.endDate) timestampFilter['lte'] = dateRange.endDate;
    where['timestamp'] = timestampFilter;
  }

  return client.marketingTouch.findMany({
    where,
    include: { campaign: true },
    orderBy: { timestamp: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Unsubscribes ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createUnsubscribe(
  tenantId: string,
  contactId: string,
  source: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();

  // Upsert to handle the unique constraint on [tenantId, contactId]
  return client.unsubscribe.upsert({
    where: {
      tenantId_contactId: { tenantId, contactId },
    },
    create: {
      id: generateId(),
      tenantId,
      contactId,
      source,
      timestamp: new Date(),
    },
    update: {
      source,
      timestamp: new Date(),
    },
  });
}

export async function isUnsubscribed(
  tenantId: string,
  contactId: string,
  tx?: TransactionClient,
): Promise<boolean> {
  const client = tx ?? getPrismaClient();
  const record = await client.unsubscribe.findFirst({
    where: { tenantId, contactId },
  });
  return record !== null;
}

export async function findUnsubscribes(
  tenantId: string,
  filters: { contactId?: string },
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.contactId) {
    where['contactId'] = filters.contactId;
  }

  const [data, total] = await Promise.all([
    client.unsubscribe.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { timestamp: 'desc' },
    }),
    client.unsubscribe.count({ where }),
  ]);

  return { data, total };
}
