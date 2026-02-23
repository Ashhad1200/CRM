import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Per-model mock fns ─────────────────────────────────────────────────────────

const mockRoleFindFirst = vi.fn();
const mockRoleCreate = vi.fn();
const mockRoleUpdate = vi.fn();
const mockRoleDelete = vi.fn();

const mockUserRoleFindUnique = vi.fn();
const mockUserRoleCreate = vi.fn();
const mockUserRoleCount = vi.fn();

const mockModulePermFindMany = vi.fn();
const mockModulePermCreateMany = vi.fn();
const mockModulePermDeleteMany = vi.fn();

const mockEntityPermFindMany = vi.fn();
const mockEntityPermCreateMany = vi.fn();
const mockEntityPermDeleteMany = vi.fn();

const mockFieldPermFindMany = vi.fn();
const mockFieldPermCreateMany = vi.fn();
const mockFieldPermDeleteMany = vi.fn();

const mockTransaction = vi.fn();

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    role: {
      findFirst: mockRoleFindFirst,
      create: mockRoleCreate,
      update: mockRoleUpdate,
      delete: mockRoleDelete,
    },
    userRole: {
      findUnique: mockUserRoleFindUnique,
      create: mockUserRoleCreate,
      count: mockUserRoleCount,
    },
    modulePermission: {
      findMany: mockModulePermFindMany,
      createMany: mockModulePermCreateMany,
      deleteMany: mockModulePermDeleteMany,
    },
    entityPermission: {
      findMany: mockEntityPermFindMany,
      createMany: mockEntityPermCreateMany,
      deleteMany: mockEntityPermDeleteMany,
    },
    fieldPermission: {
      findMany: mockFieldPermFindMany,
      createMany: mockFieldPermCreateMany,
      deleteMany: mockFieldPermDeleteMany,
    },
    $transaction: mockTransaction,
  }),
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>(
    '@softcrm/shared-kernel',
  );
  return {
    ...actual,
    generateId: () => 'test-uuid-123',
  };
});

import {
  resolvePermissions,
  createRole,
  deleteRole,
  assignRoleToUser,
} from '../rbac.service.js';
import { ConflictError } from '@softcrm/shared-kernel';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── resolvePermissions ─────────────────────────────────────────────────────────

describe('resolvePermissions', () => {
  it('merges module permissions - most permissive wins (ADMIN > READ)', async () => {
    mockModulePermFindMany.mockResolvedValue([
      { roleId: 'r1', module: 'SALES', accessLevel: 'READ' },
      { roleId: 'r2', module: 'SALES', accessLevel: 'ADMIN' },
    ]);
    mockEntityPermFindMany.mockResolvedValue([]);
    mockFieldPermFindMany.mockResolvedValue([]);

    const result = await resolvePermissions(['r1', 'r2']);

    expect(result.modules.get('SALES')).toBe('ADMIN');
  });

  it('merges entity permissions - CRUD booleans ORed, scope ALL > OWN', async () => {
    mockModulePermFindMany.mockResolvedValue([]);
    mockEntityPermFindMany.mockResolvedValue([
      {
        roleId: 'r1',
        module: 'SALES',
        entity: 'Lead',
        scope: 'OWN',
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      },
      {
        roleId: 'r2',
        module: 'SALES',
        entity: 'Lead',
        scope: 'ALL',
        canCreate: false,
        canRead: false,
        canUpdate: true,
        canDelete: true,
      },
    ]);
    mockFieldPermFindMany.mockResolvedValue([]);

    const result = await resolvePermissions(['r1', 'r2']);

    const ep = result.entities.get('SALES:Lead');
    expect(ep).toBeDefined();
    expect(ep!.scope).toBe('ALL');
    expect(ep!.canCreate).toBe(true);
    expect(ep!.canRead).toBe(true);
    expect(ep!.canUpdate).toBe(true);
    expect(ep!.canDelete).toBe(true);
  });

  it('merges field permissions - visible/editable ORed', async () => {
    mockModulePermFindMany.mockResolvedValue([]);
    mockEntityPermFindMany.mockResolvedValue([]);
    mockFieldPermFindMany.mockResolvedValue([
      {
        roleId: 'r1',
        module: 'SALES',
        entity: 'Lead',
        field: 'revenue',
        visible: true,
        editable: false,
      },
      {
        roleId: 'r2',
        module: 'SALES',
        entity: 'Lead',
        field: 'revenue',
        visible: false,
        editable: true,
      },
    ]);

    const result = await resolvePermissions(['r1', 'r2']);

    const fp = result.fields.get('SALES:Lead:revenue');
    expect(fp).toBeDefined();
    expect(fp!.visible).toBe(true);
    expect(fp!.editable).toBe(true);
  });
});

// ── createRole ─────────────────────────────────────────────────────────────────

describe('createRole', () => {
  it('calls $transaction with correct data', async () => {
    // $transaction receives a callback; execute it against a mock tx proxy
    const txProxy = {
      role: { create: vi.fn().mockResolvedValue({ id: 'test-uuid-123', name: 'Sales Rep' }) },
      modulePermission: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      entityPermission: { createMany: vi.fn() },
      fieldPermission: { createMany: vi.fn() },
    };

    mockTransaction.mockImplementation(async (cb: (tx: typeof txProxy) => Promise<unknown>) => {
      return cb(txProxy);
    });

    const result = await createRole('tenant-1', {
      name: 'Sales Rep',
      description: 'Sales team role',
      modulePermissions: [{ module: 'SALES', accessLevel: 'WRITE' }],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(txProxy.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Sales Rep',
        }),
      }),
    );
    expect(txProxy.modulePermission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ module: 'SALES', accessLevel: 'WRITE' }),
        ]),
      }),
    );
    expect(result).toEqual({ id: 'test-uuid-123', name: 'Sales Rep' });
  });
});

// ── deleteRole ─────────────────────────────────────────────────────────────────

describe('deleteRole', () => {
  it('throws ConflictError when deleting system role', async () => {
    mockRoleFindFirst.mockResolvedValue({ id: 'sys-1', tenantId: 't1', isSystem: true });

    await expect(deleteRole('t1', 'sys-1')).rejects.toThrow(ConflictError);
    await expect(deleteRole('t1', 'sys-1')).rejects.toThrow('Cannot delete a system role');
  });

  it('throws ConflictError when role has assigned users', async () => {
    mockRoleFindFirst.mockResolvedValue({ id: 'r1', tenantId: 't1', isSystem: false });
    mockUserRoleCount.mockResolvedValue(3);

    await expect(deleteRole('t1', 'r1')).rejects.toThrow(ConflictError);
    await expect(deleteRole('t1', 'r1')).rejects.toThrow('3 user(s) still assigned');
  });
});

// ── assignRoleToUser ───────────────────────────────────────────────────────────

describe('assignRoleToUser', () => {
  it('throws ConflictError when user already has role', async () => {
    mockUserRoleFindUnique.mockResolvedValue({ userId: 'u1', roleId: 'r1' });

    await expect(assignRoleToUser('u1', 'r1', 'admin-1')).rejects.toThrow(ConflictError);
    await expect(assignRoleToUser('u1', 'r1', 'admin-1')).rejects.toThrow(
      'User already has this role',
    );
  });

  it('creates assignment when user does not have role', async () => {
    mockUserRoleFindUnique.mockResolvedValue(null);
    mockUserRoleCreate.mockResolvedValue({
      id: 'test-uuid-123',
      userId: 'u1',
      roleId: 'r1',
      assignedBy: 'admin-1',
    });

    const result = await assignRoleToUser('u1', 'r1', 'admin-1');

    expect(mockUserRoleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        roleId: 'r1',
        assignedBy: 'admin-1',
      }),
    });
    expect(result.userId).toBe('u1');
  });
});
