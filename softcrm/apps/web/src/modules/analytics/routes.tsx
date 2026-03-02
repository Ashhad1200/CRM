import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const Dashboard = lazy(() => import('./pages/dashboard'));
const ReportBuilder = lazy(() => import('./pages/report-builder'));
const Forecast = lazy(() => import('./pages/forecast'));
const TeamPerformance = lazy(() => import('./pages/team-performance'));

const tabs: ModuleTab[] = [
  { label: 'Dashboards', to: '.', end: true },
  { label: 'Reports', to: 'reports' },
  { label: 'Forecast', to: 'forecast' },
  { label: 'Team', to: 'team' },
];

export function AnalyticsRoutes() {
  return (
    <Routes>
      <Route element={<ModuleLayout title="Analytics" tabs={tabs} />}>
        <Route index element={<Dashboard />} />
        <Route path="reports" element={<ReportBuilder />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="team" element={<TeamPerformance />} />
      </Route>
    </Routes>
  );
}
