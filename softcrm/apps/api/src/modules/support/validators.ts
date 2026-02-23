/**
 * Support module — Zod validation schemas.
 *
 * Each schema corresponds to a request body, query, or param shape.
 * Schemas are used by the `validate` middleware in routes.
 */

import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums) ─────────────────────────────────────────

export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const ticketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'WAITING_INTERNAL',
  'RESOLVED',
  'CLOSED',
]);

export const ticketChannelSchema = z.enum([
  'EMAIL',
  'PHONE',
  'CHAT',
  'PORTAL',
  'SOCIAL',
  'API',
]);

export const authorTypeSchema = z.enum(['AGENT', 'CUSTOMER', 'SYSTEM']);

export const articleStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Ticket schemas ─────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(500),
  description: z.string().min(1),
  priority: prioritySchema.optional(),
  channel: ticketChannelSchema.optional(),
  contactId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addReplySchema = z.object({
  body: z.string().min(1),
  authorType: authorTypeSchema.optional().default('AGENT'),
  isInternal: z.boolean().optional().default(false),
});

export type AddReplyInput = z.infer<typeof addReplySchema>;

export const resolveTicketSchema = z.object({
  resolution: z.string().optional(),
});

export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>;

export const escalateTicketSchema = z.object({
  reason: z.string().optional(),
});

export type EscalateTicketInput = z.infer<typeof escalateTicketSchema>;

export const submitCsatSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type SubmitCsatInput = z.infer<typeof submitCsatSchema>;

// ── Ticket list query schema ───────────────────────────────────────────────────

export const listTicketsQuerySchema = paginationSchema.extend({
  status: ticketStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedAgentId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

// ── KB Article schemas ─────────────────────────────────────────────────────────

export const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  status: articleStatusSchema.optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = createArticleSchema.partial();

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const listArticlesQuerySchema = paginationSchema.extend({
  status: articleStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const searchArticlesQuerySchema = z.object({
  q: z.string().min(1),
  ...paginationSchema.shape,
});

// ── KB Category schemas ────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  order: z.coerce.number().int().min(0).optional().default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
