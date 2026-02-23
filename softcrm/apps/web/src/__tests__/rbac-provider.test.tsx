import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RbacProvider, useRbac, useRbacStore, Can } from '../providers/rbac-provider';
import { AuthProvider, useAuthStore } from '../providers/auth-provider';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

// Pre-seed auth so the provider thinks we're logged in
function setupAuth() {
  useAuthStore.getState().setAuth('fake-token', {
    userId: 'u1',
    tenantId: 't1',
    roles: ['admin'],
    email: 'admin@test.com',
    name: 'Admin',
  });
}

function setupPermissions() {
  useRbacStore.getState().setPermissions({
    sales: {
      access: 'write',
      entities: {
        deal: {
          actions: { create: true, read: true, update: true, delete: false },
          scope: 'all',
          fields: {
            value: { visible: true, editable: true },
            secret: { visible: false, editable: false },
          },
        },
        lead: {
          actions: { create: true, read: true, update: false, delete: false },
          scope: 'own',
        },
      },
    },
    accounting: {
      access: 'none',
      entities: {},
    },
  });
}

function PermissionTester({
  module,
  entity,
  action,
}: {
  module: string;
  entity: string;
  action: 'create' | 'read' | 'update' | 'delete';
}) {
  const { hasPermission } = useRbac();
  const result = hasPermission(module, entity, action);
  return <span data-testid="result">{String(result)}</span>;
}

function FieldPermissionTester({
  module,
  entity,
  field,
}: {
  module: string;
  entity: string;
  field: string;
}) {
  const { getFieldPermission } = useRbac();
  const perm = getFieldPermission(module, entity, field);
  return (
    <span data-testid="result">
      {`visible:${String(perm.visible)},editable:${String(perm.editable)}`}
    </span>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RbacProvider>{children}</RbacProvider>
    </AuthProvider>
  );
}

describe('RbacProvider', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);
    useAuthStore.getState().clearAuth();
    useRbacStore.getState().clear();
  });

  it('returns true for permitted actions', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <PermissionTester module="sales" entity="deal" action="create" />
      </Wrapper>,
    );
    expect(screen.getByTestId('result').textContent).toBe('true');
  });

  it('returns false for denied actions', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <PermissionTester module="sales" entity="deal" action="delete" />
      </Wrapper>,
    );
    expect(screen.getByTestId('result').textContent).toBe('false');
  });

  it('returns false for denied modules', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <PermissionTester module="accounting" entity="invoice" action="read" />
      </Wrapper>,
    );
    expect(screen.getByTestId('result').textContent).toBe('false');
  });

  it('returns false for unknown modules', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <PermissionTester module="unknown" entity="thing" action="read" />
      </Wrapper>,
    );
    expect(screen.getByTestId('result').textContent).toBe('false');
  });

  it('field permissions return correct values', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <FieldPermissionTester module="sales" entity="deal" field="secret" />
      </Wrapper>,
    );
    expect(screen.getByTestId('result').textContent).toBe(
      'visible:false,editable:false',
    );
  });

  it('Can component renders children when permitted', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <Can module="sales" entity="deal" action="read">
          <span data-testid="allowed">Allowed</span>
        </Can>
      </Wrapper>,
    );
    expect(screen.getByTestId('allowed')).toBeDefined();
  });

  it('Can component renders fallback when denied', () => {
    setupAuth();
    setupPermissions();

    render(
      <Wrapper>
        <Can
          module="accounting"
          entity="invoice"
          action="read"
          fallback={<span data-testid="denied">Denied</span>}
        >
          <span data-testid="allowed">Allowed</span>
        </Can>
      </Wrapper>,
    );
    expect(screen.queryByTestId('allowed')).toBeNull();
    expect(screen.getByTestId('denied')).toBeDefined();
  });
});
