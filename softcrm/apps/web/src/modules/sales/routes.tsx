import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const ContactsList = lazy(() => import('./pages/contacts-list'));
const ContactDetail = lazy(() => import('./pages/contact-detail'));
const AccountsList = lazy(() => import('./pages/accounts-list'));
const AccountDetail = lazy(() => import('./pages/account-detail'));
const LeadsList = lazy(() => import('./pages/leads-list'));
const PipelinePage = lazy(() => import('./pages/pipeline'));
const DealDetail = lazy(() => import('./pages/deal-detail'));
const QuoteBuilder = lazy(() => import('./pages/quote-builder'));
const LeaderboardPage = lazy(() => import('./pages/leaderboard'));
const LeadScoringPage = lazy(() => import('./pages/lead-scoring'));

const tabs: ModuleTab[] = [
  { label: 'Pipeline', to: 'pipeline' },
  { label: 'Contacts', to: 'contacts' },
  { label: 'Accounts', to: 'accounts' },
  { label: 'Leads', to: 'leads' },
  { label: 'Leaderboard', to: 'leaderboard' },
  { label: 'Lead Scoring', to: 'lead-scoring' },
];

export function SalesRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="pipeline" replace />} />
      <Route element={<ModuleLayout title="Sales" tabs={tabs} />}>
        <Route path="contacts" element={<ContactsList />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="accounts" element={<AccountsList />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="leads" element={<LeadsList />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="deals/:id" element={<DealDetail />} />
        <Route path="deals/:dealId/quotes/new" element={<QuoteBuilder />} />
        <Route path="quotes/:id" element={<QuoteBuilder />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="lead-scoring" element={<LeadScoringPage />} />
      </Route>
    </Routes>
  );
}
