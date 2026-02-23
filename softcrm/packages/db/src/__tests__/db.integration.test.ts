import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration tests — verify the database schema, seed data, and tenant context.
 *
 * Requires DATABASE_URL pointing to a running PostgreSQL instance.
 */

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure connection is healthy
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('platform schema', () => {
  it('has a default tenant', async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
    expect(tenant).toBeDefined();
    expect(tenant!.name).toBe('Default Organization');
    expect(tenant!.status).toBe('ACTIVE');
  });

  it('has an admin user', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const admin = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@softcrm.dev' } },
    });
    expect(admin).toBeDefined();
    expect(admin!.firstName).toBe('System');
    expect(admin!.lastName).toBe('Admin');
    expect(admin!.status).toBe('ACTIVE');
    expect(admin!.passwordHash).toBeTruthy();
  });

  it('has 9 default roles', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const roles = await prisma.role.findMany({
      where: { tenantId: tenant.id, isSystem: true },
      orderBy: { name: 'asc' },
    });
    expect(roles.length).toBe(9);
    const names = roles.map((r) => r.name);
    expect(names).toContain('Super Admin');
    expect(names).toContain('Sales Rep');
    expect(names).toContain('Read-Only');
  });

  it('admin has Super Admin role', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@softcrm.dev' } },
      include: { userRoles: { include: { role: true } } },
    });
    const roleNames = admin.userRoles.map((ur) => ur.role.name);
    expect(roleNames).toContain('Super Admin');
  });

  it('Super Admin has all module permissions at ADMIN level', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const superAdmin = await prisma.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Super Admin' } },
    });
    const perms = await prisma.modulePermission.findMany({
      where: { roleId: superAdmin.id },
    });
    expect(perms.length).toBe(9);
    for (const p of perms) {
      expect(p.accessLevel).toBe('ADMIN');
    }
  });

  it('default team exists with admin as manager', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const team = await prisma.team.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Default Team' } },
    });
    expect(team).toBeDefined();
    expect(team!.managerId).toBeTruthy();
  });
});

describe('tenant context isolation', () => {
  it('tenant-context module exports correctly', async () => {
    // Dynamic import to verify the module resolves
    const { tenantContext } = await import('../tenant-context.js');
    expect(tenantContext.run).toBeTypeOf('function');
    expect(tenantContext.getTenantId).toBeTypeOf('function');
    expect(tenantContext.getTenantIdOrNull).toBeTypeOf('function');
  });

  it('throws when accessing tenantId outside context', async () => {
    const { tenantContext } = await import('../tenant-context.js');
    expect(() => tenantContext.getTenantId()).toThrow('outside of a tenant context');
  });

  it('returns undefined for getTenantIdOrNull outside context', async () => {
    const { tenantContext } = await import('../tenant-context.js');
    expect(tenantContext.getTenantIdOrNull()).toBeUndefined();
  });

  it('provides tenantId within a context run', async () => {
    const { tenantContext } = await import('../tenant-context.js');
    const result = tenantContext.run('test-tenant-123', () => {
      return tenantContext.getTenantId();
    });
    expect(result).toBe('test-tenant-123');
  });
});
