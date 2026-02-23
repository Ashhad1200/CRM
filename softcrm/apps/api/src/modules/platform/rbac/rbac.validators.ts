import { z } from 'zod';

export const accessLevelSchema = z.enum(['NONE', 'READ', 'WRITE', 'ADMIN']);
export const ownershipScopeSchema = z.enum(['ALL', 'TEAM', 'OWN']);

export const modulePermissionSchema = z.object({
  module: z.string().min(1).max(50),
  accessLevel: accessLevelSchema,
});

export const entityPermissionSchema = z.object({
  module: z.string().min(1).max(50),
  entity: z.string().min(1).max(50),
  scope: ownershipScopeSchema.default('ALL'),
  canCreate: z.boolean().default(false),
  canRead: z.boolean().default(false),
  canUpdate: z.boolean().default(false),
  canDelete: z.boolean().default(false),
});

export const fieldPermissionSchema = z.object({
  module: z.string().min(1).max(50),
  entity: z.string().min(1).max(50),
  field: z.string().min(1).max(100),
  visible: z.boolean().default(true),
  editable: z.boolean().default(false),
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  modulePermissions: z.array(modulePermissionSchema).optional(),
  entityPermissions: z.array(entityPermissionSchema).optional(),
  fieldPermissions: z.array(fieldPermissionSchema).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  modulePermissions: z.array(modulePermissionSchema).optional(),
  entityPermissions: z.array(entityPermissionSchema).optional(),
  fieldPermissions: z.array(fieldPermissionSchema).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
