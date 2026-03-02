import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const InvoicesList = lazy(() => import('./pages/invoices-list'));
const InvoiceDetail = lazy(() => import('./pages/invoice-detail'));
const ChartOfAccounts = lazy(() => import('./pages/chart-of-accounts'));
const JournalEntries = lazy(() => import('./pages/journal-entries'));
const ExpensesList = lazy(() => import('./pages/expenses-list'));
const Reports = lazy(() => import('./pages/reports'));
const BudgetManagement = lazy(() => import('./pages/budget-management'));
const CostCenterReport = lazy(() => import('./pages/cost-center-report'));
const BankReconciliation = lazy(() => import('./pages/bank-reconciliation'));
const FxRates = lazy(() => import('./pages/fx-rates'));
const Consolidation = lazy(() => import('./pages/consolidation'));

const tabs: ModuleTab[] = [
  { label: 'Invoices', to: 'invoices' },
  { label: 'Expenses', to: 'expenses' },
  { label: 'Chart of Accounts', to: 'chart-of-accounts' },
  { label: 'Journal Entries', to: 'journal-entries' },
  { label: 'Reports', to: 'reports' },
  { label: 'Budgets', to: 'budgets' },
  { label: 'Cost Centers', to: 'cost-centers' },
  { label: 'Bank Feeds', to: 'bank-feeds' },
  { label: 'FX Rates', to: 'fx-rates' },
  { label: 'Consolidation', to: 'consolidation' },
];

export function AccountingRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="invoices" replace />} />
      <Route element={<ModuleLayout title="Accounting" tabs={tabs} />}>
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="journal-entries" element={<JournalEntries />} />
        <Route path="expenses" element={<ExpensesList />} />
        <Route path="reports" element={<Reports />} />
        <Route path="budgets" element={<BudgetManagement />} />
        <Route path="cost-centers" element={<CostCenterReport />} />
        <Route path="bank-feeds" element={<BankReconciliation />} />
        <Route path="fx-rates" element={<FxRates />} />
        <Route path="consolidation" element={<Consolidation />} />
      </Route>
    </Routes>
  );
}
