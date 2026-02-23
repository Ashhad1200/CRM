import { lazy } from 'react';
import { Route } from 'react-router';

const ContactsList = lazy(() => import('./pages/contacts-list'));
const ContactDetail = lazy(() => import('./pages/contact-detail'));
const AccountsList = lazy(() => import('./pages/accounts-list'));
const AccountDetail = lazy(() => import('./pages/account-detail'));
const LeadsList = lazy(() => import('./pages/leads-list'));
const PipelinePage = lazy(() => import('./pages/pipeline'));
const DealDetail = lazy(() => import('./pages/deal-detail'));
const QuoteBuilder = lazy(() => import('./pages/quote-builder'));

export function SalesRoutes() {
  return (
    <>
      <Route path="contacts" element={<ContactsList />} />
      <Route path="contacts/:id" element={<ContactDetail />} />
      <Route path="accounts" element={<AccountsList />} />
      <Route path="accounts/:id" element={<AccountDetail />} />
      <Route path="leads" element={<LeadsList />} />
      <Route path="pipeline" element={<PipelinePage />} />
      <Route path="deals/:id" element={<DealDetail />} />
      <Route path="deals/:dealId/quotes/new" element={<QuoteBuilder />} />
      <Route path="quotes/:id" element={<QuoteBuilder />} />
    </>
  );
}
