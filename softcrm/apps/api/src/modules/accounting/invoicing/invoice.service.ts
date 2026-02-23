/**
 * Invoice lifecycle service.
 *
 * Handles creation (from deal or manual), querying, updating drafts,
 * sending (with journal entry), voiding (with reversing entry), and
 * overdue lookups.
 */

import {
  ValidationError,
  NotFoundError,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';
import * as repo from '../repository.js';
import * as journalEntryService from '../ledger/journal-entry.service.js';
import * as events from '../events.js';
import type { InvoiceWithLines, InvoiceFilters } from '../types.js';
import type { CreateInvoiceInput, UpdateDraftInvoiceInput } from '../validators.js';
import type { Pagination } from '../repository.js';

// ── Create from deal ───────────────────────────────────────────────────────────

/**
 * Create an invoice from a deal + quote (called by listeners when deal.won).
 * Maps quote lines to invoice lines.
 */
export async function createInvoiceFromDeal(
  tenantId: string,
  deal: { id: string; accountId?: string | null },
  quote: {
    lines: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
      productId?: string;
    }>;
  },
  contactId: string | undefined,
  actorId: string,
) {
  const lines = quote.lines.map((ql) => ({
    description: ql.description,
    quantity: ql.quantity,
    unitPrice: ql.unitPrice,
    discount: ql.discount,
    taxRate: ql.taxRate,
  }));

  return repo.createInvoice(
    tenantId,
    {
      contactId: contactId ?? undefined,
      accountId: deal.accountId ?? undefined,
      dealId: deal.id,
      currency: 'USD',
      paymentTerms: 'Net 30',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lines,
    },
    actorId,
  );
}

// ── Manual creation ────────────────────────────────────────────────────────────

/**
 * Create a manual invoice.
 */
export async function createInvoice(
  tenantId: string,
  data: CreateInvoiceInput,
  actorId: string,
) {
  return repo.createInvoice(tenantId, data, actorId);
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get invoices paginated.
 */
export async function getInvoices(
  tenantId: string,
  filters: InvoiceFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findInvoices(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

/**
 * Get single invoice by ID.
 */
export async function getInvoice(tenantId: string, id: string) {
  return repo.findInvoice(tenantId, id);
}

// ── Draft editing ──────────────────────────────────────────────────────────────

/**
 * Update a draft invoice.
 */
export async function updateDraftInvoice(
  tenantId: string,
  id: string,
  data: UpdateDraftInvoiceInput,
  actorId: string,
) {
  return repo.updateDraftInvoice(tenantId, id, data, actorId);
}

// ── Send ───────────────────────────────────────────────────────────────────────

/**
 * Send an invoice:
 * 1. Validate status is DRAFT
 * 2. Create journal entry: debit Accounts Receivable (1200), credit Revenue (4000)
 * 3. Update status to SENT, set sentAt
 * 4. Publish invoice.sent event
 */
export async function sendInvoice(
  tenantId: string,
  id: string,
  actorId: string,
) {
  const invoice = await repo.findInvoice(tenantId, id);

  if (invoice.status !== 'DRAFT') {
    throw new ValidationError('Only draft invoices can be sent');
  }

  // Look up well-known system accounts
  const accounts = await repo.findChartOfAccounts(tenantId);
  const arAccount = accounts.find((a) => a.code === '1200');
  const revenueAccount = accounts.find((a) => a.code === '4000');

  if (!arAccount || !revenueAccount) {
    throw new ValidationError(
      'System accounts not configured: need AR (1200) and Revenue (4000)',
    );
  }

  const totalAmount = Number(invoice.total);

  // Create journal entry: debit AR, credit Revenue
  await journalEntryService.createJournalEntry(
    tenantId,
    {
      date: new Date(),
      description: `Invoice #${invoice.invoiceNumber} sent`,
      reference: { invoiceId: invoice.id, type: 'invoice_sent' },
      lines: [
        {
          accountId: arAccount.id,
          debit: totalAmount,
          credit: 0,
          description: `AR for Invoice #${invoice.invoiceNumber}`,
        },
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: totalAmount,
          description: `Revenue for Invoice #${invoice.invoiceNumber}`,
        },
      ],
    },
    actorId,
  );

  // Transition status
  await repo.updateInvoiceStatus(tenantId, id, 'SENT', { sentAt: new Date() });

  // Publish domain event
  await events.publishInvoiceSent(tenantId, actorId, {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    total: totalAmount,
  });

  return repo.findInvoice(tenantId, id);
}

// ── Void ───────────────────────────────────────────────────────────────────────

/**
 * Void an invoice:
 * 1. Validate status is SENT or PARTIAL (not DRAFT, PAID, or already VOID)
 * 2. Create a reversing journal entry (credit AR, debit Revenue)
 * 3. Create a credit note
 * 4. Update status to VOID
 */
export async function voidInvoice(
  tenantId: string,
  id: string,
  reason: string,
  actorId: string,
) {
  const invoice = await repo.findInvoice(tenantId, id);

  if (invoice.status !== 'SENT' && invoice.status !== 'PARTIAL') {
    throw new ValidationError(
      'Only sent or partially paid invoices can be voided',
    );
  }

  // Look up well-known system accounts
  const accounts = await repo.findChartOfAccounts(tenantId);
  const arAccount = accounts.find((a) => a.code === '1200');
  const revenueAccount = accounts.find((a) => a.code === '4000');

  if (!arAccount || !revenueAccount) {
    throw new ValidationError('System accounts not configured');
  }

  const totalAmount = Number(invoice.total);

  // Create reversing JE (credit AR, debit Revenue — opposite of send)
  await journalEntryService.createJournalEntry(
    tenantId,
    {
      date: new Date(),
      description: `Void Invoice #${invoice.invoiceNumber}: ${reason}`,
      reference: { invoiceId: invoice.id, type: 'invoice_void' },
      lines: [
        {
          accountId: arAccount.id,
          debit: 0,
          credit: totalAmount,
          description: `Void AR for Invoice #${invoice.invoiceNumber}`,
        },
        {
          accountId: revenueAccount.id,
          debit: totalAmount,
          credit: 0,
          description: `Void Revenue for Invoice #${invoice.invoiceNumber}`,
        },
      ],
    },
    actorId,
  );

  // Create credit note for audit trail
  await repo.createCreditNote(
    tenantId,
    { invoiceId: id, amount: totalAmount, reason },
    actorId,
  );

  // Transition status
  await repo.updateInvoiceStatus(tenantId, id, 'VOID');

  return repo.findInvoice(tenantId, id);
}

// ── Overdue ────────────────────────────────────────────────────────────────────

/**
 * Get all overdue invoices (SENT or PARTIAL with dueDate in the past).
 */
export async function getOverdueInvoices(tenantId: string) {
  return repo.findOverdueInvoices(tenantId);
}
