import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express';
import { ValidationError } from '@softcrm/shared-kernel';
import { createRoleSchema, updateRoleSchema } from './rbac.validators.js';
import * as rbacService from './rbac.service.js';
import { invalidatePermissionsForRole } from './rbac.cache.js';
import { getCachedPermissions, setCachedPermissions } from './rbac.cache.js';
import { getPrismaClient } from '@softcrm/db';

/** Safely extract a single string param from Express 5 params. */
function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const rbacRouter: RouterType = Router();

// ── GET / — list roles ─────────────────────────────────────────────────────────

rbacRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const roles = await rbacService.listRoles(req.user.tid);
    res.json({ data: roles });
  } catch (err) {
    next(err);
  }
});

// ── POST / — create role ───────────────────────────────────────────────────────

rbacRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const parsed = createRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join('; '));
    }
    const role = await rbacService.createRole(req.user.tid, parsed.data);
    await invalidatePermissionsForRole(role.id);
    res.status(201).json({ data: role });
  } catch (err) {
    next(err);
  }
});

// ── GET /me/permissions — current user's resolved permissions ──────────────────
// NOTE: Must be defined BEFORE /:id to avoid route conflict

rbacRouter.get('/me/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const userId = req.user.sub;

    // Try cache first
    let perms = await getCachedPermissions(userId);

    if (!perms) {
      const db = getPrismaClient();
      const userRoles = await db.userRole.findMany({
        where: { userId },
        select: { roleId: true },
      });
      const roleIds = userRoles.map((ur) => ur.roleId);

      if (roleIds.length === 0) {
        res.json({ data: { modules: {}, entities: {}, fields: {} } });
        return;
      }

      const resolved = await rbacService.resolvePermissions(roleIds);

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

    res.json({ data: perms });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — get role detail ─────────────────────────────────────────────────

rbacRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const role = await rbacService.getRole(req.user.tid, param(req, 'id'));
    res.json({ data: role });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id — update role ───────────────────────────────────────────────────

rbacRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join('; '));
    }
    const roleId = param(req, 'id');
    const role = await rbacService.updateRole(req.user.tid, roleId, parsed.data);
    await invalidatePermissionsForRole(roleId);
    res.json({ data: role });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — delete role ──────────────────────────────────────────────────

rbacRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const roleId = param(req, 'id');
    await invalidatePermissionsForRole(roleId);
    await rbacService.deleteRole(req.user.tid, roleId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/users/:userId — assign role to user ─────────────────────────────

rbacRouter.post('/:id/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const roleId = param(req, 'id');
    const userId = param(req, 'userId');
    const userRole = await rbacService.assignRoleToUser(userId, roleId, req.user.sub);
    await invalidatePermissionsForRole(roleId);
    res.status(201).json({ data: userRole });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id/users/:userId — remove role from user ──────────────────────────

rbacRouter.delete('/:id/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }
    const roleId = param(req, 'id');
    const userId = param(req, 'userId');
    await rbacService.removeRoleFromUser(userId, roleId);
    await invalidatePermissionsForRole(roleId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
