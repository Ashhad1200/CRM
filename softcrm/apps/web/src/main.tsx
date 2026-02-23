import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './providers/query-provider';
import { AuthProvider } from './providers/auth-provider';
import { TenantProvider } from './providers/tenant-provider';
import { RbacProvider } from './providers/rbac-provider';
import { SocketProvider } from './providers/socket-provider';
import { AppRouter } from './router';
import './lib/i18n'; // Initialize i18n before rendering
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryProvider>
      <AuthProvider>
        <TenantProvider>
          <RbacProvider>
            <SocketProvider>
              <AppRouter />
            </SocketProvider>
          </RbacProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryProvider>
  </StrictMode>,
);
