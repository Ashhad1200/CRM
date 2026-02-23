/**
 * Recurring invoice processing service.
 *
 * Finds all active recurring invoice schedules whose `nextRunDate` has
 * arrived, creates a new invoice from the template, and advances the
 * schedule to the next occurrence.
 */

import * as repo from '../repository.js';

// ── Process due recurring invoices ─────────────────────────────────────────────

/**
 * Process all active recurring invoices whose `nextRunDate <= today`.
 *
 * For each schedule:
 * 1. Find the template invoice.
 * 2. Create a new invoice by copying the template lines.
 * 3. Advance `nextRunDate` based on the frequency.
 *
 * @returns Array of newly created invoices.
 */
export async function processRecurringInvoices(
  tenantId: string,
  actorId: string,
) {
  const recurring = await repo.findActiveRecurringInvoices(tenantId);
  const results: Awaited<ReturnType<typeof repo.createInvoice>>[] = [];

  for (const rec of recurring) {
    const template = await repo.findInvoice(tenantId, rec.templateInvoiceId);

    // Create new invoice from template
    const newInvoice = await repo.createInvoice(
      tenantId,
      {
        contactId: template.contactId ?? undefined,
        accountId: template.accountId ?? undefined,
        dealId: template.dealId ?? undefined,
        currency: template.currency,
        paymentTerms: template.paymentTerms ?? undefined,
        dueDate: calculateDueDate(rec.frequency).toISOString(),
        lines: template.lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount),
          taxRate: Number(l.taxRate),
          accountId: l.accountId ?? undefined,
        })),
      },
      actorId,
    );

    // Advance the schedule
    const nextRunDate = calculateNextRunDate(
      new Date(rec.nextRunDate),
      rec.frequency,
    );
    await repo.updateRecurringInvoiceNextRun(rec.id, nextRunDate, new Date());

    results.push(newInvoice);
  }

  return results;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Calculate the next run date by advancing `current` by the given frequency.
 */
function calculateNextRunDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'ANNUALLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Calculate a default due date (Net 30) from today.
 */
function calculateDueDate(_frequency: string): Date {
  const due = new Date();
  due.setDate(due.getDate() + 30);
  return due;
}
