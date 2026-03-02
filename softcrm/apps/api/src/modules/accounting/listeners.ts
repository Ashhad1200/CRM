/**
 * Accounting module — event listeners.
 *
 * Registers handlers for domain events published by other modules
 * (e.g. Sales) that the Accounting module needs to react to.
 */

import { EventTypes } from '@softcrm/shared-kernel';
import type { DealWonPayload } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';
import * as invoiceService from './invoicing/invoice.service.js';
import { logger } from '../../logger.js';

/**
 * Subscribe to deal.won event to auto-create invoices.
 * When a deal is won, find the most recent accepted quote,
 * and create an invoice from it.
 */
export async function handleDealWon(
  tenantId: string,
  actorId: string,
  payload: DealWonPayload,
): Promise<void> {
  try {
    const db = getPrismaClient();

    // Find the deal's most recent accepted (or any) quote with lines
    const quote = await db.quote.findFirst({
      where: { dealId: payload.dealId, tenantId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!quote || quote.lines.length === 0) {
      logger.warn(
        { dealId: payload.dealId },
        'No quote found for won deal — skipping invoice creation',
      );
      return;
    }

    // Map quote lines for invoice creation
    const quoteLines = quote.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      discount: Number(l.discount),
      taxRate: Number(l.taxRate),
    }));

    await invoiceService.createInvoiceFromDeal(
      tenantId,
      { id: payload.dealId, accountId: payload.accountId || null },
      { lines: quoteLines },
      payload.contactId || undefined,
      actorId,
    );

    logger.info({ dealId: payload.dealId }, 'Invoice auto-created from won deal');
  } catch (error) {
    logger.error(
      { error, dealId: payload.dealId },
      'Failed to create invoice from won deal',
    );
  }
}

/**
 * Handle payroll.approved event — auto-create journal entry for payroll.
 * Debits salary/wage expense accounts, credits payroll liability.
 */
export async function handlePayrollApproved(
  tenantId: string,
  actorId: string,
  payload: {
    payrollId: string;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    period: string;
    description?: string;
  },
): Promise<void> {
  try {
    const db = getPrismaClient();
    const { generateId } = await import('@softcrm/shared-kernel');

    // Find or default the expense and liability accounts
    const salaryAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, type: 'EXPENSE', code: { startsWith: '6' }, isActive: true },
      orderBy: { code: 'asc' },
    });
    const payableLiability = await db.chartOfAccount.findFirst({
      where: { tenantId, type: 'LIABILITY', code: { startsWith: '2' }, isActive: true },
      orderBy: { code: 'asc' },
    });

    if (!salaryAccount || !payableLiability) {
      logger.warn(
        { payrollId: payload.payrollId },
        'Missing salary expense or payroll liability account — skipping JE',
      );
      return;
    }

    // Find or create fiscal period for the payroll date
    const now = new Date();
    const period = await db.fiscalPeriod.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: { startDate: 'desc' },
    });

    if (!period) {
      logger.warn({ payrollId: payload.payrollId }, 'No open fiscal period — skipping payroll JE');
      return;
    }

    // Create the double-entry journal entry
    await db.journalEntry.create({
      data: {
        id: generateId(),
        tenantId,
        date: now,
        description: payload.description || `Payroll — ${payload.period}`,
        reference: { payrollId: payload.payrollId, type: 'payroll' },
        periodId: period.id,
        createdBy: actorId,
        lines: {
          create: [
            {
              id: generateId(),
              accountId: salaryAccount.id,
              debit: payload.totalGross,
              credit: 0,
              description: `Salary expense — ${payload.period}`,
            },
            {
              id: generateId(),
              accountId: payableLiability.id,
              debit: 0,
              credit: payload.totalGross,
              description: `Payroll payable — ${payload.period}`,
            },
          ],
        },
      },
    });

    logger.info(
      { payrollId: payload.payrollId, amount: payload.totalGross },
      'Payroll journal entry created',
    );
  } catch (error) {
    logger.error(
      { error, payrollId: payload.payrollId },
      'Failed to create payroll journal entry',
    );
  }
}

/**
 * Register all accounting event listeners.
 * Called during module initialization.
 */
export function registerListeners(): void {
  // Listeners are registered via the event bus (BullMQ).
  // The actual registration happens in the module bootstrap.
  // This is a placeholder for the event handler mapping.
}
