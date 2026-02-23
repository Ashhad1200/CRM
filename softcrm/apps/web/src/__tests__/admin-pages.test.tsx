import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

// ── Mock the platform API module ───────────────────────────────────────────────

vi.mock('../modules/platform/api', () => ({
  useRoles: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useCreateRole: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDeleteRole: () => ({ mutate: vi.fn(), isPending: false }),
  useAuditLog: () => ({
    data: { data: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCustomFieldDefs: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useCreateFieldDef: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDeleteFieldDef: () => ({ mutate: vi.fn(), isPending: false }),
  useUsers: () => ({ data: [], isLoading: false }),
}));

// ── Lazy imports so mocks take effect ──────────────────────────────────────────

import RolesListPage from '../modules/platform/pages/roles-list.js';
import AuditLogPage from '../modules/platform/pages/audit-log.js';
import CustomFieldsPage from '../modules/platform/pages/custom-fields.js';
import UsersListPage from '../modules/platform/pages/users-list.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Admin Pages', () => {
  it('RolesListPage renders "Roles" heading and "Create Role" button', () => {
    render(<RolesListPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
  });

  it('AuditLogPage renders "Audit Log" heading', () => {
    render(<AuditLogPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /audit log/i })).toBeInTheDocument();
  });

  it('CustomFieldsPage renders "Custom Fields" heading', () => {
    render(<CustomFieldsPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /custom fields/i })).toBeInTheDocument();
  });

  it('UsersListPage renders "Users" heading', () => {
    render(<UsersListPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  });
});
