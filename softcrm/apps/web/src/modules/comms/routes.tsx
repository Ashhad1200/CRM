import { lazy } from 'react';
import { Route } from 'react-router';

const TimelinePage = lazy(() => import('./pages/timeline.js'));
const EmailTemplates = lazy(() => import('./pages/email-templates.js'));
const EmailSyncSettings = lazy(() => import('./pages/email-sync-settings.js'));

export function CommsRoutes() {
  return (
    <>
      <Route path="timeline" element={<TimelinePage />} />
      <Route path="email-templates" element={<EmailTemplates />} />
      <Route path="email-sync" element={<EmailSyncSettings />} />
    </>
  );
}
