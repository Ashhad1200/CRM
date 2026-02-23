import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockFindChartOfAccount = vi.fn();
const mockCreateExpense = vi.fn();
const mockFindExpenses = vi.fn();
const mockFindExpense = vi.fn();
const mockUpdateExpenseStatus = vi.fn();
const mockFindChartOfAccounts = vi.fn();

vi.mock('../repository.js', () => ({
  findChartOfAccount: (...args: unknown[]) => mockFindChartOfAccount(...args),
  createExpense: (...args: unknown[]) => mockCreateExpense(...args),
  findExpenses: (...args: unknown[]) => mockFindExpenses(...args),
  findExpense: (...args: unknown[]) => mockFindExpense(...args),
  updateExpenseStatus: (...args: unknown[]) => mockUpdateExpenseStatus(...args),
  findChartOfAccounts: (...args: unknown[]) => mockFindChartOfAccounts(...args),
}));

const mockPublishExpenseApproved = vi.fn();

vi.mock('../events.js', () => ({
  publishExpenseApproved: (...args: unknown[]) => mockPublishExpenseApproved(...args),
}));

const mockCreateJournalEntry = vi.fn();

vi.mock('../ledger/journal-entry.service.js', () => ({
  createJournalEntry: (...args: unknown[]) => mockCreateJournalEntry(...args),
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
  createExpense,
  getExpenses,
  approveExpense,
  rejectExpense,
} from '../expenses/expense.service.js';

import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

const systemAccounts = [
  { id: 'ap-id', code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
];

const sampleExpense = {
  id: 'exp-1',
  categoryId: 'cat-expense-1',
  vendorName: 'Office Depot',
  amount: '250.00',
  date: '2026-01-20',
  status: 'PENDING',
};

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFindChartOfAccounts.mockResolvedValue(systemAccounts);
  mockCreateJournalEntry.mockResolvedValue({ id: 'je-1' });
  mockUpdateExpenseStatus.mockResolvedValue(undefined);
  mockPublishExpenseApproved.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createExpense ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createExpense', () => {
  it('validates category is EXPENSE type and creates expense', async () => {
    mockFindChartOfAccount.mockResolvedValue({ id: 'cat-expense-1', code: '5000', name: 'Office Supplies', type: 'EXPENSE' });
    mockCreateExpense.mockResolvedValue({ id: 'exp-new', categoryId: 'cat-expense-1' });

    const data = { categoryId: 'cat-expense-1', vendorName: 'Staples', amount: 100, date: '2026-02-01' };

    const result = await createExpense(TENANT_ID, data as any, ACTOR_ID);

    expect(mockFindChartOfAccount).toHaveBeenCalledWith(TENANT_ID, 'cat-expense-1');
    expect(mockCreateExpense).toHaveBeenCalledWith(TENANT_ID, data, ACTOR_ID);
    expect(result.id).toBe('exp-new');
  });

  it('throws when category is not EXPENSE type', async () => {
    mockFindChartOfAccount.mockResolvedValue({ id: 'cat-asset', code: '1000', name: 'Cash', type: 'ASSET' });

    const data = { categoryId: 'cat-asset', vendorName: 'Vendor', amount: 50, date: '2026-02-01' };

    await expect(createExpense(TENANT_ID, data as any, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(createExpense(TENANT_ID, data as any, ACTOR_ID))
      .rejects.toThrow(/EXPENSE type/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getExpenses ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getExpenses', () => {
  it('returns paginated result', async () => {
    mockFindExpenses.mockResolvedValue({
      data: [{ id: 'exp-1' }, { id: 'exp-2' }],
      total: 12,
    });

    const result = await getExpenses(TENANT_ID, {}, { page: 1, limit: 10 });

    expect(result).toEqual({
      data: [{ id: 'exp-1' }, { id: 'exp-2' }],
      total: 12,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── approveExpense ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('approveExpense', () => {
  it('throws when status is not PENDING', async () => {
    mockFindExpense.mockResolvedValue({ ...sampleExpense, status: 'APPROVED' });

    await expect(approveExpense(TENANT_ID, 'exp-1', ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(approveExpense(TENANT_ID, 'exp-1', ACTOR_ID))
      .rejects.toThrow(/pending/i);
  });

  it('creates JE (debit category, credit AP 2000), publishes event', async () => {
    mockFindExpense.mockResolvedValue(sampleExpense);

    await approveExpense(TENANT_ID, 'exp-1', ACTOR_ID);

    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        description: expect.stringContaining('Office Depot'),
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'cat-expense-1', debit: 250, credit: 0 }),
          expect.objectContaining({ accountId: 'ap-id', debit: 0, credit: 250 }),
        ]),
      }),
      ACTOR_ID,
    );
    expect(mockUpdateExpenseStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'exp-1',
      'APPROVED',
      expect.objectContaining({
        approvedBy: ACTOR_ID,
        approvedAt: expect.any(Date),
        journalEntryId: 'je-1',
      }),
    );
    expect(mockPublishExpenseApproved).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ expenseId: 'exp-1', amount: 250, vendorName: 'Office Depot' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── rejectExpense ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('rejectExpense', () => {
  it('throws when status is not PENDING', async () => {
    mockFindExpense.mockResolvedValue({ ...sampleExpense, status: 'APPROVED' });

    await expect(rejectExpense(TENANT_ID, 'exp-1', 'Not approved', ACTOR_ID))
      .rejects.toThrow(ValidationError);
  });

  it('updates status to REJECTED with reason', async () => {
    mockFindExpense
      .mockResolvedValueOnce(sampleExpense) // guard check
      .mockResolvedValueOnce({ ...sampleExpense, status: 'REJECTED' }); // return

    await rejectExpense(TENANT_ID, 'exp-1', 'Duplicate receipt', ACTOR_ID);

    expect(mockUpdateExpenseStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'exp-1',
      'REJECTED',
      expect.objectContaining({ rejectedReason: 'Duplicate receipt' }),
    );
  });
});
