import { lazy } from 'react';
import { Route } from 'react-router';

const Dashboard = lazy(() => import('./pages/dashboard'));
const ReportBuilder = lazy(() => import('./pages/report-builder'));
const Forecast = lazy(() => import('./pages/forecast'));
const TeamPerformance = lazy(() => import('./pages/team-performance'));

export function AnalyticsRoutes() {
  return (
    <>
      <Route index element={<Dashboard />} />
      <Route path="reports" element={<ReportBuilder />} />
      <Route path="forecast" element={<Forecast />} />
      <Route path="team" element={<TeamPerformance />} />
    </>
  );
}
