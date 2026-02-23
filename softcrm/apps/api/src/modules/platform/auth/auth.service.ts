import bcrypt from 'bcryptjs';
import { getPrismaClient } from '@softcrm/db';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  generateId,
} from '@softcrm/shared-kernel';
import {
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeTokenFamily,
} from './jwt.service.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  tenantId: string;
  roles: string[];
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toAuthUser(
  user: { id: string; tenantId: string; email: string; firstName: string; lastName: string },
  roleNames: string[],
): AuthUser {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    roles: roleNames,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  };
}

async function getRoleNames(userId: string): Promise<string[]> {
  const db = getPrismaClient();
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: { role: { select: { name: true } } },
  });
  return userRoles.map((ur) => ur.role.name);
}

// ── Login ──────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  tenantSlug: string,
  userAgent?: string,
  ip?: string,
): Promise<AuthTokens> {
  const db = getPrismaClient();

  // 1. Find tenant by slug, verify ACTIVE
  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }
  if (tenant.status !== 'ACTIVE') {
    throw new ForbiddenError('Tenant is not active');
  }

  // 2. Find user by email + tenantId, verify ACTIVE
  const user = await db.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }
  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError('User account is not active');
  }

  // 3. Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // 4. Gather roles
  const roleNames = await getRoleNames(user.id);

  // 5. Generate access token
  const jti = generateId();
  const accessToken = await signAccessToken({
    sub: user.id,
    tid: tenant.id,
    roles: roleNames,
    jti,
  });

  // 6. Generate & store refresh token
  const family = generateId();
  const refreshToken = signRefreshToken();
  await storeRefreshToken(refreshToken, user.id, tenant.id, family, userAgent, ip);

  // 7. Update lastLoginAt
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: toAuthUser(user, roleNames),
  };
}

// ── Register ───────────────────────────────────────────────────────────────────

export async function register(
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSlug: string;
  },
  actorId?: string,
): Promise<AuthUser> {
  const db = getPrismaClient();

  // 1. Find tenant
  const tenant = await db.tenant.findUnique({ where: { slug: data.tenantSlug } });
  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. Check email uniqueness within tenant
  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: data.email } },
  });
  if (existing) {
    throw new ConflictError('A user with this email already exists in the tenant');
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // 4. Create user
  const userId = generateId();
  const user = await db.user.create({
    data: {
      id: userId,
      tenantId: tenant.id,
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      status: 'ACTIVE',
      createdBy: actorId ?? null,
    },
  });

  // 5. Assign default role ("Read-Only") if it exists
  const defaultRole = await db.role.findUnique({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Read-Only' } },
  });

  const roleNames: string[] = [];
  if (defaultRole) {
    await db.userRole.create({
      data: {
        id: generateId(),
        userId: user.id,
        roleId: defaultRole.id,
        assignedBy: actorId ?? null,
      },
    });
    roleNames.push(defaultRole.name);
  }

  return toAuthUser(user, roleNames);
}

// ── Refresh ────────────────────────────────────────────────────────────────────

export async function refresh(
  token: string,
  userAgent?: string,
  ip?: string,
): Promise<AuthTokens> {
  const db = getPrismaClient();

  // 1. Validate the refresh token
  const record = await validateRefreshToken(token);

  // 2. If already revoked → token reuse detected, revoke entire family
  if (record.revoked) {
    await revokeTokenFamily(record.family);
    throw new UnauthorizedError('Token reuse detected — all sessions revoked');
  }

  // 3. Revoke current token (single use)
  await revokeRefreshToken(record.id);

  // 4. Get user + roles
  const user = await db.user.findUnique({ where: { id: record.userId } });
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('User account not found or inactive');
  }

  const roleNames = await getRoleNames(user.id);

  // 5. Issue new access + refresh tokens (same family for rotation)
  const jti = generateId();
  const accessToken = await signAccessToken({
    sub: user.id,
    tid: user.tenantId,
    roles: roleNames,
    jti,
  });

  const newRefreshToken = signRefreshToken();
  await storeRefreshToken(newRefreshToken, user.id, user.tenantId, record.family, userAgent, ip);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: toAuthUser(user, roleNames),
  };
}

// ── Logout ─────────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  const db = getPrismaClient();

  const record = await db.refreshToken.findUnique({ where: { token: refreshToken } });
  if (record && !record.revokedAt) {
    await revokeRefreshToken(record.id);
  }
}

// ── Logout All ─────────────────────────────────────────────────────────────────

export async function logoutAll(userId: string): Promise<void> {
  const db = getPrismaClient();

  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
