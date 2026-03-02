import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const WorkOrdersKanban = lazy(() => import('./pages/work-orders-kanban'));
const WorkOrderDetail = lazy(() => import('./pages/work-order-detail'));
const BomsList = lazy(() => import('./pages/boms-list'));
const BomDetail = lazy(() => import('./pages/bom-detail'));
const RoutingsList = lazy(() => import('./pages/routings-list'));
const RoutingDetail = lazy(() => import('./pages/routing-detail'));
const WorkstationsList = lazy(() => import('./pages/workstations-list'));
const ProductionSchedule = lazy(() => import('./pages/production-schedule'));

const tabs: ModuleTab[] = [
  { label: 'Work Orders', to: 'work-orders' },
  { label: 'BOMs', to: 'boms' },
  { label: 'Routings', to: 'routings' },
  { label: 'Workstations', to: 'workstations' },
  { label: 'Schedule', to: 'schedule' },
];

export function ManufacturingRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="work-orders" replace />} />
      <Route element={<ModuleLayout title="Manufacturing" tabs={tabs} />}>
        <Route path="work-orders" element={<WorkOrdersKanban />} />
        <Route path="work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="boms" element={<BomsList />} />
        <Route path="boms/:id" element={<BomDetail />} />
        <Route path="routings" element={<RoutingsList />} />
        <Route path="routings/:id" element={<RoutingDetail />} />
        <Route path="workstations" element={<WorkstationsList />} />
        <Route path="schedule" element={<ProductionSchedule />} />
      </Route>
    </Routes>
  );
}
