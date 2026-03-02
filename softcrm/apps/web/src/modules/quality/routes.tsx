import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const InspectionsList = lazy(() => import('./pages/inspections-list'));
const InspectionDetail = lazy(() => import('./pages/inspection-detail'));
const InspectionConduct = lazy(() => import('./pages/inspection-conduct'));
const ChecklistsList = lazy(() => import('./pages/checklists-list'));
const ChecklistEditor = lazy(() => import('./pages/checklist-editor'));
const TestPlansList = lazy(() => import('./pages/test-plans-list'));
const TestPlanEditor = lazy(() => import('./pages/test-plan-editor'));
const NCRsList = lazy(() => import('./pages/ncrs-list'));
const NCRDetail = lazy(() => import('./pages/ncr-detail'));
const CAPAsList = lazy(() => import('./pages/capas-list'));
const CAPADetail = lazy(() => import('./pages/capa-detail'));
const QualityReports = lazy(() => import('./pages/quality-reports'));

const tabs: ModuleTab[] = [
  { label: 'Inspections', to: 'inspections' },
  { label: 'Checklists', to: 'checklists' },
  { label: 'Test Plans', to: 'test-plans' },
  { label: 'NCRs', to: 'ncrs' },
  { label: 'CAPAs', to: 'capas' },
  { label: 'Reports', to: 'reports' },
];

export function QualityRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="inspections" replace />} />
      <Route element={<ModuleLayout title="Quality Control" tabs={tabs} />}>
        <Route path="inspections" element={<InspectionsList />} />
        <Route path="inspections/:id" element={<InspectionDetail />} />
        <Route path="inspections/:id/conduct" element={<InspectionConduct />} />
        <Route path="checklists" element={<ChecklistsList />} />
        <Route path="checklists/new" element={<ChecklistEditor />} />
        <Route path="checklists/:id" element={<ChecklistEditor />} />
        <Route path="test-plans" element={<TestPlansList />} />
        <Route path="test-plans/new" element={<TestPlanEditor />} />
        <Route path="test-plans/:id" element={<TestPlanEditor />} />
        <Route path="ncrs" element={<NCRsList />} />
        <Route path="ncrs/:id" element={<NCRDetail />} />
        <Route path="capas" element={<CAPAsList />} />
        <Route path="capas/:id" element={<CAPADetail />} />
        <Route path="reports" element={<QualityReports />} />
      </Route>
    </Routes>
  );
}
