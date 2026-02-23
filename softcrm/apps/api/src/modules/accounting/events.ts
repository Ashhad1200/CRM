/**
 * Accounting module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * (see `../../infra/outbox.ts`) polls for unpublished rows, projects
 * them into full `DomainEvent` objects and publishes them to the event
 * bus (BullMQ). This guarantees at-least-once delivery even if the
 * process crashes between commit and publish.
 */

import { generateId, EventTypes } from '@softcrm/shared-kernel';
import type { InvoicePaidPayload } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

interface OutboxPayload {
  tenantId: string;
  actorId: string;
  aggregateType: string;
  correlationId: string;
  data: unknown;
}

async function writeToOutbox(
  eventType: string,
  aggregateId: string,
  payload: OutboxPayload,
): Promise<void> {
  const db = getPrismaClient();
  await db.outbox.create({
    data: {
      id: generateId(),
      eventType,
      aggregateId,
      payload: payload as never,
      publishedAt: null,
    },
  });
}

// ── Invoice events ─────────────────────────────────────────────────────────────

export async function publishInvoiceCreated(
  tenantId: string,
  actorId: string,
  invoice: {
    id: string;
    invoiceNumber: number;
    total: number;
    contactId?: string | null;
    dealId?: string | null;
  },
): Promise<void> {
  await writeToOutbox(EventTypes.INVOICE_CREATED, invoice.id, {
    tenantId,
    actorId,
    aggregateType: 'Invoice',
    correlationId: generateId(),
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      contactId: invoice.contactId ?? null,
      dealId: invoice.dealId ?? null,
    },
  });
}

export async function publishInvoiceSent(
  tenantId: string,
  actorId: string,
  invoice: { id: string; invoiceNumber: number; total: number },
): Promise<void> {
  await writeToOutbox('invoice.sent', invoice.id, {
    tenantId,
    actorId,
    aggregateType: 'Invoice',
    correlationId: generateId(),
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
    },
  });
}

// ── Payment events ─────────────────────────────────────────────────────────────

export async function publishPaymentReceived(
  tenantId: string,
  actorId: string,
  payment: {
    invoiceId: string;
    amount: number;
    method: string;
    invoiceNumber: number;
    isFullyPaid: boolean;
  },
): Promise<void> {
  await writeToOutbox(EventTypes.PAYMENT_RECEIVED, payment.invoiceId, {
    tenantId,
    actorId,
    aggregateType: 'Invoice',
    correlationId: generateId(),
    data: {
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      method: payment.method,
      invoiceNumber: payment.invoiceNumber,
      isFullyPaid: payment.isFullyPaid,
    },
  });

  // When the invoice is fully paid, emit a separate INVOICE_PAID event
  if (payment.isFullyPaid) {
    const paidPayload: InvoicePaidPayload = {
      invoiceId: payment.invoiceId,
      dealId: '', // Resolved by caller or downstream consumer
      amount: {
        amount: String(payment.amount),
        currency: 'USD', // Resolved from invoice in real usage
      },
      paymentMethod: payment.method,
    };

    await writeToOutbox(EventTypes.INVOICE_PAID, payment.invoiceId, {
      tenantId,
      actorId,
      aggregateType: 'Invoice',
      correlationId: generateId(),
      data: paidPayload,
    });
  }
}

// ── Expense events ─────────────────────────────────────────────────────────────

export async function publishExpenseApproved(
  tenantId: string,
  actorId: string,
  expense: { expenseId: string; amount: number; vendorName: string },
): Promise<void> {
  await writeToOutbox('expense.approved', expense.expenseId, {
    tenantId,
    actorId,
    aggregateType: 'Expense',
    correlationId: generateId(),
    data: {
      expenseId: expense.expenseId,
      amount: expense.amount,
      vendorName: expense.vendorName,
    },
  });
}

// ── Fiscal Period events ───────────────────────────────────────────────────────

export async function publishPeriodClosed(
  tenantId: string,
  actorId: string,
  period: { id: string; year: number; month: number; name: string },
): Promise<void> {
  await writeToOutbox('period.closed', period.id, {
    tenantId,
    actorId,
    aggregateType: 'FiscalPeriod',
    correlationId: generateId(),
    data: {
      periodId: period.id,
      year: period.year,
      month: period.month,
      name: period.name,
    },
  });
}
