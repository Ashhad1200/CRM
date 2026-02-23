import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@softcrm/shared-kernel';
import { resolvePermissions } from '../modules/platform/rbac/rbac.service.js';
import { getCachedPermissions, setCachedPermissions, type CachedPermissions } from '../modules/platform/rbac/rbac.cache.js';
import { getPrismaClient } from '@softcrm/db';

interface RequirePermissionOptions {
  module: string;
  entity?: string;
  action?: 'create' | 'read' | 'update' | 'delete';
  field?: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      ownershipScope?: string;
      fieldPermissions?: Record<string, { visible: boolean; editable: boolean }>;
    }
  }
}

const ACCESS_LEVEL_ORDER: Record<string, number> = { NONE: 0, READ: 1, WRITE: 2, ADMIN: 3 };

export function requirePermission(opts: RequirePermissionOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userId = req.user.sub;

      // Try cache first
      let perms = await getCachedPermissions(userId);

      if (!perms) {
        // Resolve from DB
        const db = getPrismaClient();
        const userRoles = await db.userRole.findMany({
          where: { userId },
          select: { roleId: true },
        });
        const roleIds = userRoles.map((ur) => ur.roleId);

        if (roleIds.length === 0) {
          throw new ForbiddenError('No roles assigned');
        }

        const resolved = await resolvePermissions(roleIds);

        // Convert to cacheable format
        const cachedModules: Record<string, string> = {};
        for (const [key, value] of resolved.modules) {
          cachedModules[key] = value;
        }
        const cachedEntities: Record<string, { scope: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }> = {};
        for (const [key, value] of resolved.entities) {
          cachedEntities[key] = value;
        }
        const cachedFields: Record<string, { visible: boolean; editable: boolean }> = {};
        for (const [key, value] of resolved.fields) {
          cachedFields[key] = value;
        }

        perms = { modules: cachedModules, entities: cachedEntities, fields: cachedFields };
        await setCachedPermissions(userId, perms);
      }

      // 1. Check module access
      const moduleAccess = perms.modules[opts.module];
      const moduleLevel = ACCESS_LEVEL_ORDER[moduleAccess ?? 'NONE'] ?? 0;

      if (moduleLevel === 0) {
        throw new ForbiddenError(`Access denied to module: ${opts.module}`);
      }

      // If only module check needed, pass
      if (!opts.entity) {
        next();
        return;
      }

      // 2. Check entity permission
      const entityKey = `${opts.module}:${opts.entity}`;
      const entityPerm = perms.entities[entityKey];

      if (!entityPerm) {
        // Fall back to module-level access
        if (moduleLevel >= 2) { // WRITE or ADMIN
          next();
          return;
        }
        if (opts.action === 'read' && moduleLevel >= 1) {
          next();
          return;
        }
        throw new ForbiddenError(`Access denied to entity: ${opts.entity}`);
      }

      // Set ownership scope on request
      req.ownershipScope = entityPerm.scope;

      // Check specific action
      if (opts.action) {
        const actionMap: Record<string, boolean> = {
          create: entityPerm.canCreate,
          read: entityPerm.canRead,
          update: entityPerm.canUpdate,
          delete: entityPerm.canDelete,
        };
        if (!actionMap[opts.action]) {
          throw new ForbiddenError(`${opts.action} denied on ${opts.entity}`);
        }
      }

      // 3. Load field permissions for this entity onto request
      const fieldPerms: Record<string, { visible: boolean; editable: boolean }> = {};
      for (const [key, value] of Object.entries(perms.fields)) {
        if (key.startsWith(`${entityKey}:`)) {
          const fieldName = key.slice(entityKey.length + 1);
          fieldPerms[fieldName] = value;
        }
      }
      req.fieldPermissions = fieldPerms;

      next();
    } catch (err) {
      next(err);
    }
  };
}
