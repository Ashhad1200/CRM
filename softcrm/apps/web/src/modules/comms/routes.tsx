import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const TimelinePage = lazy(() => import('./pages/timeline.js'));
const EmailTemplates = lazy(() => import('./pages/email-templates.js'));
const EmailSyncSettings = lazy(() => import('./pages/email-sync-settings.js'));

const tabs: ModuleTab[] = [
  { label: 'Timeline', to: 'timeline' },
  { label: 'Email Templates', to: 'email-templates' },
  { label: 'Email Sync', to: 'email-sync' },
];

export function CommsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="timeline" replace />} />
      <Route element={<ModuleLayout title="Communications" tabs={tabs} />}>
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="email-templates" element={<EmailTemplates />} />
        <Route path="email-sync" element={<EmailSyncSettings />} />
      </Route>
    </Routes>
  );
}
