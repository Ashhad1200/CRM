/**
 * Sync provider — manages background sync lifecycle.
 */
import React, { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useSyncStore } from '../stores/sync-store';

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { startPeriodicSync, stopPeriodicSync } = useSyncStore();

  useEffect(() => {
    if (isAuthenticated) {
      startPeriodicSync();
    } else {
      stopPeriodicSync();
    }
    return () => {
      stopPeriodicSync();
    };
  }, [isAuthenticated, startPeriodicSync, stopPeriodicSync]);

  return <>{children}</>;
}
