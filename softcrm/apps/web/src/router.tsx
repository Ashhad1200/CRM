import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense, lazy } from 'react';
import { useAuth } from './providers/auth-provider';
import { AppShell } from './layouts/app-shell';
import { AuthLayout } from './layouts/auth-layout';
import { SalesRoutes } from './modules/sales/routes';
import { AccountingRoutes } from './modules/accounting/routes';
import { SupportRoutes } from './modules/support/routes';
import { InventoryRoutes } from './modules/inventory/routes';
import { CommsRoutes } from './modules/comms/routes';
import { MarketingRoutes } from './modules/marketing/routes';
import { AnalyticsRoutes } from './modules/analytics/routes';
import { ProjectsRoutes } from './modules/projects/routes';

// Auth pages
const LoginPage = lazy(() => import('./modules/platform/pages/login'));

// Admin pages
const RolesListPage = lazy(() => import('./modules/platform/pages/roles-list'));
const RoleDetailPage = lazy(() => import('./modules/platform/pages/role-detail'));
const CustomFieldsPage = lazy(() => import('./modules/platform/pages/custom-fields'));
const AuditLogPage = lazy(() => import('./modules/platform/pages/audit-log'));
const UsersListPage = lazy(() => import('./modules/platform/pages/users-list'));
const WorkflowsPage = lazy(() => import('./modules/platform/pages/workflows'));
const WorkflowBuilderPage = lazy(() => import('./modules/platform/pages/workflow-builder'));

// Portal layout & pages
const PortalShell = lazy(() => import('./layouts/portal-shell'));
const PortalTicketList = lazy(() => import('./modules/support/pages/portal/portal-ticket-list'));
const PortalTicketDetail = lazy(() => import('./modules/support/pages/portal/portal-ticket-detail'));
const PortalNewTicket = lazy(() => import('./modules/support/pages/portal/portal-new-ticket'));
const PortalKB = lazy(() => import('./modules/support/pages/portal/portal-kb'));
const PortalInvoices = lazy(() => import('./modules/support/pages/portal/portal-invoices'));
const PortalProject = lazy(() => import('./modules/projects/pages/portal-project'));

// Module route stubs (lazy-loaded in future phases)
const DashboardPlaceholder = () => (
  <div className="text-gray-500">Select a module from the sidebar.</div>
);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        }
      >
        <Routes>
          {/* Auth routes */}
          <Route
            element={
              <GuestGuard>
                <AuthLayout />
              </GuestGuard>
            }
          >
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected app routes */}
          <Route
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardPlaceholder />} />
            <Route path="/sales/*">
              {SalesRoutes()}
            </Route>
            <Route path="/accounting/*">
              {AccountingRoutes()}
            </Route>
            <Route path="/support/*">
              {SupportRoutes()}
            </Route>
            <Route path="/marketing/*">
              {MarketingRoutes()}
            </Route>
            <Route path="/inventory/*">
              {InventoryRoutes()}
            </Route>
            <Route path="/projects/*">
              {ProjectsRoutes()}
            </Route>
            <Route path="/comms/*">
              {CommsRoutes()}
            </Route>
            <Route path="/analytics/*">
              {AnalyticsRoutes()}
            </Route>
            <Route path="/admin/roles" element={<RolesListPage />} />
            <Route path="/admin/roles/:id" element={<RoleDetailPage />} />
            <Route path="/admin/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
            <Route path="/admin/users" element={<UsersListPage />} />
            <Route path="/admin/workflows" element={<WorkflowsPage />} />
            <Route path="/admin/workflows/:id" element={<WorkflowBuilderPage />} />
            <Route path="/admin/*" element={<DashboardPlaceholder />} />
          </Route>

          {/* Customer self-service portal */}
          <Route
            element={
              <AuthGuard>
                <PortalShell />
              </AuthGuard>
            }
          >
            <Route path="/portal/tickets" element={<PortalTicketList />} />
            <Route path="/portal/tickets/new" element={<PortalNewTicket />} />
            <Route path="/portal/tickets/:id" element={<PortalTicketDetail />} />
            <Route path="/portal/kb" element={<PortalKB />} />
            <Route path="/portal/invoices" element={<PortalInvoices />} />
            <Route path="/portal/projects/:id" element={<PortalProject />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
