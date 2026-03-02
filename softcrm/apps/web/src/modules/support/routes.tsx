import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const TicketsList = lazy(() => import('./pages/tickets-list.js'));
const TicketDetail = lazy(() => import('./pages/ticket-detail.js'));
const KBArticles = lazy(() => import('./pages/kb-articles.js'));
const KBArticleDetail = lazy(() => import('./pages/kb-article-detail.js'));
const CsatDashboard = lazy(() => import('./pages/csat-dashboard.js'));
const SlaDashboard = lazy(() => import('./pages/sla-dashboard'));
const ChatAgentPage = lazy(() => import('./pages/chat-agent'));

const tabs: ModuleTab[] = [
  { label: 'Tickets', to: 'tickets' },
  { label: 'Knowledge Base', to: 'kb' },
  { label: 'CSAT', to: 'csat' },
  { label: 'SLA', to: 'sla' },
  { label: 'Live Chat', to: 'chat' },
];

export function SupportRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="tickets" replace />} />
      <Route element={<ModuleLayout title="Support" tabs={tabs} />}>
        <Route path="tickets" element={<TicketsList />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="kb" element={<KBArticles />} />
        <Route path="kb/:id" element={<KBArticleDetail />} />
        <Route path="csat" element={<CsatDashboard />} />
        <Route path="sla" element={<SlaDashboard />} />
        <Route path="chat" element={<ChatAgentPage />} />
      </Route>
    </Routes>
  );
}
