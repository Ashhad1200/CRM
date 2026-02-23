/**
 * WatermelonDB offline database — local schema mirroring API entities.
 * Each table has _status (synced/created/updated/deleted) and _changed
 * columns managed by WatermelonDB's sync system.
 */
import { Database } from '@nozbe/watermelondb';
import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';
import type { TableSchema } from '@nozbe/watermelondb/Schema';

// ─── Schema definition ──────────────────────────────────────────────────
export const SCHEMA_VERSION = 1;

const contactsTable: TableSchema = tableSchema({
  name: 'contacts',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'first_name', type: 'string' },
    { name: 'last_name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'phone', type: 'string', isOptional: true },
    { name: 'company', type: 'string', isOptional: true },
    { name: 'title', type: 'string', isOptional: true },
    { name: 'account_id', type: 'string', isOptional: true },
    { name: 'owner_id', type: 'string' },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const accountsTable: TableSchema = tableSchema({
  name: 'accounts',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'name', type: 'string' },
    { name: 'industry', type: 'string', isOptional: true },
    { name: 'website', type: 'string', isOptional: true },
    { name: 'phone', type: 'string', isOptional: true },
    { name: 'address', type: 'string', isOptional: true },
    { name: 'city', type: 'string', isOptional: true },
    { name: 'state', type: 'string', isOptional: true },
    { name: 'country', type: 'string', isOptional: true },
    { name: 'latitude', type: 'number', isOptional: true },
    { name: 'longitude', type: 'number', isOptional: true },
    { name: 'owner_id', type: 'string' },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const dealsTable: TableSchema = tableSchema({
  name: 'deals',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'value', type: 'number' },
    { name: 'currency', type: 'string' },
    { name: 'stage', type: 'string' },
    { name: 'probability', type: 'number', isOptional: true },
    { name: 'expected_close_date', type: 'number', isOptional: true },
    { name: 'contact_id', type: 'string', isOptional: true },
    { name: 'account_id', type: 'string', isOptional: true },
    { name: 'owner_id', type: 'string' },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const tasksTable: TableSchema = tableSchema({
  name: 'tasks',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', isOptional: true },
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'due_date', type: 'number', isOptional: true },
    { name: 'contact_id', type: 'string', isOptional: true },
    { name: 'deal_id', type: 'string', isOptional: true },
    { name: 'assigned_to', type: 'string' },
    { name: 'completed_at', type: 'number', isOptional: true },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const activitiesTable: TableSchema = tableSchema({
  name: 'activities',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'type', type: 'string' },
    { name: 'subject', type: 'string' },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'contact_id', type: 'string', isOptional: true },
    { name: 'deal_id', type: 'string', isOptional: true },
    { name: 'account_id', type: 'string', isOptional: true },
    { name: 'performed_by', type: 'string' },
    { name: 'performed_at', type: 'number' },
    { name: 'latitude', type: 'number', isOptional: true },
    { name: 'longitude', type: 'number', isOptional: true },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const expensesTable: TableSchema = tableSchema({
  name: 'expenses',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'amount', type: 'number' },
    { name: 'currency', type: 'string' },
    { name: 'vendor', type: 'string' },
    { name: 'category', type: 'string' },
    { name: 'description', type: 'string', isOptional: true },
    { name: 'receipt_image_uri', type: 'string', isOptional: true },
    { name: 'ocr_raw', type: 'string', isOptional: true },
    { name: 'account_id', type: 'string', isOptional: true },
    { name: 'created_by', type: 'string' },
    { name: 'expense_date', type: 'number' },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

const checkinTable: TableSchema = tableSchema({
  name: 'checkins',
  columns: [
    { name: 'server_id', type: 'string', isIndexed: true },
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
    { name: 'accuracy', type: 'number', isOptional: true },
    { name: 'account_id', type: 'string', isOptional: true },
    { name: 'account_name', type: 'string', isOptional: true },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'checked_in_by', type: 'string' },
    { name: 'checked_in_at', type: 'number' },
    { name: 'version', type: 'number' },
    { name: 'server_created_at', type: 'number' },
    { name: 'server_updated_at', type: 'number' },
  ],
});

export const offlineSchema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    contactsTable,
    accountsTable,
    dealsTable,
    tasksTable,
    activitiesTable,
    expensesTable,
    checkinTable,
  ],
});

// ─── Table names for sync ────────────────────────────────────────────
export const SYNC_TABLES = [
  'contacts',
  'accounts',
  'deals',
  'tasks',
  'activities',
  'expenses',
  'checkins',
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

// ─── Database instance (singleton) ──────────────────────────────────
let _database: Database | null = null;

/**
 * Get or create the WatermelonDB database instance.
 * In tests, pass a custom adapter; in production, LokiJS adapter is used.
 */
export function getDatabase(adapter?: unknown): Database {
  if (_database) return _database;

  // In a real app, we'd create a LokiJSAdapter or SQLiteAdapter here.
  // For the scaffold, we accept an injected adapter for testability.
  _database = new Database({
    adapter: adapter as never,
    modelClasses: [],
  });

  return _database;
}

/**
 * Reset the database singleton (for testing).
 */
export function resetDatabase(): void {
  _database = null;
}
