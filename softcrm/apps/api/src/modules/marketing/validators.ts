/**
 * Marketing module — Zod validation schemas.
 *
 * Each schema validates the shape of incoming HTTP request bodies/queries.
 * Inferred types are exported for use by service and repository layers.
 */

import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

// ── Enum schemas ───────────────────────────────────────────────────────────────

export const campaignStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'PAUSED',
  'CANCELLED',
]);

export const campaignTypeSchema = z.enum([
  'EMAIL',
  'SMS',
  'SOCIAL',
  'EVENT',
]);

export const abVariantSchema = z.enum(['A', 'B']);

export const touchTypeSchema = z.enum(['FIRST', 'MID', 'LAST']);

// ── Segments ───────────────────────────────────────────────────────────────────

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  criteria: z.record(z.unknown()).optional(),
  isDynamic: z.boolean().optional(),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;

export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  criteria: z.record(z.unknown()).optional(),
  isDynamic: z.boolean().optional(),
});

export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;

// ── Campaigns ──────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  type: campaignTypeSchema.optional(),
  segmentId: z.string().uuid().optional(),
  subjectA: z.string().min(1).max(500),
  subjectB: z.string().max(500).optional(),
  bodyHtml: z.string().min(1),
  scheduledAt: z.coerce.date().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: campaignTypeSchema.optional(),
  segmentId: z.string().uuid().optional(),
  subjectA: z.string().min(1).max(500).optional(),
  subjectB: z.string().max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const scheduleCampaignSchema = z.object({
  sendAt: z.coerce.date(),
});

export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;

// ── Send Campaign ──────────────────────────────────────────────────────────────

export const sendCampaignSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
});

export type SendCampaignInput = z.infer<typeof sendCampaignSchema>;

// ── Webhooks ───────────────────────────────────────────────────────────────────

export const processWebhookSchema = z.object({
  recipientId: z.string().uuid(),
  event: z.enum(['delivered', 'opened', 'clicked', 'bounced', 'unsubscribed']),
});

export type ProcessWebhookInput = z.infer<typeof processWebhookSchema>;

// ── Touches ────────────────────────────────────────────────────────────────────

export const recordTouchSchema = z.object({
  contactId: z.string().uuid(),
  campaignId: z.string().uuid(),
  touchType: touchTypeSchema.optional(),
  dealId: z.string().uuid().optional(),
});

export type RecordTouchInput = z.infer<typeof recordTouchSchema>;

// ── Attribution ────────────────────────────────────────────────────────────────

export const attributionQuerySchema = paginationSchema.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  model: z.enum(['first', 'last', 'linear']).default('linear'),
});

export type AttributionQueryInput = z.infer<typeof attributionQuerySchema>;

// ── Query schemas for routes ───────────────────────────────────────────────────

export const listSegmentsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isDynamic: z.coerce.boolean().optional(),
});

export type ListSegmentsQuery = z.infer<typeof listSegmentsQuerySchema>;

export const listCampaignsQuerySchema = paginationSchema.extend({
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
  segmentId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;

export const listUnsubscribesQuerySchema = paginationSchema.extend({
  contactId: z.string().uuid().optional(),
});

export type ListUnsubscribesQuery = z.infer<typeof listUnsubscribesQuerySchema>;
