import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface Company { id: string; name: string; code: string; baseCurrency: string; fiscalYearEnd: number; isDefault: boolean; isActive: boolean; address?: unknown; }
export interface Budget { id: string; name: string; year: number; period: string; companyId: string; isActive: boolean; lines?: BudgetLine[]; }
export interface BudgetLine { id: string; accountId: string; month: number; amount: number; }
export interface BudgetVariance { accountId: string; accountName: string; budgeted: number; actual: number; variance: number; variancePercent: number; }
export interface CostCenter { id: string; code: string; name: string; companyId: string; parentId?: string; isActive: boolean; }
export interface CostCenterReportRow { costCenterId: string; name: string; code: string; totalDebit: number; totalCredit: number; netAmount: number; }
export interface BankTransaction { id: string; date: string; description: string; amount: number; currency: string; status: string; category?: string; matchedAccountId?: string; }
export interface ReconciliationSummary { pending: number; matched: number; reconciled: number; excluded: number; unreconciledTotal: number; }
export interface ExchangeRate { id: string; fromCurrency: string; toCurrency: string; rate: number; effectiveDate: string; source: string; }

/* ───────── Companies ───────── */

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => apiClient<{ data: Company[] }>('/api/v1/accounting/companies').then(r => r.data) });
}
export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<Company>) => apiClient<{ data: Company }>('/api/v1/accounting/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }) });
}
export function useSetDefaultCompany() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient<{ data: Company }>(`/api/v1/accounting/companies/${id}/set-default`, { method: 'POST' }).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }) });
}

/* ───────── Budgets ───────── */

export function useBudgets(companyId?: string) {
  return useQuery({ queryKey: ['budgets', companyId], queryFn: () => apiClient<{ data: Budget[] }>(`/api/v1/accounting/budgets${companyId ? `?companyId=${companyId}` : ''}`).then(r => r.data) });
}
export function useBudget(id?: string) {
  return useQuery({ queryKey: ['budget', id], queryFn: () => apiClient<{ data: Budget }>(`/api/v1/accounting/budgets/${id}`).then(r => r.data), enabled: !!id });
}
export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { name: string; year: number; period: string; companyId: string }) => apiClient<{ data: Budget }>('/api/v1/accounting/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }) });
}
export function useBudgetVariance(budgetId?: string, month?: number) {
  return useQuery({ queryKey: ['budget-variance', budgetId, month], queryFn: () => apiClient<{ data: BudgetVariance[] }>(`/api/v1/accounting/budgets/${budgetId}/variance${month ? `?month=${month}` : ''}`).then(r => r.data), enabled: !!budgetId });
}

/* ───────── Cost Centers ───────── */

export function useCostCenters(companyId?: string) {
  return useQuery({ queryKey: ['cost-centers', companyId], queryFn: () => apiClient<{ data: CostCenter[] }>(`/api/v1/accounting/cost-centers${companyId ? `?companyId=${companyId}` : ''}`).then(r => r.data) });
}
export function useCostCenterReport(companyId?: string, startDate?: string, endDate?: string) {
  return useQuery({ queryKey: ['cost-center-report', companyId, startDate, endDate], queryFn: () => apiClient<{ data: CostCenterReportRow[] }>(`/api/v1/accounting/cost-centers/report?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`).then(r => r.data), enabled: !!companyId && !!startDate && !!endDate });
}

/* ───────── Bank Feeds ───────── */

export function useBankTransactions(companyId?: string, status?: string) {
  return useQuery({ queryKey: ['bank-transactions', companyId, status], queryFn: () => apiClient<{ data: BankTransaction[] }>(`/api/v1/accounting/bank-feeds?companyId=${companyId}${status ? `&status=${status}` : ''}`).then(r => r.data), enabled: !!companyId });
}
export function useReconciliationSummary(companyId?: string) {
  return useQuery({ queryKey: ['reconciliation-summary', companyId], queryFn: () => apiClient<{ data: ReconciliationSummary }>(`/api/v1/accounting/bank-feeds/summary?companyId=${companyId}`).then(r => r.data), enabled: !!companyId });
}
export function useMatchTransaction() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, accountId }: { id: string; accountId: string }) => apiClient<{ data: BankTransaction }>(`/api/v1/accounting/bank-feeds/${id}/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) }).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-transactions'] }); qc.invalidateQueries({ queryKey: ['reconciliation-summary'] }); } });
}
export function useReconcileTransaction() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient<{ data: BankTransaction }>(`/api/v1/accounting/bank-feeds/${id}/reconcile`, { method: 'POST' }).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-transactions'] }); qc.invalidateQueries({ queryKey: ['reconciliation-summary'] }); } });
}

/* ───────── Exchange Rates ───────── */

export function useExchangeRates(companyId?: string) {
  return useQuery({ queryKey: ['exchange-rates', companyId], queryFn: () => apiClient<{ data: ExchangeRate[] }>(`/api/v1/accounting/fx-rates?companyId=${companyId}`).then(r => r.data), enabled: !!companyId });
}
export function useSetExchangeRate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { companyId: string; fromCurrency: string; toCurrency: string; rate: number; effectiveDate: string }) => apiClient<{ data: ExchangeRate }>('/api/v1/accounting/fx-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange-rates'] }) });
}

/* ───────── Consolidation ───────── */

export interface ConsolidatedReportSection {
  label: string;
  accounts: { accountId: string; code: string; name: string; balance: number; byCompany?: Record<string, number> }[];
  total: number;
}

export interface ConsolidatedPL {
  revenue: ConsolidatedReportSection;
  expenses: ConsolidatedReportSection;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export interface ConsolidatedBS {
  assets: ConsolidatedReportSection;
  liabilities: ConsolidatedReportSection;
  equity: ConsolidatedReportSection;
  asOfDate: string;
}

export function useConsolidatedProfitLoss(companyIds: string[], startDate?: string, endDate?: string) {
  const ids = companyIds.join(',');
  return useQuery({
    queryKey: ['consolidated-pl', ids, startDate, endDate],
    queryFn: () => apiClient<{ data: ConsolidatedPL }>(`/api/v1/accounting/consolidation/profit-loss?companyIds=${ids}&startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
    enabled: companyIds.length > 0 && !!startDate && !!endDate,
  });
}

export function useConsolidatedBalanceSheet(companyIds: string[], asOfDate?: string) {
  const ids = companyIds.join(',');
  return useQuery({
    queryKey: ['consolidated-bs', ids, asOfDate],
    queryFn: () => apiClient<{ data: ConsolidatedBS }>(`/api/v1/accounting/consolidation/balance-sheet?companyIds=${ids}&asOfDate=${asOfDate}`).then(r => r.data),
    enabled: companyIds.length > 0 && !!asOfDate,
  });
}
