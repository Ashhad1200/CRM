/**
 * useOfflineSync hook — provides sync actions and state to components.
 * Triggers sync on connectivity changes + provides manual sync trigger.
 */
import { useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncStore } from '../stores/sync-store';
import { performFullSync } from '../lib/sync-engine';

export function useOfflineSync() {
  const {
    lastSyncedAt,
    isSyncing,
    conflicts,
    syncError,
  } = useSyncStore();

  const triggerSync = useCallback(() => {
    void performFullSync();
  }, []);

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [triggerSync]);

  // Initial sync on mount
  useEffect(() => {
    triggerSync();
  }, [triggerSync]);

  return {
    lastSyncedAt,
    isSyncing,
    conflicts,
    syncError,
    triggerSync,
    conflictCount: conflicts.length,
  };
}
