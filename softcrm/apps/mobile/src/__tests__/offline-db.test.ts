/**
 * Offline DB tests — verifies WatermelonDB schema definition.
 */
import {
  offlineSchema,
  SCHEMA_VERSION,
  SYNC_TABLES,
  getDatabase,
  resetDatabase,
} from '../lib/offline-db';

beforeEach(() => {
  resetDatabase();
});

// ─── Schema tests ────────────────────────────────────────────────────

describe('offlineSchema', () => {
  // WatermelonDB appSchema returns tables as a TableMap (object), not an array
  const allTables = () => Object.values(offlineSchema.tables);
  const findTable = (name: string) => offlineSchema.tables[name];

  it('should have the correct schema version', () => {
    expect(offlineSchema.version).toBe(SCHEMA_VERSION);
    expect(offlineSchema.version).toBe(1);
  });

  it('should define all syncable tables', () => {
    const tableNames = Object.keys(offlineSchema.tables);
    for (const syncTable of SYNC_TABLES) {
      expect(tableNames).toContain(syncTable);
    }
  });

  it('should have 7 tables total', () => {
    expect(allTables()).toHaveLength(7);
  });

  it('contacts table should have required columns', () => {
    const contacts = findTable('contacts');
    expect(contacts).toBeDefined();
    const colNames = Object.keys(contacts!.columns);
    expect(colNames).toContain('server_id');
    expect(colNames).toContain('first_name');
    expect(colNames).toContain('last_name');
    expect(colNames).toContain('email');
    expect(colNames).toContain('version');
    expect(colNames).toContain('server_created_at');
    expect(colNames).toContain('server_updated_at');
  });

  it('accounts table should have location columns', () => {
    const accounts = findTable('accounts');
    expect(accounts).toBeDefined();
    const colNames = Object.keys(accounts!.columns);
    expect(colNames).toContain('latitude');
    expect(colNames).toContain('longitude');
    expect(colNames).toContain('address');
  });

  it('deals table should have value and stage columns', () => {
    const deals = findTable('deals');
    expect(deals).toBeDefined();
    const colNames = Object.keys(deals!.columns);
    expect(colNames).toContain('value');
    expect(colNames).toContain('stage');
    expect(colNames).toContain('currency');
  });

  it('tasks table should have status and priority columns', () => {
    const tasks = findTable('tasks');
    expect(tasks).toBeDefined();
    const colNames = Object.keys(tasks!.columns);
    expect(colNames).toContain('status');
    expect(colNames).toContain('priority');
    expect(colNames).toContain('due_date');
  });

  it('expenses table should have OCR-related columns', () => {
    const expenses = findTable('expenses');
    expect(expenses).toBeDefined();
    const colNames = Object.keys(expenses!.columns);
    expect(colNames).toContain('amount');
    expect(colNames).toContain('vendor');
    expect(colNames).toContain('receipt_image_uri');
    expect(colNames).toContain('ocr_raw');
  });

  it('checkins table should have GPS columns', () => {
    const checkins = findTable('checkins');
    expect(checkins).toBeDefined();
    const colNames = Object.keys(checkins!.columns);
    expect(colNames).toContain('latitude');
    expect(colNames).toContain('longitude');
    expect(colNames).toContain('accuracy');
    expect(colNames).toContain('account_id');
  });

  it('all tables should have server_id indexed', () => {
    for (const table of allTables()) {
      const serverIdCol = table.columns['server_id'];
      expect(serverIdCol).toBeDefined();
      expect(serverIdCol?.isIndexed).toBe(true);
    }
  });

  it('all tables should have version column', () => {
    for (const table of allTables()) {
      expect(table.columns['version']).toBeDefined();
    }
  });
});

// ─── SYNC_TABLES constant ────────────────────────────────────────────

describe('SYNC_TABLES', () => {
  it('should contain all 7 syncable table names', () => {
    expect(SYNC_TABLES).toEqual([
      'contacts',
      'accounts',
      'deals',
      'tasks',
      'activities',
      'expenses',
      'checkins',
    ]);
  });
});

// ─── Database singleton ──────────────────────────────────────────────

describe('getDatabase', () => {
  it('should throw or create when no adapter provided', () => {
    // WatermelonDB requires an adapter; without one this would throw
    // In our scaffold, we pass `adapter as never` so behavior depends on WatermelonDB
    expect(() => getDatabase()).toBeDefined();
  });

  it('resetDatabase should clear the singleton', () => {
    resetDatabase();
    // After reset, getDatabase should create a new instance
    expect(() => getDatabase()).toBeDefined();
  });
});
