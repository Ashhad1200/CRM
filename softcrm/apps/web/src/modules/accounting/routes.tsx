import { lazy } from 'react';
import { Route } from 'react-router';

const InvoicesList = lazy(() => import('./pages/invoices-list'));
const InvoiceDetail = lazy(() => import('./pages/invoice-detail'));
const ChartOfAccounts = lazy(() => import('./pages/chart-of-accounts'));
const JournalEntries = lazy(() => import('./pages/journal-entries'));
const ExpensesList = lazy(() => import('./pages/expenses-list'));
const Reports = lazy(() => import('./pages/reports'));

export function AccountingRoutes() {
  return (
    <>
      <Route path="invoices" element={<InvoicesList />} />
      <Route path="invoices/:id" element={<InvoiceDetail />} />
      <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
      <Route path="journal-entries" element={<JournalEntries />} />
      <Route path="expenses" element={<ExpensesList />} />
      <Route path="reports" element={<Reports />} />
    </>
  );
}
