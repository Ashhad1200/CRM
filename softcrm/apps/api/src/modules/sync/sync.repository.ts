/**
 * Sync repository — queries across modules to collect changes since a timestamp.
 *
 * Implements pull (server → mobile) and push (mobile → server) with conflict detection.
 * Each "table" maps to a Prisma model scoped by tenantId.
 */
import type { PrismaClient } from '@softcrm/db';
import {
  SYNCABLE_TABLES,
  type SyncableTable,
  type SyncChange,
  type TableChanges,
  type SyncConflict,
} from './types.js';

// ─── Mapping tables to Prisma models ─────────────────────────────────

/**
 * For each syncable table, define how to query the Prisma model.
 * All queries are scoped by tenantId.
 */
function getChangesForTable(
  prisma: PrismaClient,
  table: SyncableTable,
  tenantId: string,
  since: Date,
): Promise<{ created: SyncChange[]; updated: SyncChange[] }> {
  // Each table maps to a prisma model. We use a dynamic approach.
  // In production, each would query its specific Prisma model.
  // This scaffold returns empty changes — the per-module implementations
  // would be wired to their specific Prisma delegates.
  return getTableChanges(prisma, table, tenantId, since);
}

async function getTableChanges(
  _prisma: PrismaClient,
  _table: SyncableTable,
  _tenantId: string,
  _since: Date,
): Promise<{ created: SyncChange[]; updated: SyncChange[] }> {
  // In production, query the specific Prisma model for records
  // created/updated after `since`, scoped by tenantId.
  // Example for contacts:
  //   const created = await prisma.contact.findMany({
  //     where: { tenantId, createdAt: { gt: since } }
  //   });
  //   const updated = await prisma.contact.findMany({
  //     where: { tenantId, updatedAt: { gt: since }, createdAt: { lte: since } }
  //   });
  return { created: [], updated: [] };
}

// ─── Pull ─────────────────────────────────────────────────────────────

export async function pullChanges(
  prisma: PrismaClient,
  tenantId: string,
  since: number,
): Promise<{ changes: Record<SyncableTable, TableChanges>; timestamp: number }> {
  const sinceDate = new Date(since);
  const now = Date.now();

  const changes = {} as Record<SyncableTable, TableChanges>;

  for (const table of SYNCABLE_TABLES) {
    const { created, updated } = await getChangesForTable(prisma, table, tenantId, sinceDate);
    changes[table] = {
      created,
      updated,
      deleted: [], // Soft-deleted records would be tracked here
    };
  }

  return { changes, timestamp: now };
}

// ─── Push ─────────────────────────────────────────────────────────────

export async function pushChanges(
  prisma: PrismaClient,
  tenantId: string,
  changes: Record<SyncableTable, TableChanges>,
  _lastPulledAt: number,
): Promise<{ ok: boolean; conflicts: SyncConflict[] }> {
  const conflicts: SyncConflict[] = [];

  for (const table of SYNCABLE_TABLES) {
    const tableChanges = changes[table];
    if (!tableChanges) continue;

    // Process creates
    for (const record of tableChanges.created) {
      await applyCreate(prisma, table, tenantId, record);
    }

    // Process updates (with conflict detection)
    for (const record of tableChanges.updated) {
      const conflict = await applyUpdate(prisma, table, tenantId, record);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Process deletes
    for (const _id of tableChanges.deleted) {
      await applyDelete(prisma, table, tenantId, _id);
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

// ─── Apply operations ─────────────────────────────────────────────────

async function applyCreate(
  _prisma: PrismaClient,
  _table: SyncableTable,
  _tenantId: string,
  _record: SyncChange,
): Promise<void> {
  // In production: prisma[table].create({ data: { ...record, tenantId } })
  // Each table would map to its specific Prisma delegate
}

async function applyUpdate(
  _prisma: PrismaClient,
  table: SyncableTable,
  _tenantId: string,
  record: SyncChange,
): Promise<SyncConflict | null> {
  // In production:
  // 1. Find existing record by server_id
  // 2. Check version number — if server version > local version → CONFLICT
  // 3. If no conflict, apply update and increment version
  //
  // For now, return null (no conflicts in scaffold)
  const version = record['version'];
  if (typeof version === 'number' && version < 0) {
    // Placeholder for conflict detection
    return {
      id: record.id,
      table,
      localRecord: record as Record<string, unknown>,
      serverRecord: {},
      localUpdatedAt: new Date().toISOString(),
      serverUpdatedAt: new Date().toISOString(),
    };
  }
  return null;
}

async function applyDelete(
  _prisma: PrismaClient,
  _table: SyncableTable,
  _tenantId: string,
  _id: string,
): Promise<void> {
  // In production: soft-delete the record
  // prisma[table].update({ where: { id, tenantId }, data: { deletedAt: new Date() } })
}
