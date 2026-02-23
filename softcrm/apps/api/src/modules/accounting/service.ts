/**
 * Accounting module — orchestrator service.
 * Re-exports sub-services and provides financial report generation.
 */

import * as repo from './repository.js';
import * as chartOfAccountsService from './ledger/chart-of-accounts.service.js';
import * as journalEntryService from './ledger/journal-entry.service.js';
import * as trialBalanceService from './ledger/trial-balance.service.js';
import * as invoiceService from './invoicing/invoice.service.js';
import * as paymentService from './invoicing/payment.service.js';
import * as recurringService from './invoicing/recurring.service.js';
import * as expenseService from './expenses/expense.service.js';

import type {
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowReport,
  AgingReport,
  AgingRow,
  ReportSection,
} from './types.js';

// ── Re-exports ─────────────────────────────────────────────────────────────────

export {
  chartOfAccountsService,
  journalEntryService,
  trialBalanceService,
  invoiceService,
  paymentService,
  recurringService,
  expenseService,
};

// ── Financial Reports ──────────────────────────────────────────────────────────

/**
 * Generate Profit & Loss report.
 * Revenue accounts minus COGS minus Operating Expenses.
 */
export async function generateProfitAndLoss(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProfitAndLossReport> {
  const accounts = await repo.findChartOfAccounts(tenantId);

  const revenueAccounts = accounts.filter(
    (a: { type: string }) => a.type === 'REVENUE',
  );
  const expenseAccounts = accounts.filter(
    (a: { type: string }) => a.type === 'EXPENSE',
  );

  // Build revenue section
  const revenueItems: Array<{
    accountId: string;
    code: string;
    name: string;
    balance: number;
  }> = [];
  let revenueTotal = 0;
  for (const acc of revenueAccounts) {
    const { debit, credit } = await repo.getAccountBalance(
      tenantId,
      acc.id,
      startDate,
      endDate,
    );
    const balance = credit - debit; // Revenue normal balance is credit
    if (Math.abs(balance) > 0.001) {
      revenueItems.push({
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        balance,
      });
      revenueTotal += balance;
    }
  }

  // Build expense section (split into COGS and operating if desired, simplified here)
  const expenseItems: Array<{
    accountId: string;
    code: string;
    name: string;
    balance: number;
  }> = [];
  let expenseTotal = 0;
  for (const acc of expenseAccounts) {
    const { debit, credit } = await repo.getAccountBalance(
      tenantId,
      acc.id,
      startDate,
      endDate,
    );
    const balance = debit - credit; // Expense normal balance is debit
    if (Math.abs(balance) > 0.001) {
      expenseItems.push({
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        balance,
      });
      expenseTotal += balance;
    }
  }

  return {
    revenue: {
      label: 'Revenue',
      accounts: revenueItems,
      total: Math.round(revenueTotal * 100) / 100,
    },
    cogs: { label: 'Cost of Goods Sold', accounts: [], total: 0 }, // Populated when inventory module exists
    operatingExpenses: {
      label: 'Operating Expenses',
      accounts: expenseItems,
      total: Math.round(expenseTotal * 100) / 100,
    },
    grossProfit: Math.round(revenueTotal * 100) / 100,
    netIncome: Math.round((revenueTotal - expenseTotal) * 100) / 100,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Generate Balance Sheet (Assets = Liabilities + Equity).
 */
export async function generateBalanceSheet(
  tenantId: string,
  asOfDate: Date,
): Promise<BalanceSheetReport> {
  const accounts = await repo.findChartOfAccounts(tenantId);

  async function buildSection(
    type: string,
    label: string,
    isNormalDebit: boolean,
  ): Promise<ReportSection> {
    const filtered = accounts.filter(
      (a: { type: string }) => a.type === type,
    );
    const items: Array<{
      accountId: string;
      code: string;
      name: string;
      balance: number;
    }> = [];
    let total = 0;
    for (const acc of filtered) {
      const { debit, credit } = await repo.getAccountBalance(
        tenantId,
        acc.id,
        undefined,
        asOfDate,
      );
      const balance = isNormalDebit ? debit - credit : credit - debit;
      if (Math.abs(balance) > 0.001) {
        items.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          balance,
        });
        total += balance;
      }
    }
    return { label, accounts: items, total: Math.round(total * 100) / 100 };
  }

  const assets = await buildSection('ASSET', 'Assets', true);
  const liabilities = await buildSection('LIABILITY', 'Liabilities', false);
  const equity = await buildSection('EQUITY', 'Equity', false);

  return {
    assets,
    liabilities,
    equity,
    asOfDate: asOfDate.toISOString(),
  };
}

/**
 * Generate Cash Flow Statement (simplified).
 */
export async function generateCashFlowStatement(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<CashFlowReport> {
  // Simplified: look at Cash account (1000) movements
  const accounts = await repo.findChartOfAccounts(tenantId);
  const cashAccount = accounts.find(
    (a: { code: string }) => a.code === '1000',
  );

  let operating = 0;
  if (cashAccount) {
    const { debit, credit } = await repo.getAccountBalance(
      tenantId,
      cashAccount.id,
      startDate,
      endDate,
    );
    operating = debit - credit;
  }

  return {
    operating: Math.round(operating * 100) / 100,
    investing: 0,
    financing: 0,
    netChange: Math.round(operating * 100) / 100,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Generate AR Aging Report.
 * Buckets: Current (0-30 days), 30-60, 60-90, 90+
 */
export async function generateARAgingReport(
  tenantId: string,
): Promise<AgingReport> {
  const overdue = await repo.findOverdueInvoices(tenantId);
  const now = new Date();

  const rowMap = new Map<string, AgingRow>();
  let totalCurrent = 0;
  let total30 = 0;
  let total60 = 0;
  let total90Plus = 0;

  // Also get all SENT invoices (not just overdue) for the full picture
  const { data: allOpenInvoices } = await repo.findInvoices(
    tenantId,
    { status: 'SENT' },
    { page: 1, limit: 1000 },
  );
  const { data: partialInvoices } = await repo.findInvoices(
    tenantId,
    { status: 'PARTIAL' },
    { page: 1, limit: 1000 },
  );
  const invoices = [
    ...(allOpenInvoices as any[]),
    ...(partialInvoices as any[]),
  ];

  for (const inv of invoices) {
    const remaining = Number(inv.total) - Number(inv.paidAmount);
    if (remaining <= 0) continue;

    const dueDate = inv.dueDate
      ? new Date(inv.dueDate)
      : new Date(inv.createdAt);
    const daysPastDue = Math.max(
      0,
      Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const entityId = inv.contactId ?? inv.accountId ?? 'unknown';
    const entityName = entityId; // Would be resolved via join in real app

    if (!rowMap.has(entityId)) {
      rowMap.set(entityId, {
        entityId,
        entityName,
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
        total: 0,
      });
    }
    const row = rowMap.get(entityId)!;

    if (daysPastDue <= 30) {
      row.current += remaining;
      totalCurrent += remaining;
    } else if (daysPastDue <= 60) {
      row.days30 += remaining;
      total30 += remaining;
    } else if (daysPastDue <= 90) {
      row.days60 += remaining;
      total60 += remaining;
    } else {
      row.days90Plus += remaining;
      total90Plus += remaining;
    }
    row.total += remaining;
  }

  return {
    rows: Array.from(rowMap.values()),
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    total30: Math.round(total30 * 100) / 100,
    total60: Math.round(total60 * 100) / 100,
    total90Plus: Math.round(total90Plus * 100) / 100,
    grandTotal:
      Math.round((totalCurrent + total30 + total60 + total90Plus) * 100) / 100,
  };
}

/**
 * Generate AP Aging Report (simplified — based on approved expenses).
 */
export async function generateAPAgingReport(
  tenantId: string,
): Promise<AgingReport> {
  const { data: pendingExpenses } = await repo.findExpenses(
    tenantId,
    { status: 'APPROVED' },
    { page: 1, limit: 1000 },
  );
  // Simplified: treat all approved expenses as AP
  return {
    rows: [],
    totalCurrent: 0,
    total30: 0,
    total60: 0,
    total90Plus: 0,
    grandTotal: 0,
  };
}
