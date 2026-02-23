/**
 * Payment recording service.
 *
 * Records payments against invoices, creates the corresponding journal
 * entry (debit Cash, credit AR), and transitions invoice status to
 * PARTIAL or PAID.
 */

import { ValidationError } from '@softcrm/shared-kernel';
import * as repo from '../repository.js';
import * as journalEntryService from '../ledger/journal-entry.service.js';
import * as events from '../events.js';
import type { RecordPaymentInput } from '../validators.js';

// ── Record payment ─────────────────────────────────────────────────────────────

/**
 * Record a payment against an invoice.
 *
 * 1. Validate the invoice is payable (not VOID or DRAFT).
 * 2. Validate amount does not exceed the remaining balance.
 * 3. Create a journal entry: debit Cash (1000), credit AR (1200).
 * 4. Persist the payment record.
 * 5. Update invoice paidAmount and status (PARTIAL → PAID when fully settled).
 * 6. Publish payment.received event.
 */
export async function recordPayment(
  tenantId: string,
  invoiceId: string,
  data: RecordPaymentInput,
  actorId: string,
) {
  const invoice = await repo.findInvoice(tenantId, invoiceId);

  if (invoice.status === 'VOID' || invoice.status === 'DRAFT') {
    throw new ValidationError(
      'Cannot record payment on void or draft invoices',
    );
  }

  const remaining = Number(invoice.total) - Number(invoice.paidAmount);

  if (data.amount > remaining + 0.01) {
    throw new ValidationError(
      `Payment amount ${data.amount} exceeds remaining balance ${remaining}`,
    );
  }

  // Look up well-known system accounts
  const accounts = await repo.findChartOfAccounts(tenantId);
  const cashAccount = accounts.find((a) => a.code === '1000');
  const arAccount = accounts.find((a) => a.code === '1200');

  if (!cashAccount || !arAccount) {
    throw new ValidationError(
      'System accounts not configured: need Cash (1000) and AR (1200)',
    );
  }

  // Create JE: debit Cash, credit AR
  const je = await journalEntryService.createJournalEntry(
    tenantId,
    {
      date: new Date(data.date),
      description: `Payment received for Invoice #${invoice.invoiceNumber}`,
      reference: { invoiceId, type: 'payment_received' },
      lines: [
        {
          accountId: cashAccount.id,
          debit: data.amount,
          credit: 0,
          description: 'Cash received',
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: data.amount,
          description: 'AR reduction',
        },
      ],
    },
    actorId,
  );

  // Persist payment record
  await repo.createPayment(
    tenantId,
    {
      invoiceId,
      amount: data.amount,
      method: data.method,
      date: new Date(data.date),
      reference: data.reference,
      journalEntryId: je.id,
      notes: data.notes,
    },
    actorId,
  );

  // Update invoice totals and status
  const newPaidAmount = Number(invoice.paidAmount) + data.amount;
  const isFullyPaid =
    Math.abs(newPaidAmount - Number(invoice.total)) < 0.01;
  const newStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

  await repo.updateInvoiceStatus(tenantId, invoiceId, newStatus, {
    paidAmount: newPaidAmount,
    paidAt: isFullyPaid ? new Date() : undefined,
  });

  // Publish domain event
  await events.publishPaymentReceived(tenantId, actorId, {
    invoiceId,
    amount: data.amount,
    method: data.method,
    invoiceNumber: invoice.invoiceNumber,
    isFullyPaid,
  });

  return repo.findInvoice(tenantId, invoiceId);
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get all payments for a given invoice.
 */
export async function getPaymentsByInvoice(
  tenantId: string,
  invoiceId: string,
) {
  return repo.findPaymentsByInvoice(tenantId, invoiceId);
}
