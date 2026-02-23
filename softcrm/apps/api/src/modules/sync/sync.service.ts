/**
 * Sync service — orchestrates pull/push operations.
 */
import { getPrismaClient } from '@softcrm/db';
import * as repo from './sync.repository.js';
import type { SyncableTable, TableChanges, PullResponse, PushResponse } from './types.js';

export async function pull(tenantId: string, since: number): Promise<PullResponse> {
  const prisma = getPrismaClient();
  return repo.pullChanges(prisma, tenantId, since);
}

export async function push(
  tenantId: string,
  changes: Record<SyncableTable, TableChanges>,
  lastPulledAt: number,
): Promise<PushResponse> {
  const prisma = getPrismaClient();
  return repo.pushChanges(prisma, tenantId, changes, lastPulledAt);
}
