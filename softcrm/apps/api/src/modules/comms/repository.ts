/**
 * Comms module — data-access layer (repository).
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
type ActivityCreateInput = NonNullable<Parameters<PrismaClient['activity']['create']>[0]>['data'];
type PrismaActivityType = NonNullable<ActivityCreateInput>['type'];
type PrismaActivityDirection = NonNullable<ActivityCreateInput>['direction'];
type PrismaCallStatus = NonNullable<NonNullable<Parameters<PrismaClient['callLog']['create']>[0]>['data']>['status'];
type PrismaEmailSyncProvider = NonNullable<NonNullable<Parameters<PrismaClient['emailSync']['create']>[0]>['data']>['provider'];
type PrismaEmailSyncStatus = NonNullable<NonNullable<Parameters<PrismaClient['emailSync']['create']>[0]>['data']>['status'];

import type { ActivityFilters, TemplateFilters } from './types.js';
import type {
  CreateActivityInput,
  LogCallInput,
  ConnectEmailSyncInput,
  CreateTemplateInput,
  UpdateTemplateInput,
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

// ── Prisma include fragments ───────────────────────────────────────────────────

const activityWithCallLogInclude = {
  callLog: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): { skip: number; take: number } {
  const skip = (pagination.page - 1) * pagination.limit;
  return { skip, take: pagination.limit };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Activities ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createActivity(
  tenantId: string,
  data: CreateActivityInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.activity.create({
    data: {
      id: generateId(),
      tenantId,
      type: data.type as PrismaActivityType,
      direction: data.direction as PrismaActivityDirection,
      contactId: data.contactId ?? null,
      dealId: data.dealId ?? null,
      ticketId: data.ticketId ?? null,
      accountId: data.accountId ?? null,
      subject: data.subject ?? null,
      body: data.body ?? null,
      metadata: data.metadata ? (data.metadata as never) : undefined,
      timestamp: new Date(),
      createdBy: actorId,
    },
    include: activityWithCallLogInclude,
  });
}

export async function findActivities(
  tenantId: string,
  filters: ActivityFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.contactId) where['contactId'] = filters.contactId;
  if (filters.dealId) where['dealId'] = filters.dealId;
  if (filters.ticketId) where['ticketId'] = filters.ticketId;
  if (filters.accountId) where['accountId'] = filters.accountId;
  if (filters.type) where['type'] = filters.type;
  if (filters.direction) where['direction'] = filters.direction;
  if (filters.dateFrom || filters.dateTo) {
    const timestamp: Record<string, Date> = {};
    if (filters.dateFrom) timestamp['gte'] = new Date(filters.dateFrom);
    if (filters.dateTo) timestamp['lte'] = new Date(filters.dateTo);
    where['timestamp'] = timestamp;
  }

  const [data, total] = await Promise.all([
    db.activity.findMany({
      where,
      include: activityWithCallLogInclude,
      orderBy: { timestamp: 'desc' },
      ...paginationArgs(pagination),
    }),
    db.activity.count({ where }),
  ]);

  return { data, total };
}

export async function findActivity(tenantId: string, id: string) {
  const db = getPrismaClient();
  const activity = await db.activity.findFirst({
    where: { id, tenantId },
    include: activityWithCallLogInclude,
  });
  if (!activity) throw new NotFoundError('Activity', id);
  return activity;
}

export async function getTimeline(
  tenantId: string,
  filters: { contactId?: string; dealId?: string; ticketId?: string; accountId?: string },
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const orConditions: Record<string, string>[] = [];
  if (filters.contactId) orConditions.push({ contactId: filters.contactId });
  if (filters.dealId) orConditions.push({ dealId: filters.dealId });
  if (filters.ticketId) orConditions.push({ ticketId: filters.ticketId });
  if (filters.accountId) orConditions.push({ accountId: filters.accountId });

  const where: Record<string, unknown> = { tenantId };
  if (orConditions.length > 0) {
    where['OR'] = orConditions;
  }

  const [data, total] = await Promise.all([
    db.activity.findMany({
      where,
      include: activityWithCallLogInclude,
      orderBy: { timestamp: 'desc' },
      ...paginationArgs(pagination),
    }),
    db.activity.count({ where }),
  ]);

  return { data, total };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Call Logs ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createCallLog(
  tenantId: string,
  activityId: string,
  data: {
    provider: string;
    callSid?: string;
    fromNumber: string;
    toNumber: string;
    duration: number;
    recordingUrl?: string;
    status: string;
  },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.callLog.create({
    data: {
      id: generateId(),
      tenantId,
      activityId,
      provider: data.provider,
      callSid: data.callSid ?? null,
      fromNumber: data.fromNumber,
      toNumber: data.toNumber,
      duration: data.duration,
      recordingUrl: data.recordingUrl ?? null,
      status: data.status as PrismaCallStatus,
    },
  });
}

export async function findCallLog(tenantId: string, activityId: string) {
  const db = getPrismaClient();
  const callLog = await db.callLog.findFirst({
    where: { activityId, tenantId },
    include: { activity: true },
  });
  if (!callLog) throw new NotFoundError('CallLog', activityId);
  return callLog;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Sync ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createEmailSync(
  tenantId: string,
  userId: string,
  data: ConnectEmailSyncInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.emailSync.create({
    data: {
      id: generateId(),
      tenantId,
      userId,
      provider: data.provider as PrismaEmailSyncProvider,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      status: 'ACTIVE' as PrismaEmailSyncStatus,
    },
  });
}

export async function findEmailSync(
  tenantId: string,
  userId: string,
  provider: string,
) {
  const db = getPrismaClient();
  return db.emailSync.findFirst({
    where: { tenantId, userId, provider: provider as PrismaEmailSyncProvider },
  });
}

export async function findEmailSyncs(tenantId: string, userId?: string) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (userId) where['userId'] = userId;
  return db.emailSync.findMany({ where, orderBy: { userId: 'asc' } });
}

export async function updateEmailSyncStatus(
  id: string,
  status: string,
  lastSyncAt?: Date,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.emailSync.update({
    where: { id },
    data: {
      status: status as PrismaEmailSyncStatus,
      ...(lastSyncAt ? { lastSyncAt } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Templates ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createEmailTemplate(
  tenantId: string,
  data: CreateTemplateInput,
  actorId: string,
) {
  const db = getPrismaClient();
  return db.emailTemplate.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      mergeFields: data.mergeFields ?? [],
      isActive: true,
      createdBy: actorId,
      version: 1,
    },
  });
}

export async function findEmailTemplates(
  tenantId: string,
  filters: TemplateFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { subject: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.isActive !== undefined) {
    where['isActive'] = filters.isActive;
  }

  const [data, total] = await Promise.all([
    db.emailTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      ...paginationArgs(pagination),
    }),
    db.emailTemplate.count({ where }),
  ]);

  return { data, total };
}

export async function findEmailTemplate(tenantId: string, id: string) {
  const db = getPrismaClient();
  const template = await db.emailTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!template) throw new NotFoundError('EmailTemplate', id);
  return template;
}

export async function updateEmailTemplate(
  tenantId: string,
  id: string,
  data: UpdateTemplateInput,
  version: number,
) {
  const db = getPrismaClient();

  // Optimistic locking: only update if version matches
  const existing = await db.emailTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new NotFoundError('EmailTemplate', id);
  if (existing.version !== version) {
    throw new ConflictError('Email template has been modified by another user');
  }

  return db.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.bodyHtml !== undefined ? { bodyHtml: data.bodyHtml } : {}),
      ...(data.mergeFields !== undefined ? { mergeFields: data.mergeFields } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      version: { increment: 1 },
    },
  });
}
