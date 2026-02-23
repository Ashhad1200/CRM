import { getPrismaClient } from '@softcrm/db';
import { generateId, ConflictError, NotFoundError } from '@softcrm/shared-kernel';
import type { CreateRoleInput, UpdateRoleInput } from './rbac.validators.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EntityPerm {
  scope: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface FieldPerm {
  visible: boolean;
  editable: boolean;
}

export interface ResolvedPermissions {
  modules: Map<string, string>;
  entities: Map<string, EntityPerm>;
  fields: Map<string, FieldPerm>;
}

// ── Access-level ordinal for comparison ────────────────────────────────────────

const ACCESS_LEVEL_ORDER: Record<string, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
};

const ORDER_TO_LEVEL: Record<number, string> = {
  0: 'NONE',
  1: 'READ',
  2: 'WRITE',
  3: 'ADMIN',
};

const SCOPE_ORDER: Record<string, number> = {
  OWN: 0,
  TEAM: 1,
  ALL: 2,
};

const ORDER_TO_SCOPE: Record<number, string> = {
  0: 'OWN',
  1: 'TEAM',
  2: 'ALL',
};

// ── List roles ─────────────────────────────────────────────────────────────────

export async function listRoles(tenantId: string) {
  const db = getPrismaClient();
  return db.role.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { userRoles: true } },
    },
  });
}

// ── Get role detail ────────────────────────────────────────────────────────────

export async function getRole(tenantId: string, roleId: string) {
  const db = getPrismaClient();
  const role = await db.role.findFirst({
    where: { id: roleId, tenantId },
    include: {
      modulePermissions: true,
      entityPermissions: true,
      fieldPermissions: true,
      userRoles: {
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!role) {
    throw new NotFoundError(`Role ${roleId} not found`);
  }

  return role;
}

// ── Create role ────────────────────────────────────────────────────────────────

export async function createRole(tenantId: string, data: CreateRoleInput) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    const roleId = generateId();

    const role = await tx.role.create({
      data: {
        id: roleId,
        tenantId,
        name: data.name,
        description: data.description ?? null,
      },
    });

    if (data.modulePermissions && data.modulePermissions.length > 0) {
      await tx.modulePermission.createMany({
        data: data.modulePermissions.map((mp) => ({
          id: generateId(),
          roleId,
          module: mp.module,
          accessLevel: mp.accessLevel,
        })),
      });
    }

    if (data.entityPermissions && data.entityPermissions.length > 0) {
      await tx.entityPermission.createMany({
        data: data.entityPermissions.map((ep) => ({
          id: generateId(),
          roleId,
          module: ep.module,
          entity: ep.entity,
          scope: ep.scope,
          canCreate: ep.canCreate,
          canRead: ep.canRead,
          canUpdate: ep.canUpdate,
          canDelete: ep.canDelete,
        })),
      });
    }

    if (data.fieldPermissions && data.fieldPermissions.length > 0) {
      await tx.fieldPermission.createMany({
        data: data.fieldPermissions.map((fp) => ({
          id: generateId(),
          roleId,
          module: fp.module,
          entity: fp.entity,
          field: fp.field,
          visible: fp.visible,
          editable: fp.editable,
        })),
      });
    }

    return role;
  });
}

// ── Update role ────────────────────────────────────────────────────────────────

export async function updateRole(tenantId: string, roleId: string, data: UpdateRoleInput) {
  const db = getPrismaClient();

  const existing = await db.role.findFirst({ where: { id: roleId, tenantId } });
  if (!existing) {
    throw new NotFoundError(`Role ${roleId} not found`);
  }
  if (existing.isSystem) {
    throw new ConflictError('Cannot modify a system role');
  }

  return db.$transaction(async (tx) => {
    const role = await tx.role.update({
      where: { id: roleId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        version: { increment: 1 },
      },
    });

    // Replace module permissions if provided
    if (data.modulePermissions !== undefined) {
      await tx.modulePermission.deleteMany({ where: { roleId } });
      if (data.modulePermissions.length > 0) {
        await tx.modulePermission.createMany({
          data: data.modulePermissions.map((mp) => ({
            id: generateId(),
            roleId,
            module: mp.module,
            accessLevel: mp.accessLevel,
          })),
        });
      }
    }

    // Replace entity permissions if provided
    if (data.entityPermissions !== undefined) {
      await tx.entityPermission.deleteMany({ where: { roleId } });
      if (data.entityPermissions.length > 0) {
        await tx.entityPermission.createMany({
          data: data.entityPermissions.map((ep) => ({
            id: generateId(),
            roleId,
            module: ep.module,
            entity: ep.entity,
            scope: ep.scope,
            canCreate: ep.canCreate,
            canRead: ep.canRead,
            canUpdate: ep.canUpdate,
            canDelete: ep.canDelete,
          })),
        });
      }
    }

    // Replace field permissions if provided
    if (data.fieldPermissions !== undefined) {
      await tx.fieldPermission.deleteMany({ where: { roleId } });
      if (data.fieldPermissions.length > 0) {
        await tx.fieldPermission.createMany({
          data: data.fieldPermissions.map((fp) => ({
            id: generateId(),
            roleId,
            module: fp.module,
            entity: fp.entity,
            field: fp.field,
            visible: fp.visible,
            editable: fp.editable,
          })),
        });
      }
    }

    return role;
  });
}

// ── Delete role ────────────────────────────────────────────────────────────────

export async function deleteRole(tenantId: string, roleId: string) {
  const db = getPrismaClient();

  const existing = await db.role.findFirst({ where: { id: roleId, tenantId } });
  if (!existing) {
    throw new NotFoundError(`Role ${roleId} not found`);
  }
  if (existing.isSystem) {
    throw new ConflictError('Cannot delete a system role');
  }

  const assignedCount = await db.userRole.count({ where: { roleId } });
  if (assignedCount > 0) {
    throw new ConflictError(`Cannot delete role: ${assignedCount} user(s) still assigned`);
  }

  await db.role.delete({ where: { id: roleId } });
}

// ── Assign / Remove role ───────────────────────────────────────────────────────

export async function assignRoleToUser(userId: string, roleId: string, assignedBy: string) {
  const db = getPrismaClient();

  const existing = await db.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
  });
  if (existing) {
    throw new ConflictError('User already has this role');
  }

  return db.userRole.create({
    data: {
      id: generateId(),
      userId,
      roleId,
      assignedBy,
    },
  });
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  const db = getPrismaClient();

  const existing = await db.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
  });
  if (!existing) {
    throw new NotFoundError('User does not have this role');
  }

  await db.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

// ── Resolve permissions (merge across roles) ───────────────────────────────────

export async function resolvePermissions(roleIds: string[]): Promise<ResolvedPermissions> {
  const db = getPrismaClient();

  const [modulePerms, entityPerms, fieldPerms] = await Promise.all([
    db.modulePermission.findMany({ where: { roleId: { in: roleIds } } }),
    db.entityPermission.findMany({ where: { roleId: { in: roleIds } } }),
    db.fieldPermission.findMany({ where: { roleId: { in: roleIds } } }),
  ]);

  // Merge module permissions — most permissive wins
  const modules = new Map<string, string>();
  for (const mp of modulePerms) {
    const current = modules.get(mp.module);
    const currentOrder = ACCESS_LEVEL_ORDER[current ?? 'NONE'] ?? 0;
    const newOrder = ACCESS_LEVEL_ORDER[mp.accessLevel] ?? 0;
    if (newOrder > currentOrder) {
      modules.set(mp.module, ORDER_TO_LEVEL[newOrder] ?? 'NONE');
    }
  }

  // Merge entity permissions — any true = true; scope: ALL > TEAM > OWN
  const entities = new Map<string, EntityPerm>();
  for (const ep of entityPerms) {
    const key = `${ep.module}:${ep.entity}`;
    const existing = entities.get(key);
    if (!existing) {
      entities.set(key, {
        scope: ep.scope,
        canCreate: ep.canCreate,
        canRead: ep.canRead,
        canUpdate: ep.canUpdate,
        canDelete: ep.canDelete,
      });
    } else {
      const existingScopeOrder = SCOPE_ORDER[existing.scope] ?? 0;
      const newScopeOrder = SCOPE_ORDER[ep.scope] ?? 0;
      existing.scope = newScopeOrder > existingScopeOrder
        ? (ORDER_TO_SCOPE[newScopeOrder] ?? 'OWN')
        : existing.scope;
      existing.canCreate = existing.canCreate || ep.canCreate;
      existing.canRead = existing.canRead || ep.canRead;
      existing.canUpdate = existing.canUpdate || ep.canUpdate;
      existing.canDelete = existing.canDelete || ep.canDelete;
    }
  }

  // Merge field permissions — any true = true
  const fields = new Map<string, FieldPerm>();
  for (const fp of fieldPerms) {
    const key = `${fp.module}:${fp.entity}:${fp.field}`;
    const existing = fields.get(key);
    if (!existing) {
      fields.set(key, {
        visible: fp.visible,
        editable: fp.editable,
      });
    } else {
      existing.visible = existing.visible || fp.visible;
      existing.editable = existing.editable || fp.editable;
    }
  }

  return { modules, entities, fields };
}
