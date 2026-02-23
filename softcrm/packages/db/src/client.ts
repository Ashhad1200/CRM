import { PrismaClient } from '@prisma/client';
import { tenantContext } from './tenant-context.js';

/**
 * Prisma client singleton with Row-Level Security (RLS) tenant isolation.
 *
 * Before every query, it executes SET app.current_tenant = '<tenantId>'
 * on the PostgreSQL connection, enabling RLS policies to filter rows.
 */

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

  // RLS tenant context extension
  return client.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        const tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId) {
          // Set the tenant context for PostgreSQL RLS policies
          await client.$executeRawUnsafe(`SET app.current_tenant = '${tenantId}'`);
        }
        return query(args);
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Disconnect the Prisma client (for graceful shutdown).
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
