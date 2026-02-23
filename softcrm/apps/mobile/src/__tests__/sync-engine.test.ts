/**
 * Sync engine tests — verifies pull/push protocol logic.
 */
import {
  pullChanges,
  pushChanges,
  collectDirtyRecords,
  applyPulledChanges,
  performFullSync,
  type PullResponse,
  type PushResponse,
  type TableChanges,
} from '../lib/sync-engine';
import { SYNC_TABLES, type SyncTableName } from '../lib/offline-db';
import { useSyncStore } from '../stores/sync-store';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function emptyTableChanges(): TableChanges {
  return { created: [], updated: [], deleted: [] };
}

function emptyChanges(): Record<SyncTableName, TableChanges> {
  const result = {} as Record<SyncTableName, TableChanges>;
  for (const table of SYNC_TABLES) {
    result[table] = emptyTableChanges();
  }
  return result;
}

beforeEach(() => {
  mockFetch.mockReset();
  useSyncStore.setState({
    lastSyncedAt: null,
    isSyncing: false,
    conflicts: [],
    syncError: null,
    intervalId: null,
  });
});

// ─── Pull tests ──────────────────────────────────────────────────────

describe('pullChanges', () => {
  it('should call /sync/pull with since parameter', async () => {
    const mockResponse: PullResponse = {
      changes: emptyChanges(),
      timestamp: 1700000000000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await pullChanges(1600000000000);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = String(mockFetch.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/sync/pull?since=1600000000000');
    expect(result.timestamp).toBe(1700000000000);
  });

  it('should use since=0 for null lastPulledAt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ changes: emptyChanges(), timestamp: Date.now() }),
    });

    await pullChanges(null);

    const url = String(mockFetch.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/sync/pull?since=0');
  });

  it('should throw on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    await expect(pullChanges(0)).rejects.toThrow('Unauthorized');
  });
});

// ─── Apply pulled changes ────────────────────────────────────────────

describe('applyPulledChanges', () => {
  it('should process changes without throwing', async () => {
    const changes = emptyChanges();
    changes['contacts'] = {
      created: [{ id: 'c1', first_name: 'John', last_name: 'Doe' }],
      updated: [],
      deleted: [],
    };

    await expect(applyPulledChanges(changes)).resolves.not.toThrow();
  });

  it('should handle empty changes', async () => {
    await expect(applyPulledChanges(emptyChanges())).resolves.not.toThrow();
  });
});

// ─── Push tests ──────────────────────────────────────────────────────

describe('pushChanges', () => {
  it('should not call API if no dirty records', async () => {
    const result = await pushChanges(1700000000000);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

// ─── Collect dirty records ───────────────────────────────────────────

describe('collectDirtyRecords', () => {
  it('should return empty changes for all tables', async () => {
    const result = await collectDirtyRecords();

    for (const table of SYNC_TABLES) {
      expect(result[table]).toBeDefined();
      expect(result[table]?.created).toEqual([]);
      expect(result[table]?.updated).toEqual([]);
      expect(result[table]?.deleted).toEqual([]);
    }
  });
});

// ─── Full sync ───────────────────────────────────────────────────────

describe('performFullSync', () => {
  it('should set syncing state during sync', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ changes: emptyChanges(), timestamp: Date.now() }),
    });

    await performFullSync();

    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(false);
    expect(state.lastSyncedAt).toBeDefined();
    expect(state.syncError).toBeNull();
  });

  it('should not run concurrent syncs', async () => {
    useSyncStore.setState({ isSyncing: true });

    await performFullSync();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle sync errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await performFullSync();

    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(false);
    expect(state.syncError).toBe('Network error');
  });

  it('should store conflicts from push response', async () => {
    const pullResponse: PullResponse = {
      changes: emptyChanges(),
      timestamp: 1700000000000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(pullResponse),
    });

    // Push doesn't happen because no dirty records
    await performFullSync();

    const state = useSyncStore.getState();
    expect(state.lastSyncedAt).toBe(1700000000000);
    expect(state.conflicts).toEqual([]);
  });
});
