import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const AssetsList = lazy(() => import('./pages/assets-list'));
const AssetDetail = lazy(() => import('./pages/asset-detail'));
const CategoriesList = lazy(() => import('./pages/categories-list'));
const MaintenanceList = lazy(() => import('./pages/maintenance-list'));
const TransfersList = lazy(() => import('./pages/transfers-list'));
const AuditsList = lazy(() => import('./pages/audits-list'));
const AuditDetail = lazy(() => import('./pages/audit-detail'));
const DisposalsList = lazy(() => import('./pages/disposals-list'));
const DepreciationReport = lazy(() => import('./pages/depreciation-report'));
const DepreciationRun = lazy(() => import('./pages/depreciation-run'));

const tabs: ModuleTab[] = [
  { label: 'Assets', to: 'assets' },
  { label: 'Categories', to: 'categories' },
  { label: 'Maintenance', to: 'maintenance' },
  { label: 'Transfers', to: 'transfers' },
  { label: 'Audits', to: 'audits' },
  { label: 'Disposals', to: 'disposals' },
  { label: 'Depreciation', to: 'depreciation' },
  { label: 'Depr. Run', to: 'depreciation-run' },
];

export function AssetsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="assets" replace />} />
      <Route element={<ModuleLayout title="Fixed Assets" tabs={tabs} />}>
        <Route path="assets" element={<AssetsList />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="categories" element={<CategoriesList />} />
        <Route path="maintenance" element={<MaintenanceList />} />
        <Route path="transfers" element={<TransfersList />} />
        <Route path="audits" element={<AuditsList />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="disposals" element={<DisposalsList />} />
        <Route path="depreciation" element={<DepreciationReport />} />
        <Route path="depreciation-run" element={<DepreciationRun />} />
      </Route>
    </Routes>
  );
}
