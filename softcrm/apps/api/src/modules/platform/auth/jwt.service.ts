import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getPrismaClient } from '@softcrm/db';
import { UnauthorizedError } from '@softcrm/shared-kernel';
import { getConfig } from '../../../config/index.js';
import type { JwtPayload } from '../../../middleware/auth.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert human-readable duration string (e.g. "15m", "7d") to seconds. */
function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
  if (!match) throw new Error(`Invalid duration format: "${duration}"`);

  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };
  return value * (multipliers[unit] ?? 0);
}

/** Encode the HS256 secret from config into a Uint8Array key. */
function getSecretKey(): Uint8Array {
  const config = getConfig();
  return new TextEncoder().encode(config.JWT_SECRET);
}

// ── Access Token ───────────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token (JWT, HS256).
 * Claims: sub (userId), tid (tenantId), roles, jti.
 */
export async function signAccessToken(payload: {
  sub: string;
  tid: string;
  roles: string[];
  jti: string;
}): Promise<string> {
  const config = getConfig();
  const expiry = config.JWT_ACCESS_EXPIRY || '15m';

  const jwt = await new SignJWT({
    tid: payload.tid,
    roles: payload.roles,
    jti: payload.jti,
  } satisfies Partial<JWTPayload> & Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecretKey());

  return jwt;
}

/**
 * Verify an access token and return the decoded payload.
 * Throws `UnauthorizedError` on any failure.
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });

    // Validate required claims
    const tid = payload['tid'];
    const roles = payload['roles'];
    const jti = payload['jti'];

    if (!payload.sub || !tid || !Array.isArray(roles) || !jti) {
      throw new UnauthorizedError('Malformed token payload');
    }

    return {
      sub: payload.sub,
      tid: tid as string,
      roles: roles as string[],
      jti: jti as string,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// ── Refresh Token ──────────────────────────────────────────────────────────────

/**
 * Generate an opaque refresh token (64-byte random hex string).
 */
export function signRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

/**
 * Persist a refresh token in the database.
 * TTL is driven by `JWT_REFRESH_EXPIRY` config (default "7d").
 */
export async function storeRefreshToken(
  token: string,
  userId: string,
  tenantId: string,
  family: string,
  userAgent?: string,
  ip?: string,
): Promise<void> {
  const config = getConfig();
  const ttlSeconds = parseDurationToSeconds(config.JWT_REFRESH_EXPIRY || '7d');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const db = getPrismaClient();
  await db.refreshToken.create({
    data: {
      userId,
      token,
      family,
      expiresAt,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    },
  });
}

/**
 * Validate a refresh token:
 *  - Must exist
 *  - Must not be revoked
 *  - Must not be expired
 *
 * Returns the full record on success; throws otherwise.
 */
export async function validateRefreshToken(token: string) {
  const db = getPrismaClient();

  const record = await db.refreshToken.findUnique({ where: { token } });

  if (!record) {
    throw new UnauthorizedError('Refresh token not found');
  }

  if (record.revokedAt) {
    // Return the record so callers can inspect the family for reuse detection
    return { ...record, revoked: true as const };
  }

  if (record.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  return { ...record, revoked: false as const };
}

/**
 * Revoke a single refresh token by its database ID.
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  const db = getPrismaClient();
  await db.refreshToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all refresh tokens that share the same family.
 * Used when token reuse is detected (potential theft).
 */
export async function revokeTokenFamily(family: string): Promise<void> {
  const db = getPrismaClient();
  await db.refreshToken.updateMany({
    where: { family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
