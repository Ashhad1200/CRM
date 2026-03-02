import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed script — creates default tenant, admin user, roles, and Chart of Accounts.
 *
 * Run: pnpm --filter @softcrm/db seed
 */

const prisma = new PrismaClient();

// Password hasher for seed — must match auth.service.ts (bcryptjs)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // ── 1. Default Tenant ────────────────────────────────────────────────────────

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      status: 'ACTIVE',
      settings: {},
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id})`);

  // ── 2. Default Roles ────────────────────────────────────────────────────────

  const roleDefinitions = [
    { name: 'Super Admin', description: 'Full access to all modules and features' },
    { name: 'Sales Rep', description: 'Access to sales module with own-scope' },
    { name: 'Sales Manager', description: 'Access to sales module with team-scope' },
    { name: 'Accountant', description: 'Access to accounting module' },
    { name: 'Support Agent', description: 'Access to support module' },
    { name: 'Marketing Manager', description: 'Access to marketing module' },
    { name: 'Inventory Manager', description: 'Access to inventory module' },
    { name: 'Project Manager', description: 'Access to projects module' },
    { name: 'Read-Only', description: 'Read-only access to all modules' },
  ];

  const roles: Record<string, string> = {};
  for (const def of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: def.name,
        description: def.description,
        isSystem: true,
      },
    });
    roles[def.name] = role.id;
    console.log(`  ✓ Role: ${role.name}`);
  }

  // ── 3. Super Admin Module Permissions (full access) ──────────────────────────

  const modules = [
    'platform',
    'sales',
    'accounting',
    'support',
    'marketing',
    'inventory',
    'projects',
    'comms',
    'analytics',
    'workflows',
    'hr',
    'manufacturing',
    'warehouse',
    'procurement',
    'pos',
    'assets',
    'quality',
  ];

  for (const mod of modules) {
    await prisma.modulePermission.upsert({
      where: {
        roleId_module: { roleId: roles['Super Admin']!, module: mod },
      },
      update: {},
      create: {
        roleId: roles['Super Admin']!,
        module: mod,
        accessLevel: 'ADMIN',
      },
    });
  }
  console.log('  ✓ Super Admin permissions configured');

  // ── 4. Read-Only Module Permissions ──────────────────────────────────────────

  for (const mod of modules) {
    await prisma.modulePermission.upsert({
      where: {
        roleId_module: { roleId: roles['Read-Only']!, module: mod },
      },
      update: {},
      create: {
        roleId: roles['Read-Only']!,
        module: mod,
        accessLevel: 'READ',
      },
    });
  }
  console.log('  ✓ Read-Only permissions configured');

  // ── 5. Admin User ────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@softcrm.dev' } },
    update: { passwordHash: hashPassword('admin123!') },
    create: {
      tenantId: tenant.id,
      email: 'admin@softcrm.dev',
      passwordHash: hashPassword('admin123!'),
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
      mfaEnabled: false,
    },
  });
  console.log(`  ✓ Admin user: ${adminUser.email} (${adminUser.id})`);

  // Assign Super Admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: roles['Super Admin']! },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles['Super Admin']!,
    },
  });
  console.log('  ✓ Admin user assigned Super Admin role');

  // ── 6. Default Team ──────────────────────────────────────────────────────────

  const defaultTeam = await prisma.team.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Default Team' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Default Team',
      managerId: adminUser.id,
    },
  });
  console.log(`  ✓ Team: ${defaultTeam.name}`);

  await prisma.userTeam.upsert({
    where: {
      userId_teamId: { userId: adminUser.id, teamId: defaultTeam.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      teamId: defaultTeam.id,
    },
  });

  console.log('\n✅ Seed completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
