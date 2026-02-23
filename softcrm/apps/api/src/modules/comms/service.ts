/**
 * Comms module — business-logic / service layer.
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
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { logger } from '../../logger.js';
import * as repo from './repository.js';
import * as events from './events.js';

import type { ActivityFilters, TemplateFilters } from './types.js';
import type {
  CreateActivityInput,
  LogCallInput,
  SendEmailInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  ConnectEmailSyncInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Activities ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createActivity(
  tenantId: string,
  data: CreateActivityInput,
  actorId: string,
) {
  return repo.createActivity(tenantId, data, actorId);
}

export async function getActivities(
  tenantId: string,
  filters: ActivityFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findActivities(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getActivity(tenantId: string, id: string) {
  return repo.findActivity(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Timeline ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTimeline(
  tenantId: string,
  filters: { contactId?: string; dealId?: string; ticketId?: string; accountId?: string },
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.getTimeline(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Calls ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function logCall(
  tenantId: string,
  data: LogCallInput,
  actorId: string,
) {
  const db = getPrismaClient();

  const result = await db.$transaction(async (tx) => {
    // 1. Create the activity
    const activity = await repo.createActivity(
      tenantId,
      {
        type: 'CALL',
        direction: 'OUTBOUND',
        contactId: data.contactId,
        dealId: data.dealId,
        subject: data.subject ?? `Call to ${data.toNumber}`,
        body: data.body,
      },
      actorId,
      tx,
    );

    // 2. Create the call log
    const callLog = await repo.createCallLog(
      tenantId,
      activity.id,
      {
        provider: 'manual',
        callSid: data.callSid,
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        duration: data.duration ?? 0,
        recordingUrl: data.recordingUrl,
        status: data.status ?? 'COMPLETED',
      },
      tx,
    );

    return { ...activity, callLog };
  });

  // 3. Publish domain event (outside transaction)
  await events.publishCallCompleted(tenantId, actorId, result.callLog);

  return result;
}

export async function getCallLog(tenantId: string, activityId: string) {
  return repo.findCallLog(tenantId, activityId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Sending ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pure function: replace `{{key}}` patterns in text with context values.
 */
export function renderTemplate(
  template: { subject: string; bodyHtml: string },
  mergeContext: Record<string, unknown>,
): { subject: string; bodyHtml: string } {
  let subject = template.subject;
  let bodyHtml = template.bodyHtml;

  for (const [key, value] of Object.entries(mergeContext)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const replacement = String(value ?? '');
    subject = subject.replace(pattern, replacement);
    bodyHtml = bodyHtml.replace(pattern, replacement);
  }

  return { subject, bodyHtml };
}

export async function sendEmail(
  tenantId: string,
  data: SendEmailInput,
  actorId: string,
) {
  let subject = data.subject;
  let body = data.body;

  // If a template is provided, render it with merge context
  if (data.templateId) {
    const template = await repo.findEmailTemplate(tenantId, data.templateId);
    const mergeContext = (data.mergeContext ?? {}) as Record<string, unknown>;
    const rendered = renderTemplate(
      { subject: template.subject, bodyHtml: template.bodyHtml },
      mergeContext,
    );
    subject = rendered.subject;
    body = rendered.bodyHtml;
  }

  // Create the activity
  const activity = await repo.createActivity(
    tenantId,
    {
      type: 'EMAIL',
      direction: 'OUTBOUND',
      contactId: data.contactId,
      dealId: data.dealId,
      ticketId: data.ticketId,
      subject,
      body,
    },
    actorId,
  );

  // Publish domain event for tracking
  await events.publishEmailReceived(tenantId, actorId, activity);

  logger.info(
    { activityId: activity.id, contactId: data.contactId },
    'Email activity created',
  );

  return activity;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Templates ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createEmailTemplate(
  tenantId: string,
  data: CreateTemplateInput,
  actorId: string,
) {
  return repo.createEmailTemplate(tenantId, data, actorId);
}

export async function getEmailTemplates(
  tenantId: string,
  filters: TemplateFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findEmailTemplates(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getEmailTemplate(tenantId: string, id: string) {
  return repo.findEmailTemplate(tenantId, id);
}

export async function updateEmailTemplate(
  tenantId: string,
  id: string,
  data: UpdateTemplateInput,
  actorId: string,
) {
  return repo.updateEmailTemplate(tenantId, id, data, data.version);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Sync ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function connectEmailSync(
  tenantId: string,
  userId: string,
  data: ConnectEmailSyncInput,
) {
  // Check if sync already exists for this user + provider
  const existing = await repo.findEmailSync(tenantId, userId, data.provider);
  if (existing) {
    throw new ValidationError(
      `Email sync for ${data.provider} is already configured for this user`,
    );
  }

  return repo.createEmailSync(tenantId, userId, data);
}

export async function getEmailSyncs(tenantId: string, userId?: string) {
  return repo.findEmailSyncs(tenantId, userId);
}

export async function syncEmails(tenantId: string, userId: string) {
  const syncs = await repo.findEmailSyncs(tenantId, userId);
  if (syncs.length === 0) {
    throw new NotFoundError('EmailSync', userId);
  }

  // Stub: In a real implementation, this would call Gmail/Outlook APIs
  for (const sync of syncs) {
    logger.info(
      { syncId: sync.id, provider: sync.provider },
      'Email sync would be triggered (stub)',
    );
    await repo.updateEmailSyncStatus(sync.id, sync.status, new Date());
  }

  return { synced: syncs.length };
}

export async function disconnectEmailSync(
  tenantId: string,
  userId: string,
  provider: string,
) {
  const sync = await repo.findEmailSync(tenantId, userId, provider);
  if (!sync) {
    throw new NotFoundError('EmailSync', `${userId}/${provider}`);
  }

  return repo.updateEmailSyncStatus(sync.id, 'DISCONNECTED');
}
