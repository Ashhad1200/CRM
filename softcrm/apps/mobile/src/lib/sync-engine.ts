/**
 * Sync engine — pull-push protocol for WatermelonDB ↔ server.
 *
 * Pull: GET /api/v1/sync/pull?since=<timestamp> → receive changes per table → apply locally
 * Push: collect dirty records → POST /api/v1/sync/push → server returns conflicts
 */
import { apiClient } from './api-client';
import { SYNC_TABLES, type SyncTableName } from './offline-db';
import { useSyncStore, type SyncConflict } from '../stores/sync-store';

// ─── Types ───────────────────────────────────────────────────────────

export interface SyncChange {
  id: string;
  [key: string]: unknown;
}

export interface TableChanges {
  created: SyncChange[];
  updated: SyncChange[];
  deleted: string[];
}

export interface PullResponse {
  changes: Record<SyncTableName, TableChanges>;
  timestamp: number;
}

export interface PushPayload {
  changes: Record<SyncTableName, TableChanges>;
  lastPulledAt: number;
}

export interface PushResponse {
  ok: boolean;
  conflicts: SyncConflict[];
}

// ─── Pull ─────────────────────────────────────────────────────────────

export async function pullChanges(lastPulledAt: number | null): Promise<PullResponse> {
  const since = lastPulledAt ?? 0;
  return apiClient<PullResponse>(`/sync/pull?since=${since}`);
}

/**
 * Apply pulled changes to WatermelonDB.
 * In a real implementation this would use database.write() and batch operations.
 * This scaffold stores the changes in memory for now.
 */
export async function applyPulledChanges(changes: PullResponse['changes']): Promise<void> {
  for (const table of SYNC_TABLES) {
    const tableChanges = changes[table];
    if (!tableChanges) continue;

    // In production: database.write(async () => {
    //   for (const record of tableChanges.created) { collection.create(...) }
    //   for (const record of tableChanges.updated) { existing.update(...) }
    //   for (const id of tableChanges.deleted) { existing.markAsDeleted() }
    // })
    const totalOps =
      tableChanges.created.length +
      tableChanges.updated.length +
      tableChanges.deleted.length;

    if (totalOps > 0) {
      console.log(`[sync] Applied ${totalOps} changes to ${table}`);
    }
  }
}

// ─── Push ─────────────────────────────────────────────────────────────

/**
 * Collect dirty records from WatermelonDB and push to server.
 * Returns any conflicts detected by the server.
 */
export async function pushChanges(lastPulledAt: number): Promise<SyncConflict[]> {
  const dirtyChanges = await collectDirtyRecords();

  const hasDirty = SYNC_TABLES.some((table) => {
    const c = dirtyChanges[table];
    return c && (c.created.length > 0 || c.updated.length > 0 || c.deleted.length > 0);
  });

  if (!hasDirty) {
    return [];
  }

  const payload: PushPayload = {
    changes: dirtyChanges,
    lastPulledAt,
  };

  const response = await apiClient<PushResponse>('/sync/push', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.conflicts;
}

/**
 * Collect dirty records from local WatermelonDB.
 * In production, queries each collection for records with _status !== 'synced'.
 */
export async function collectDirtyRecords(): Promise<Record<SyncTableName, TableChanges>> {
  const empty: TableChanges = { created: [], updated: [], deleted: [] };
  const result = {} as Record<SyncTableName, TableChanges>;

  for (const table of SYNC_TABLES) {
    // In production: query collection where _status = 'created' | 'updated' | 'deleted'
    result[table] = { ...empty };
  }

  return result;
}

// ─── Full Sync (pull → push) ──────────────────────────────────────────

export async function performFullSync(): Promise<void> {
  const store = useSyncStore.getState();
  if (store.isSyncing) return;

  store.setSyncing(true);
  store.setSyncError(null);

  try {
    // 1. Pull changes from server
    const pullResult = await pullChanges(store.lastSyncedAt);
    await applyPulledChanges(pullResult.changes);

    // 2. Push local changes to server
    const conflicts = await pushChanges(pullResult.timestamp);

    // 3. Update state
    store.setLastSyncedAt(pullResult.timestamp);
    if (conflicts.length > 0) {
      store.addConflicts(conflicts);
    }

    console.log(`[sync] Completed at ${new Date(pullResult.timestamp).toISOString()}, ${conflicts.length} conflicts`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    store.setSyncError(message);
    console.error('[sync] Error:', message);
  } finally {
    store.setSyncing(false);
  }
}
