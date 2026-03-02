import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const Segments = lazy(() => import('./pages/segments'));
const CampaignList = lazy(() => import('./pages/campaign-list'));
const CampaignBuilder = lazy(() => import('./pages/campaign-builder'));
const CampaignDetail = lazy(() => import('./pages/campaign-detail'));
const Attribution = lazy(() => import('./pages/attribution'));
const AutomationBuilder = lazy(() => import('./pages/automation-builder'));

const tabs: ModuleTab[] = [
  { label: 'Campaigns', to: 'campaigns' },
  { label: 'Segments', to: 'segments' },
  { label: 'Attribution', to: 'attribution' },
  { label: 'Automation', to: 'automation' },
];

export function MarketingRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="campaigns" replace />} />
      <Route element={<ModuleLayout title="Marketing" tabs={tabs} />}>
        <Route path="segments" element={<Segments />} />
        <Route path="campaigns" element={<CampaignList />} />
        <Route path="campaigns/new" element={<CampaignBuilder />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
        <Route path="attribution" element={<Attribution />} />
        <Route path="automation" element={<AutomationBuilder />} />
      </Route>
    </Routes>
  );
}
