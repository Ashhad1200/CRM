/**
 * Sync store — tracks sync state (last synced, in-progress, conflicts).
 */
import { create } from 'zustand';

export interface SyncConflict {
  id: string;
  table: string;
  localRecord: Record<string, unknown>;
  serverRecord: Record<string, unknown>;
  localUpdatedAt: string;
  serverUpdatedAt: string;
}

export interface SyncState {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  conflicts: SyncConflict[];
  syncError: string | null;
  intervalId: ReturnType<typeof setInterval> | null;

  setSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (ts: number) => void;
  setConflicts: (conflicts: SyncConflict[]) => void;
  addConflicts: (conflicts: SyncConflict[]) => void;
  resolveConflict: (id: string) => void;
  setSyncError: (error: string | null) => void;
  startPeriodicSync: () => void;
  stopPeriodicSync: () => void;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useSyncStore = create<SyncState>((set, get) => ({
  lastSyncedAt: null,
  isSyncing: false,
  conflicts: [],
  syncError: null,
  intervalId: null,

  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  setConflicts: (conflicts) => set({ conflicts }),
  addConflicts: (newConflicts) =>
    set((state) => ({ conflicts: [...state.conflicts, ...newConflicts] })),
  resolveConflict: (id) =>
    set((state) => ({ conflicts: state.conflicts.filter((c) => c.id !== id) })),
  setSyncError: (syncError) => set({ syncError }),

  startPeriodicSync: () => {
    const existing = get().intervalId;
    if (existing) clearInterval(existing);
    const intervalId = setInterval(() => {
      // Trigger sync — actual sync logic lives in sync-engine
      // This store just manages the timer
    }, SYNC_INTERVAL_MS);
    set({ intervalId });
  },

  stopPeriodicSync: () => {
    const id = get().intervalId;
    if (id) clearInterval(id);
    set({ intervalId: null });
  },
}));
