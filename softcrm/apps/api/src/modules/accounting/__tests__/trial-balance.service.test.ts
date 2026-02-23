import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockFindFiscalPeriodByYearMonth = vi.fn();
const mockFindChartOfAccounts = vi.fn();
const mockGetAccountBalance = vi.fn();

vi.mock('../repository.js', () => ({
  findFiscalPeriodByYearMonth: (...args: unknown[]) => mockFindFiscalPeriodByYearMonth(...args),
  findChartOfAccounts: (...args: unknown[]) => mockFindChartOfAccounts(...args),
  getAccountBalance: (...args: unknown[]) => mockGetAccountBalance(...args),
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

import { generateTrialBalance } from '../ledger/trial-balance.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';

const samplePeriod = {
  id: 'period-1',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  year: 2026,
  month: 1,
  name: 'January 2026',
  status: 'OPEN',
};

const sampleAccounts = [
  { id: 'acc-1', code: '1000', name: 'Cash', type: 'ASSET' },
  { id: 'acc-2', code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { id: 'acc-3', code: '4000', name: 'Revenue', type: 'REVENUE' },
  { id: 'acc-4', code: '5000', name: 'COGS', type: 'EXPENSE' },
];

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── generateTrialBalance ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateTrialBalance', () => {
  it('returns empty result when no fiscal period found', async () => {
    mockFindFiscalPeriodByYearMonth.mockResolvedValue(null);

    const result = await generateTrialBalance(TENANT_ID, 2026, 1);

    expect(result).toEqual({
      rows: [],
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: true,
    });
    expect(mockFindChartOfAccounts).not.toHaveBeenCalled();
  });

  it('returns rows with debit/credit totals for each account', async () => {
    mockFindFiscalPeriodByYearMonth.mockResolvedValue(samplePeriod);
    mockFindChartOfAccounts.mockResolvedValue(sampleAccounts);
    mockGetAccountBalance
      .mockResolvedValueOnce({ debit: 5000, credit: 0 })     // Cash
      .mockResolvedValueOnce({ debit: 2000, credit: 500 })    // AR
      .mockResolvedValueOnce({ debit: 0, credit: 6500 })      // Revenue
      .mockResolvedValueOnce({ debit: 0, credit: 0 });        // COGS — zero, excluded

    const result = await generateTrialBalance(TENANT_ID, 2026, 1);

    expect(result.rows).toHaveLength(3); // COGS excluded (zero activity)
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: 'acc-1', code: '1000', debit: 5000, credit: 0 }),
        expect.objectContaining({ accountId: 'acc-2', code: '1200', debit: 2000, credit: 500 }),
        expect.objectContaining({ accountId: 'acc-3', code: '4000', debit: 0, credit: 6500 }),
      ]),
    );
    expect(result.totalDebits).toBe(7000);
    expect(result.totalCredits).toBe(7000);
  });

  it('isBalanced is true when debits equal credits', async () => {
    mockFindFiscalPeriodByYearMonth.mockResolvedValue(samplePeriod);
    mockFindChartOfAccounts.mockResolvedValue([sampleAccounts[0], sampleAccounts[2]]);
    mockGetAccountBalance
      .mockResolvedValueOnce({ debit: 1000, credit: 0 })
      .mockResolvedValueOnce({ debit: 0, credit: 1000 });

    const result = await generateTrialBalance(TENANT_ID, 2026, 1);

    expect(result.isBalanced).toBe(true);
    expect(result.totalDebits).toBe(1000);
    expect(result.totalCredits).toBe(1000);
  });

  it('only includes accounts with non-zero activity', async () => {
    mockFindFiscalPeriodByYearMonth.mockResolvedValue(samplePeriod);
    mockFindChartOfAccounts.mockResolvedValue(sampleAccounts);
    mockGetAccountBalance
      .mockResolvedValueOnce({ debit: 500, credit: 0 })  // Cash — active
      .mockResolvedValueOnce({ debit: 0, credit: 0 })    // AR — zero
      .mockResolvedValueOnce({ debit: 0, credit: 500 })  // Revenue — active
      .mockResolvedValueOnce({ debit: 0, credit: 0 });   // COGS — zero

    const result = await generateTrialBalance(TENANT_ID, 2026, 1);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r: any) => r.accountId)).toEqual(['acc-1', 'acc-3']);
  });

  it('rounds totals to 2 decimal places', async () => {
    mockFindFiscalPeriodByYearMonth.mockResolvedValue(samplePeriod);
    mockFindChartOfAccounts.mockResolvedValue([sampleAccounts[0], sampleAccounts[2]]);
    mockGetAccountBalance
      .mockResolvedValueOnce({ debit: 100.336, credit: 0 })
      .mockResolvedValueOnce({ debit: 0, credit: 100.334 });

    const result = await generateTrialBalance(TENANT_ID, 2026, 1);

    expect(result.totalDebits).toBe(100.34);
    expect(result.totalCredits).toBe(100.33);
  });
});
