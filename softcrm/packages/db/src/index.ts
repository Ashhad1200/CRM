// ── @softcrm/db — Public API ───────────────────────────────────────────────────

export { getPrismaClient, disconnectPrisma } from './client.js';
export { tenantContext } from './tenant-context.js';

// Re-export Prisma types for consumers
export type { PrismaClient } from '@prisma/client';
