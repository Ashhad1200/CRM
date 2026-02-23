import { lazy } from 'react';
import { Route } from 'react-router';

const TicketsList = lazy(() => import('./pages/tickets-list.js'));
const TicketDetail = lazy(() => import('./pages/ticket-detail.js'));
const KBArticles = lazy(() => import('./pages/kb-articles.js'));
const KBArticleDetail = lazy(() => import('./pages/kb-article-detail.js'));
const CsatDashboard = lazy(() => import('./pages/csat-dashboard.js'));

export function SupportRoutes() {
  return (
    <>
      <Route path="tickets" element={<TicketsList />} />
      <Route path="tickets/:id" element={<TicketDetail />} />
      <Route path="kb" element={<KBArticles />} />
      <Route path="kb/:id" element={<KBArticleDetail />} />
      <Route path="csat" element={<CsatDashboard />} />
    </>
  );
}
