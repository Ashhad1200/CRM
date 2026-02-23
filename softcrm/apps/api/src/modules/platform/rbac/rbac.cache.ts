import { Redis } from 'ioredis';
import { getConfig } from '../../../config/index.js';

const CACHE_TTL = 300; // 5 minutes
const KEY_PREFIX = 'rbac:';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const config = getConfig();
    redis = new Redis(config.REDIS_URL);
  }
  return redis;
}

export interface CachedPermissions {
  modules: Record<string, string>;
  entities: Record<string, { scope: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }>;
  fields: Record<string, { visible: boolean; editable: boolean }>;
}

export async function getCachedPermissions(userId: string): Promise<CachedPermissions | null> {
  const raw = await getRedis().get(`${KEY_PREFIX}${userId}`);
  if (!raw) return null;
  return JSON.parse(raw) as CachedPermissions;
}

export async function setCachedPermissions(userId: string, perms: CachedPermissions): Promise<void> {
  await getRedis().set(`${KEY_PREFIX}${userId}`, JSON.stringify(perms), 'EX', CACHE_TTL);
}

export async function invalidatePermissions(userId: string): Promise<void> {
  await getRedis().del(`${KEY_PREFIX}${userId}`);
}

export async function invalidatePermissionsForRole(roleId: string): Promise<void> {
  // Get all users with this role and invalidate each
  const { getPrismaClient } = await import('@softcrm/db');
  const db = getPrismaClient();
  const userRoles = await db.userRole.findMany({ where: { roleId }, select: { userId: true } });
  const pipeline = getRedis().pipeline();
  for (const ur of userRoles) {
    pipeline.del(`${KEY_PREFIX}${ur.userId}`);
  }
  await pipeline.exec();
}
