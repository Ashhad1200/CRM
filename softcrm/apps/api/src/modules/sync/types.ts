/**
 * Sync module types — defines the pull/push protocol contract.
 */

export const SYNCABLE_TABLES = [
  'contacts',
  'accounts',
  'deals',
  'tasks',
  'activities',
  'expenses',
  'checkins',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

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
  changes: Record<SyncableTable, TableChanges>;
  timestamp: number;
}

export interface PushPayload {
  changes: Record<SyncableTable, TableChanges>;
  lastPulledAt: number;
}

export interface SyncConflict {
  id: string;
  table: string;
  localRecord: Record<string, unknown>;
  serverRecord: Record<string, unknown>;
  localUpdatedAt: string;
  serverUpdatedAt: string;
}

export interface PushResponse {
  ok: boolean;
  conflicts: SyncConflict[];
}
