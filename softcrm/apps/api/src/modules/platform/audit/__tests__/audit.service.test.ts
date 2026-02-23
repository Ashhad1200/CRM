import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetLastAuditLog = vi.fn();
const mockAppendAuditLog = vi.fn();
const mockFindAuditLogs = vi.fn();

vi.mock('../audit.repository.js', () => ({
  getLastAuditLog: (...args: unknown[]) => mockGetLastAuditLog(...args),
  appendAuditLog: (...args: unknown[]) => mockAppendAuditLog(...args),
  findAuditLogs: (...args: unknown[]) => mockFindAuditLogs(...args),
}));

const mockAuditLogFindMany = vi.fn();
const mockAuditLogFindFirst = vi.fn();

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    auditLog: {
      findMany: mockAuditLogFindMany,
      findFirst: mockAuditLogFindFirst,
    },
  }),
}));

import { recordAudit, verifyChain, exportAuditLogCsv } from '../audit.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helper to compute expected hash ────────────────────────────────────────────

function computeHash(data: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── recordAudit ────────────────────────────────────────────────────────────────

describe('recordAudit', () => {
  it('calls appendAuditLog with previousHash from last entry', async () => {
    const lastHash = 'abc123previoushash';
    mockGetLastAuditLog.mockResolvedValue({ hash: lastHash });
    mockAppendAuditLog.mockResolvedValue({ id: 'log-1', hash: 'newhash' });

    await recordAudit({
      tenantId: 't1',
      actorId: 'u1',
      module: 'SALES',
      entity: 'Lead',
      recordId: 'rec-1',
      action: 'CREATE',
      changes: { name: 'Test' },
    });

    expect(mockGetLastAuditLog).toHaveBeenCalledWith('t1');
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        actorId: 'u1',
        module: 'SALES',
        entity: 'Lead',
        recordId: 'rec-1',
        action: 'CREATE',
        changes: { name: 'Test' },
        previousHash: lastHash,
      }),
    );
  });

  it('passes undefined previousHash when no prior entry exists', async () => {
    mockGetLastAuditLog.mockResolvedValue(null);
    mockAppendAuditLog.mockResolvedValue({ id: 'log-1' });

    await recordAudit({
      tenantId: 't1',
      actorId: 'u1',
      module: 'SALES',
      entity: 'Lead',
      recordId: 'rec-2',
      action: 'UPDATE',
      changes: {},
    });

    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ previousHash: undefined }),
    );
  });
});

// ── verifyChain ────────────────────────────────────────────────────────────────

describe('verifyChain', () => {
  it('returns valid=true for a correct hash chain', async () => {
    const entry1Payload = {
      tenantId: 't1',
      actorId: 'u1',
      ip: null,
      userAgent: null,
      module: 'SALES',
      entity: 'Lead',
      recordId: 'r1',
      action: 'CREATE',
      changes: { name: 'A' },
      previousHash: null,
    };
    const hash1 = computeHash(entry1Payload);

    const entry2Payload = {
      tenantId: 't1',
      actorId: 'u1',
      ip: null,
      userAgent: null,
      module: 'SALES',
      entity: 'Lead',
      recordId: 'r2',
      action: 'UPDATE',
      changes: { name: 'B' },
      previousHash: hash1,
    };
    const hash2 = computeHash(entry2Payload);

    mockAuditLogFindMany.mockResolvedValue([
      { id: 'e1', ...entry1Payload, hash: hash1, timestamp: new Date('2025-01-01') },
      { id: 'e2', ...entry2Payload, hash: hash2, timestamp: new Date('2025-01-02') },
    ]);

    const result = await verifyChain('t1');

    expect(result).toEqual({ valid: true });
  });

  it('detects tampered hash and returns brokenAt', async () => {
    const entry1Payload = {
      tenantId: 't1',
      actorId: 'u1',
      ip: null,
      userAgent: null,
      module: 'SALES',
      entity: 'Lead',
      recordId: 'r1',
      action: 'CREATE',
      changes: { name: 'A' },
      previousHash: null,
    };
    const hash1 = computeHash(entry1Payload);

    const entry2Payload = {
      tenantId: 't1',
      actorId: 'u1',
      ip: null,
      userAgent: null,
      module: 'SALES',
      entity: 'Lead',
      recordId: 'r2',
      action: 'UPDATE',
      changes: { name: 'B' },
      previousHash: hash1,
    };

    // Tampered hash
    mockAuditLogFindMany.mockResolvedValue([
      { id: 'e1', ...entry1Payload, hash: hash1, timestamp: new Date('2025-01-01') },
      { id: 'e2', ...entry2Payload, hash: 'TAMPERED_HASH', timestamp: new Date('2025-01-02') },
    ]);

    const result = await verifyChain('t1');

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe('e2');
  });
});

// ── exportAuditLogCsv ──────────────────────────────────────────────────────────

describe('exportAuditLogCsv', () => {
  it('returns CSV string with correct headers and rows', async () => {
    const timestamp = new Date('2025-06-15T10:30:00Z');
    mockAuditLogFindMany.mockResolvedValue([
      {
        id: 'e1',
        tenantId: 't1',
        actorId: 'user-1',
        module: 'SALES',
        entity: 'Lead',
        recordId: 'rec-1',
        action: 'CREATE',
        changes: { name: 'New Lead' },
        timestamp,
        hash: 'h1',
        previousHash: null,
      },
    ]);

    const csv = await exportAuditLogCsv('t1', {});

    const lines = csv.split('\n');
    expect(lines[0]).toBe('timestamp,actor,module,entity,recordId,action,changes');
    expect(lines).toHaveLength(2);

    const row = lines[1]!;
    expect(row).toContain(timestamp.toISOString());
    expect(row).toContain('user-1');
    expect(row).toContain('SALES');
    expect(row).toContain('Lead');
    expect(row).toContain('rec-1');
    expect(row).toContain('CREATE');
  });
});
