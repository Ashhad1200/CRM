import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  tenantId: string;
  contactId?: string;
  accountId?: string;
  dealId?: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  currency: string;
  notes?: string;
  createdAt: string;
  version: number;
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  date: string;
  description: string;
  reference?: unknown;
  fiscalPeriodId: string;
  reversedEntryId?: string;
  createdBy: string;
  createdAt: string;
  lines: JournalLine[];
}

export interface Expense {
  id: string;
  tenantId: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  categoryId: string;
  status: string;
  vendor?: string;
  receiptUrl?: string;
  rejectionReason?: string;
  submittedBy: string;
  approvedBy?: string;
  createdAt: string;
  category?: ChartOfAccount;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  totalDebits: number;
  totalCredits: number;
  balance: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface ProfitLossReport {
  startDate: string;
  endDate: string;
  revenue: { account: string; amount: number }[];
  expenses: { account: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: { account: string; amount: number }[];
  liabilities: { account: string; amount: number }[];
  equity: { account: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface ArAgingReport {
  current: { invoiceId: string; amount: number; contact?: string }[];
  days30: { invoiceId: string; amount: number; contact?: string }[];
  days60: { invoiceId: string; amount: number; contact?: string }[];
  days90: { invoiceId: string; amount: number; contact?: string }[];
  over90: { invoiceId: string; amount: number; contact?: string }[];
  totals: { current: number; days30: number; days60: number; days90: number; over90: number; total: number };
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const accountingKeys = {
  chartOfAccounts: ['accounting', 'coa'] as const,
  invoices: ['accounting', 'invoices'] as const,
  invoice: (id: string) => ['accounting', 'invoices', id] as const,
  invoicePayments: (id: string) => ['accounting', 'invoices', id, 'payments'] as const,
  overdueInvoices: ['accounting', 'invoices', 'overdue'] as const,
  journalEntries: ['accounting', 'journal-entries'] as const,
  expenses: ['accounting', 'expenses'] as const,
  expense: (id: string) => ['accounting', 'expenses', id] as const,
  reports: ['accounting', 'reports'] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Chart of Accounts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useChartOfAccounts() {
  return useQuery({
    queryKey: accountingKeys.chartOfAccounts,
    queryFn: () =>
      apiClient<{ data: ChartOfAccount[] }>('/api/v1/accounting/chart-of-accounts'),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<ChartOfAccount>>('/api/v1/accounting/chart-of-accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountingKeys.chartOfAccounts });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Invoices
   ═══════════════════════════════════════════════════════════════════════════ */

export function useInvoices(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...accountingKeys.invoices, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Invoice>>(buildUrl('/api/v1/accounting/invoices', filters)),
  });
}

export function useOverdueInvoices() {
  return useQuery({
    queryKey: accountingKeys.overdueInvoices,
    queryFn: () =>
      apiClient<{ data: Invoice[] }>('/api/v1/accounting/invoices/overdue'),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: accountingKeys.invoice(id),
    queryFn: () =>
      apiClient<Single<Invoice>>(`/api/v1/accounting/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Invoice>>('/api/v1/accounting/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountingKeys.invoices });
    },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Invoice>>(`/api/v1/accounting/invoices/${id}/send`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: accountingKeys.invoices });
      void qc.invalidateQueries({ queryKey: accountingKeys.invoice(vars.id) });
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Invoice>>(`/api/v1/accounting/invoices/${id}/void`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: accountingKeys.invoices });
      void qc.invalidateQueries({ queryKey: accountingKeys.invoice(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Invoice Payments
   ═══════════════════════════════════════════════════════════════════════════ */

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: accountingKeys.invoicePayments(invoiceId),
    queryFn: () =>
      apiClient<{ data: Payment[] }>(`/api/v1/accounting/invoices/${invoiceId}/payments`),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...data }: { invoiceId: string } & Record<string, unknown>) =>
      apiClient<Single<Payment>>(`/api/v1/accounting/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: accountingKeys.invoicePayments(vars.invoiceId) });
      void qc.invalidateQueries({ queryKey: accountingKeys.invoice(vars.invoiceId) });
      void qc.invalidateQueries({ queryKey: accountingKeys.invoices });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Journal Entries
   ═══════════════════════════════════════════════════════════════════════════ */

export function useJournalEntries(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...accountingKeys.journalEntries, filters] as const,
    queryFn: () =>
      apiClient<Paginated<JournalEntry>>(buildUrl('/api/v1/accounting/journal-entries', filters)),
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<JournalEntry>>('/api/v1/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountingKeys.journalEntries });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Expenses
   ═══════════════════════════════════════════════════════════════════════════ */

export function useExpenses(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...accountingKeys.expenses, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Expense>>(buildUrl('/api/v1/accounting/expenses', filters)),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: accountingKeys.expense(id),
    queryFn: () =>
      apiClient<Single<Expense>>(`/api/v1/accounting/expenses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Expense>>('/api/v1/accounting/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountingKeys.expenses });
    },
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Expense>>(`/api/v1/accounting/expenses/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: accountingKeys.expenses });
      void qc.invalidateQueries({ queryKey: accountingKeys.expense(vars.id) });
    },
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<Expense>>(`/api/v1/accounting/expenses/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: accountingKeys.expenses });
      void qc.invalidateQueries({ queryKey: accountingKeys.expense(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reports
   ═══════════════════════════════════════════════════════════════════════════ */

export function useProfitLoss(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [...accountingKeys.reports, 'profit-loss', startDate, endDate] as const,
    queryFn: () =>
      apiClient<{ data: ProfitLossReport }>(
        buildUrl('/api/v1/accounting/reports/profit-loss', { startDate, endDate }),
      ),
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: [...accountingKeys.reports, 'balance-sheet', asOfDate] as const,
    queryFn: () =>
      apiClient<{ data: BalanceSheetReport }>(
        buildUrl('/api/v1/accounting/reports/balance-sheet', { asOfDate }),
      ),
    enabled: !!asOfDate,
  });
}

export function useTrialBalance(year: string, month: string) {
  return useQuery({
    queryKey: [...accountingKeys.reports, 'trial-balance', year, month] as const,
    queryFn: () =>
      apiClient<{ data: TrialBalance }>(
        buildUrl('/api/v1/accounting/reports/trial-balance', { year, month }),
      ),
    enabled: !!year && !!month,
  });
}

export function useArAging() {
  return useQuery({
    queryKey: [...accountingKeys.reports, 'ar-aging'] as const,
    queryFn: () =>
      apiClient<{ data: ArAgingReport }>('/api/v1/accounting/reports/ar-aging'),
  });
}

export function useCloseFiscalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<unknown>>(`/api/v1/accounting/fiscal-periods/${id}/close`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountingKeys.reports });
    },
  });
}
