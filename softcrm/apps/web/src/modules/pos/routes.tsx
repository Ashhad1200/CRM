import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const RegistersList = lazy(() => import('./pages/registers-list'));
const RegisterDetail = lazy(() => import('./pages/register-detail'));
const SessionsList = lazy(() => import('./pages/sessions-list'));
const SessionDetail = lazy(() => import('./pages/session-detail'));
const TransactionsList = lazy(() => import('./pages/transactions-list'));
const TransactionDetail = lazy(() => import('./pages/transaction-detail'));
const TablesPage = lazy(() => import('./pages/tables'));
const KitchenDisplay = lazy(() => import('./pages/kitchen-display'));

const tabs: ModuleTab[] = [
  { label: 'Registers', to: 'registers' },
  { label: 'Sessions', to: 'sessions' },
  { label: 'Transactions', to: 'transactions' },
  { label: 'Tables', to: 'tables' },
  { label: 'Kitchen', to: 'kitchen' },
];

export function POSRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="registers" replace />} />
      <Route element={<ModuleLayout title="Point of Sale" tabs={tabs} />}>
        <Route path="registers" element={<RegistersList />} />
        <Route path="registers/:id" element={<RegisterDetail />} />
        <Route path="sessions" element={<SessionsList />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="transactions" element={<TransactionsList />} />
        <Route path="transactions/:id" element={<TransactionDetail />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="kitchen" element={<KitchenDisplay />} />
      </Route>
    </Routes>
  );
}
