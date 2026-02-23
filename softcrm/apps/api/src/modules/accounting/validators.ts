import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums from accounting.prisma) ──────────────────

export const accountTypeSchema = z.enum([
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
]);

export const invoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'PARTIAL',
  'PAID',
  'VOID',
  'OVERDUE',
]);

export const expenseStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const paymentMethodSchema = z.enum([
  'CASH',
  'CHECK',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'WIRE',
  'ACH',
  'OTHER',
]);

export const recurringFrequencySchema = z.enum([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
]);

export const fiscalPeriodStatusSchema = z.enum([
  'OPEN',
  'CLOSED',
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

// ── Chart of Accounts schemas ──────────────────────────────────────────────────

export const createChartOfAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: accountTypeSchema,
  parentId: z.string().uuid().optional(),
  isSystem: z.boolean().default(false),
});

export const updateChartOfAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

// ── Invoice schemas ────────────────────────────────────────────────────────────

export const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  accountId: z.string().uuid().optional(),
});

export const createInvoiceSchema = z.object({
  contactId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  currency: currencySchema.default('USD'),
  paymentTerms: z.string().optional(),
  dueDate: z.coerce.string().optional(),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export const updateDraftInvoiceSchema = createInvoiceSchema.partial().extend({
  version: z.number().int().positive(),
});

// ── Invoice action schemas ─────────────────────────────────────────────────────

export const sendInvoiceSchema = z.object({});

export const voidInvoiceSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ── Payment schemas ────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: paymentMethodSchema,
  date: z.coerce.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ── Journal Entry schemas ──────────────────────────────────────────────────────

export const journalLineInputSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  description: z.string().optional(),
});

export const createManualJournalEntrySchema = z.object({
  date: z.coerce.string(),
  description: z.string().min(1).max(500),
  reference: z.record(z.unknown()).optional(),
  lines: z.array(journalLineInputSchema).min(2),
});

// ── Expense schemas ────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  vendorName: z.string().min(1).max(255),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: currencySchema.default('USD'),
  categoryId: z.string().uuid(),
  date: z.coerce.string(),
  receiptUrl: z.string().url().optional(),
  projectId: z.string().uuid().optional(),
});

export const approveExpenseSchema = z.object({});

export const rejectExpenseSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ── Fiscal Period schemas ──────────────────────────────────────────────────────

export const closeFiscalPeriodSchema = z.object({});

// ── Report filter schemas ──────────────────────────────────────────────────────

export const dateRangeQuerySchema = paginationSchema.extend({
  startDate: z.coerce.string(),
  endDate: z.coerce.string(),
});

export const asOfDateQuerySchema = z.object({
  asOfDate: z.coerce.string(),
});

export const periodQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

// ── List query schemas ─────────────────────────────────────────────────────────

export const listInvoicesQuerySchema = paginationSchema.extend({
  status: invoiceStatusSchema.optional(),
  contactId: z.string().uuid().optional(),
  search: z.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

export const listJournalEntriesQuerySchema = paginationSchema.extend({
  periodId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

export const listExpensesQuerySchema = paginationSchema.extend({
  status: expenseStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateChartOfAccountInput = z.infer<typeof createChartOfAccountSchema>;
export type UpdateChartOfAccountInput = z.infer<typeof updateChartOfAccountSchema>;

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateDraftInvoiceInput = z.infer<typeof updateDraftInvoiceSchema>;
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type JournalLineInput = z.infer<typeof journalLineInputSchema>;
export type CreateManualJournalEntryInput = z.infer<typeof createManualJournalEntrySchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;

export type CloseFiscalPeriodInput = z.infer<typeof closeFiscalPeriodSchema>;

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type AsOfDateQuery = z.infer<typeof asOfDateQuerySchema>;
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
