import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense, lazy, type ComponentType } from 'react';
import { useAuth } from './providers/auth-provider';
import { NotificationProvider } from './providers/notification-provider';
import { CommandPaletteProvider } from './providers/command-palette-provider';
import { AppShell } from './layouts/app-shell';
import { AuthLayout } from './layouts/auth-layout';
import { ModuleLayout } from './layouts/module-layout';
import { LoadingOverlay } from '@softcrm/ui';

// Lazy-loaded module routes for code splitting
const SalesModule = lazy(() => import('./modules/sales/routes').then(m => ({ default: m.SalesRoutes as unknown as ComponentType })));
const AccountingModule = lazy(() => import('./modules/accounting/routes').then(m => ({ default: m.AccountingRoutes as unknown as ComponentType })));
const SupportModule = lazy(() => import('./modules/support/routes').then(m => ({ default: m.SupportRoutes as unknown as ComponentType })));
const InventoryModule = lazy(() => import('./modules/inventory/routes').then(m => ({ default: m.InventoryRoutes as unknown as ComponentType })));
const CommsModule = lazy(() => import('./modules/comms/routes').then(m => ({ default: m.CommsRoutes as unknown as ComponentType })));
const MarketingModule = lazy(() => import('./modules/marketing/routes').then(m => ({ default: m.MarketingRoutes as unknown as ComponentType })));
const AnalyticsModule = lazy(() => import('./modules/analytics/routes').then(m => ({ default: m.AnalyticsRoutes as unknown as ComponentType })));
const ProjectsModule = lazy(() => import('./modules/projects/routes').then(m => ({ default: m.ProjectsRoutes as unknown as ComponentType })));
const POSModule = lazy(() => import('./modules/pos/routes').then(m => ({ default: m.POSRoutes as unknown as ComponentType })));
const ProcurementModule = lazy(() => import('./modules/procurement/routes').then(m => ({ default: m.ProcurementRoutes as unknown as ComponentType })));
const ManufacturingModule = lazy(() => import('./modules/manufacturing/routes').then(m => ({ default: m.ManufacturingRoutes as unknown as ComponentType })));
const WarehouseModule = lazy(() => import('./modules/warehouse/routes').then(m => ({ default: m.WarehouseRoutes as unknown as ComponentType })));
const HRModule = lazy(() => import('./modules/hr/routes').then(m => ({ default: m.HRRoutes as unknown as ComponentType })));
const AssetsModule = lazy(() => import('./modules/assets/routes').then(m => ({ default: m.AssetsRoutes as unknown as ComponentType })));
const QualityModule = lazy(() => import('./modules/quality/routes').then(m => ({ default: m.QualityRoutes as unknown as ComponentType })));

// Dashboard
const DashboardPage = lazy(() => import('./modules/platform/pages/dashboard'));

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
const ThemeSettingsPage = lazy(() => import('./modules/platform/pages/theme-settings'));

// Portal layout & pages
const PortalShell = lazy(() => import('./layouts/portal-shell'));
const PortalTicketList = lazy(() => import('./modules/support/pages/portal/portal-ticket-list'));
const PortalTicketDetail = lazy(() => import('./modules/support/pages/portal/portal-ticket-detail'));
const PortalNewTicket = lazy(() => import('./modules/support/pages/portal/portal-new-ticket'));
const PortalKB = lazy(() => import('./modules/support/pages/portal/portal-kb'));
const PortalInvoices = lazy(() => import('./modules/support/pages/portal/portal-invoices'));
const PortalProject = lazy(() => import('./modules/projects/pages/portal-project'));

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
      <NotificationProvider>
        <CommandPaletteProvider>
          <Suspense fallback={<LoadingOverlay />}>
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
            <Route index element={<DashboardPage />} />
            <Route path="/sales/*" element={<SalesModule />} />
            <Route path="/accounting/*" element={<AccountingModule />} />
            <Route path="/support/*" element={<SupportModule />} />
            <Route path="/marketing/*" element={<MarketingModule />} />
            <Route path="/inventory/*" element={<InventoryModule />} />
            <Route path="/projects/*" element={<ProjectsModule />} />
            <Route path="/comms/*" element={<CommsModule />} />
            <Route path="/analytics/*" element={<AnalyticsModule />} />
            <Route path="/procurement/*" element={<ProcurementModule />} />
            <Route path="/pos/*" element={<POSModule />} />
            <Route path="/manufacturing/*" element={<ManufacturingModule />} />
            <Route path="/warehouse/*" element={<WarehouseModule />} />
            <Route path="/hr/*" element={<HRModule />} />
            <Route path="/assets/*" element={<AssetsModule />} />
            <Route path="/quality/*" element={<QualityModule />} />
            <Route path="/admin" element={
              <ModuleLayout
                title="Admin"
                tabs={[
                  { label: 'Users', to: 'users' },
                  { label: 'Roles', to: 'roles' },
                  { label: 'Custom Fields', to: 'custom-fields' },
                  { label: 'Workflows', to: 'workflows' },
                  { label: 'Audit Log', to: 'audit-log' },
                ]}
              />
            }>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="roles" element={<RolesListPage />} />
              <Route path="roles/:id" element={<RoleDetailPage />} />
              <Route path="custom-fields" element={<CustomFieldsPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="users" element={<UsersListPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:id" element={<WorkflowBuilderPage />} />
              <Route path="theme" element={<ThemeSettingsPage />} />
            </Route>
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
        </CommandPaletteProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
