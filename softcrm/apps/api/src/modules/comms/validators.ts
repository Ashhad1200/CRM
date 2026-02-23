/**
 * Comms module — Zod validation schemas.
 *
 * Each schema validates the shape of incoming HTTP request bodies/queries.
 * Inferred types are exported for use by service and repository layers.
 */

import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Activities ─────────────────────────────────────────────────────────────────

export const createActivitySchema = z.object({
  type: z.enum(['EMAIL', 'CALL', 'MEETING', 'NOTE', 'SMS']),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

// ── Calls ──────────────────────────────────────────────────────────────────────

export const logCallSchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  fromNumber: z.string().min(1),
  toNumber: z.string().min(1),
  duration: z.number().int().min(0).optional(),
  callSid: z.string().optional(),
  recordingUrl: z.string().url().optional(),
  status: z
    .enum([
      'INITIATED',
      'RINGING',
      'IN_PROGRESS',
      'COMPLETED',
      'NO_ANSWER',
      'BUSY',
      'FAILED',
      'CANCELLED',
    ])
    .optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
});

export type LogCallInput = z.infer<typeof logCallSchema>;

// ── Send Email ─────────────────────────────────────────────────────────────────

export const sendEmailSchema = z.object({
  contactId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
  mergeContext: z.record(z.unknown()).optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ── Email Templates ────────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  mergeFields: z.array(z.string()).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  mergeFields: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  version: z.number().int(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ── Email Sync ─────────────────────────────────────────────────────────────────

export const connectEmailSyncSchema = z.object({
  provider: z.enum(['GMAIL', 'OUTLOOK']),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type ConnectEmailSyncInput = z.infer<typeof connectEmailSyncSchema>;

// ── Query schemas for routes ───────────────────────────────────────────────────

export const listActivitiesQuerySchema = paginationSchema.extend({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: z.enum(['EMAIL', 'CALL', 'MEETING', 'NOTE', 'SMS']).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const timelineQuerySchema = paginationSchema.extend({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export const listTemplatesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const disconnectEmailSyncSchema = z.object({
  provider: z.enum(['GMAIL', 'OUTLOOK']),
});
