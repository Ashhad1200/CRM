import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockFindChartOfAccount = vi.fn();
const mockFindOrCreateFiscalPeriod = vi.fn();
const mockCreateJournalEntry = vi.fn();
const mockFindJournalEntry = vi.fn();
const mockFindJournalEntries = vi.fn();

vi.mock('../repository.js', () => ({
  findChartOfAccount: (...args: unknown[]) => mockFindChartOfAccount(...args),
  findOrCreateFiscalPeriod: (...args: unknown[]) => mockFindOrCreateFiscalPeriod(...args),
  createJournalEntry: (...args: unknown[]) => mockCreateJournalEntry(...args),
  findJournalEntry: (...args: unknown[]) => mockFindJournalEntry(...args),
  findJournalEntries: (...args: unknown[]) => mockFindJournalEntries(...args),
}));

const mockPrisma = {};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createJournalEntry,
  createReversingEntry,
  getEntriesByPeriod,
} from '../ledger/journal-entry.service.js';

import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFindChartOfAccount.mockResolvedValue({ id: 'acc-1', code: '1000', name: 'Cash', type: 'ASSET' });
  mockFindOrCreateFiscalPeriod.mockResolvedValue({ id: 'period-1', status: 'OPEN', name: 'January 2026' });
  mockCreateJournalEntry.mockResolvedValue({ id: 'je-1', description: 'Test entry', lines: [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createJournalEntry ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createJournalEntry', () => {
  const validData = {
    date: new Date('2026-01-15'),
    description: 'Test balanced entry',
    lines: [
      { accountId: 'acc-1', debit: 100, credit: 0, description: 'Debit line' },
      { accountId: 'acc-2', debit: 0, credit: 100, description: 'Credit line' },
    ],
  };

  it('creates entry when balanced (debits = credits)', async () => {
    const result = await createJournalEntry(TENANT_ID, validData, ACTOR_ID);

    expect(mockFindChartOfAccount).toHaveBeenCalledTimes(2);
    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'acc-1');
    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'acc-2');
    expect(mockFindOrCreateFiscalPeriod).toHaveBeenCalledWith(TENANT_ID, validData.date);
    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        date: validData.date,
        description: validData.description,
        periodId: 'period-1',
        isReversing: false,
        lines: validData.lines,
      }),
      ACTOR_ID,
    );
    expect(result).toEqual({ id: 'je-1', description: 'Test entry', lines: [] });
  });

  it('throws ValidationError when unbalanced', async () => {
    const unbalanced = {
      ...validData,
      lines: [
        { accountId: 'acc-1', debit: 100, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 50 },
      ],
    };

    await expect(createJournalEntry(TENANT_ID, unbalanced, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createJournalEntry(TENANT_ID, unbalanced, ACTOR_ID))
      .rejects.toThrow(/balanced/);
  });

  it('throws ValidationError when line has both debit and credit > 0', async () => {
    const bothPositive = {
      ...validData,
      lines: [
        { accountId: 'acc-1', debit: 100, credit: 50 },
        { accountId: 'acc-2', debit: 0, credit: 50 },
      ],
    };

    await expect(createJournalEntry(TENANT_ID, bothPositive, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createJournalEntry(TENANT_ID, bothPositive, ACTOR_ID))
      .rejects.toThrow(/either a debit or a credit/);
  });

  it('throws ValidationError when line has negative amounts', async () => {
    const negative = {
      ...validData,
      lines: [
        { accountId: 'acc-1', debit: -100, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: -100 },
      ],
    };

    await expect(createJournalEntry(TENANT_ID, negative, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createJournalEntry(TENANT_ID, negative, ACTOR_ID))
      .rejects.toThrow(/non-negative/);
  });

  it('throws ValidationError when line has debit=0 and credit=0', async () => {
    const zeroLine = {
      ...validData,
      lines: [
        { accountId: 'acc-1', debit: 0, credit: 0 },
        { accountId: 'acc-2', debit: 100, credit: 0 },
      ],
    };

    await expect(createJournalEntry(TENANT_ID, zeroLine, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createJournalEntry(TENANT_ID, zeroLine, ACTOR_ID))
      .rejects.toThrow(/positive debit or credit/);
  });

  it('throws ValidationError when fiscal period is CLOSED', async () => {
    mockFindOrCreateFiscalPeriod.mockResolvedValue({
      id: 'period-2',
      status: 'CLOSED',
      name: 'December 2025',
    });

    await expect(createJournalEntry(TENANT_ID, validData, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createJournalEntry(TENANT_ID, validData, ACTOR_ID))
      .rejects.toThrow(/closed/i);
  });

  it('validates all accounts exist (findChartOfAccount called for each line)', async () => {
    const threeLines = {
      ...validData,
      lines: [
        { accountId: 'acc-1', debit: 100, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 50 },
        { accountId: 'acc-3', debit: 0, credit: 50 },
      ],
    };

    await createJournalEntry(TENANT_ID, threeLines, ACTOR_ID);

    expect(mockFindChartOfAccount).toHaveBeenCalledTimes(3);
    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'acc-1');
    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'acc-2');
    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'acc-3');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createReversingEntry ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createReversingEntry', () => {
  const originalEntry = {
    id: 'je-orig',
    description: 'Original entry',
    lines: [
      { accountId: 'acc-1', debit: '200', credit: '0', description: 'Debit line' },
      { accountId: 'acc-2', debit: '0', credit: '200', description: 'Credit line' },
    ],
  };

  beforeEach(() => {
    mockFindJournalEntry.mockResolvedValue(originalEntry);
  });

  it('swaps debits and credits from original', async () => {
    await createReversingEntry(TENANT_ID, 'je-orig', ACTOR_ID);

    expect(mockFindJournalEntry).toHaveBeenCalledWith(TENANT_ID, 'je-orig');
    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        isReversing: true,
        reversedEntryId: 'je-orig',
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'acc-1', debit: 0, credit: 200 }),
          expect.objectContaining({ accountId: 'acc-2', debit: 200, credit: 0 }),
        ]),
      }),
      ACTOR_ID,
    );
  });

  it('throws when fiscal period is closed', async () => {
    mockFindOrCreateFiscalPeriod.mockResolvedValue({
      id: 'period-closed',
      status: 'CLOSED',
      name: 'December 2025',
    });

    await expect(createReversingEntry(TENANT_ID, 'je-orig', ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createReversingEntry(TENANT_ID, 'je-orig', ACTOR_ID))
      .rejects.toThrow(/closed/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getEntriesByPeriod ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getEntriesByPeriod', () => {
  it('passes filters and pagination to repo', async () => {
    const mockResult = { data: [{ id: 'je-1' }], total: 1 };
    mockFindJournalEntries.mockResolvedValue(mockResult);

    const filters = { periodId: 'period-1', accountId: 'acc-1' };
    const pagination = { page: 2, limit: 25 };

    const result = await getEntriesByPeriod(TENANT_ID, filters, pagination);

    expect(mockFindJournalEntries).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ periodId: 'period-1', accountId: 'acc-1' }),
      expect.objectContaining({ page: 2, limit: 25 }),
    );
    expect(result).toEqual(mockResult);
  });

  it('uses default pagination when not provided', async () => {
    mockFindJournalEntries.mockResolvedValue({ data: [], total: 0 });

    await getEntriesByPeriod(TENANT_ID);

    expect(mockFindJournalEntries).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({}),
      expect.objectContaining({ page: 1, limit: 50 }),
    );
  });
});
