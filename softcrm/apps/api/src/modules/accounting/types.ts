/**
 * Prisma Decimal-compatible type.
 * At runtime values arrive as Prisma `Decimal` instances; this alias keeps the
 * types file independent of a direct `@prisma/client` import.
 */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** Invoice with all line items and payments eagerly loaded. */
export interface InvoiceWithLines {
  id: string;
  tenantId: string;
  invoiceNumber: number;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  status: string;
  currency: string;
  subtotal: DecimalValue;
  taxAmount: DecimalValue;
  total: DecimalValue;
  paidAmount: DecimalValue;
  paymentTerms: string | null;
  dueDate: Date | null;
  sentAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  lines: Array<{
    id: string;
    invoiceId: string;
    description: string;
    quantity: DecimalValue;
    unitPrice: DecimalValue;
    discount: DecimalValue;
    taxRate: DecimalValue;
    lineTotal: DecimalValue;
    accountId: string | null;
  }>;
  payments: Array<{
    id: string;
    tenantId: string;
    invoiceId: string;
    amount: DecimalValue;
    method: string;
    date: Date;
    reference: string | null;
    journalEntryId: string | null;
    notes: string | null;
    createdAt: Date;
    createdBy: string | null;
  }>;
}

/** Journal entry with all debit/credit lines eagerly loaded. */
export interface JournalEntryWithLines {
  id: string;
  tenantId: string;
  date: Date;
  description: string;
  reference: unknown;
  periodId: string;
  postedAt: Date | null;
  isReversing: boolean;
  reversedEntryId: string | null;
  createdAt: Date;
  createdBy: string | null;
  lines: Array<{
    id: string;
    journalEntryId: string;
    accountId: string;
    debit: DecimalValue;
    credit: DecimalValue;
    description: string | null;
    account: {
      id: string;
      code: string;
      name: string;
      type: string;
    };
  }>;
}

/** Chart of accounts entry with computed balance. */
export interface AccountWithBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  balance: number;
}

// ── Report types ───────────────────────────────────────────────────────────────

/** Single row in a trial balance report. */
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

/** Complete trial balance result. */
export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

/** Profit and loss (income statement) report. */
export interface ProfitAndLossReport {
  revenue: ReportSection;
  cogs: ReportSection;
  operatingExpenses: ReportSection;
  grossProfit: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

/** Balance sheet report at a point in time. */
export interface BalanceSheetReport {
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection;
  asOfDate: string;
}

/** A section within a financial report (e.g. "Assets", "Revenue"). */
export interface ReportSection {
  label: string;
  accounts: Array<{
    accountId: string;
    code: string;
    name: string;
    balance: number;
  }>;
  total: number;
}

/** Cash flow statement for a date range. */
export interface CashFlowReport {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  startDate: string;
  endDate: string;
}

// ── Aging reports ──────────────────────────────────────────────────────────────

/** Accounts receivable / accounts payable aging report. */
export interface AgingReport {
  rows: AgingRow[];
  totalCurrent: number;
  total30: number;
  total60: number;
  total90Plus: number;
  grandTotal: number;
}

/** Single row in an aging report. */
export interface AgingRow {
  entityId: string;
  entityName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface InvoiceFilters {
  status?: string;
  contactId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface JournalEntryFilters {
  periodId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseFilters {
  status?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}
