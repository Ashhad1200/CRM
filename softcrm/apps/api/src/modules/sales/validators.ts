import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums) ─────────────────────────────────────────

export const lifecycleStageSchema = z.enum([
  'SUBSCRIBER',
  'LEAD',
  'MQL',
  'SQL',
  'OPPORTUNITY',
  'CUSTOMER',
  'EVANGELIST',
]);

export const leadSourceSchema = z.enum([
  'WEB_FORM',
  'LANDING_PAGE',
  'EMAIL',
  'SOCIAL',
  'REFERRAL',
  'COLD_CALL',
  'TRADE_SHOW',
  'PARTNER',
  'API',
  'OTHER',
]);

export const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CONVERTED',
]);

export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'BRL',
  'INR',
  'MXN',
]);

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

// ── Contact schemas ────────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  accountId: z.string().uuid().optional(),
  lifecycleStage: lifecycleStageSchema.optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  source: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  socialProfiles: z.record(z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  version: z.number().int().positive(),
});

export const listContactsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  lifecycleStage: lifecycleStageSchema.optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

// ── Account schemas ────────────────────────────────────────────────────────────

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  billingAddress: z.record(z.unknown()).optional(),
  shippingAddress: z.record(z.unknown()).optional(),
  parentAccountId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  annualRevenue: z.number().positive().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  version: z.number().int().positive(),
});

// ── Lead schemas ───────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: leadSourceSchema,
  notes: z.string().optional(),
});

export const convertLeadSchema = z.object({
  createContact: z.boolean().default(true),
  createDeal: z.boolean().default(true),
  dealName: z.string().optional(),
  pipelineId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export const listLeadsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  assignedOwnerId: z.string().uuid().optional(),
});

// ── Deal schemas ───────────────────────────────────────────────────────────────

export const createDealSchema = z.object({
  name: z.string().min(1).max(255),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  value: z.number().nonnegative().default(0),
  currency: currencySchema.default('USD'),
  expectedCloseDate: z.coerce.string().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  contactIds: z.array(z.string().uuid()).optional(),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  value: z.number().nonnegative().optional(),
  currency: currencySchema.optional(),
  expectedCloseDate: z.coerce.string().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  lostReason: z.string().optional(),
  version: z.number().int().positive(),
});

export const moveDealStageSchema = z.object({
  stageId: z.string().uuid(),
});

export const listDealsQuerySchema = paginationSchema.extend({
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  search: z.string().optional(),
});

// ── Quote schemas ──────────────────────────────────────────────────────────────

export const quoteLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  productId: z.string().uuid().optional(),
});

export const createQuoteSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().optional(),
  lines: z.array(quoteLineSchema).min(1),
  validUntil: z.coerce.string().optional(),
  notes: z.string().optional(),
});

export const updateQuoteSchema = z.object({
  title: z.string().optional(),
  validUntil: z.coerce.string().optional(),
  notes: z.string().optional(),
  version: z.number().int().positive(),
});

export const submitQuoteForApprovalSchema = z.object({});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealStageInput = z.infer<typeof moveDealStageSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteLineInput = z.infer<typeof quoteLineSchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
