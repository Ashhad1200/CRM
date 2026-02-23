import { lazy } from 'react';
import { Route } from 'react-router';

const Segments = lazy(() => import('./pages/segments'));
const CampaignList = lazy(() => import('./pages/campaign-list'));
const CampaignBuilder = lazy(() => import('./pages/campaign-builder'));
const CampaignDetail = lazy(() => import('./pages/campaign-detail'));
const Attribution = lazy(() => import('./pages/attribution'));

export function MarketingRoutes() {
  return (
    <>
      <Route path="segments" element={<Segments />} />
      <Route path="campaigns" element={<CampaignList />} />
      <Route path="campaigns/new" element={<CampaignBuilder />} />
      <Route path="campaigns/:id" element={<CampaignDetail />} />
      <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
      <Route path="attribution" element={<Attribution />} />
    </>
  );
}
