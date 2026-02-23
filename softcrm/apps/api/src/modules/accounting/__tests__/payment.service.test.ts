import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockFindInvoice = vi.fn();
const mockCreatePayment = vi.fn();
const mockUpdateInvoiceStatus = vi.fn();
const mockFindChartOfAccounts = vi.fn();
const mockFindPaymentsByInvoice = vi.fn();

vi.mock('../repository.js', () => ({
  findInvoice: (...args: unknown[]) => mockFindInvoice(...args),
  createPayment: (...args: unknown[]) => mockCreatePayment(...args),
  updateInvoiceStatus: (...args: unknown[]) => mockUpdateInvoiceStatus(...args),
  findChartOfAccounts: (...args: unknown[]) => mockFindChartOfAccounts(...args),
  findPaymentsByInvoice: (...args: unknown[]) => mockFindPaymentsByInvoice(...args),
}));

const mockPublishPaymentReceived = vi.fn();

vi.mock('../events.js', () => ({
  publishPaymentReceived: (...args: unknown[]) => mockPublishPaymentReceived(...args),
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

import { recordPayment, getPaymentsByInvoice } from '../invoicing/payment.service.js';

import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

const systemAccounts = [
  { id: 'cash-id', code: '1000', name: 'Cash', type: 'ASSET' },
  { id: 'ar-id', code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
];

const sampleInvoice = {
  id: 'inv-1',
  invoiceNumber: 1001,
  status: 'SENT',
  total: '1000.00',
  paidAmount: '0.00',
};

const paymentData = {
  amount: 400,
  method: 'BANK_TRANSFER',
  date: '2026-02-15',
  reference: 'PAY-001',
  notes: 'Partial payment',
};

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFindChartOfAccounts.mockResolvedValue(systemAccounts);
  mockCreateJournalEntry.mockResolvedValue({ id: 'je-1' });
  mockCreatePayment.mockResolvedValue({ id: 'pay-1' });
  mockUpdateInvoiceStatus.mockResolvedValue(undefined);
  mockPublishPaymentReceived.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── recordPayment ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('recordPayment', () => {
  it('throws when invoice is VOID', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'VOID' });

    await expect(recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID))
      .rejects.toThrow(/void or draft/i);
  });

  it('throws when invoice is DRAFT', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'DRAFT' });

    await expect(recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID))
      .rejects.toThrow(ValidationError);
  });

  it('throws when amount exceeds remaining balance', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, paidAmount: '900.00' });

    const overpayment = { ...paymentData, amount: 200 };

    await expect(recordPayment(TENANT_ID, 'inv-1', overpayment as any, ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(recordPayment(TENANT_ID, 'inv-1', overpayment as any, ACTOR_ID))
      .rejects.toThrow(/exceeds remaining balance/);
  });

  it('creates JE with debit Cash credit AR', async () => {
    mockFindInvoice.mockResolvedValue(sampleInvoice);

    await recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID);

    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        description: expect.stringContaining('1001'),
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'cash-id', debit: 400, credit: 0 }),
          expect.objectContaining({ accountId: 'ar-id', debit: 0, credit: 400 }),
        ]),
      }),
      ACTOR_ID,
    );
  });

  it('sets status to PARTIAL when partially paid', async () => {
    mockFindInvoice
      .mockResolvedValueOnce(sampleInvoice) // first call
      .mockResolvedValueOnce({ ...sampleInvoice, status: 'PARTIAL', paidAmount: '400.00' }); // after update

    await recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID);

    expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'inv-1',
      'PARTIAL',
      expect.objectContaining({ paidAmount: 400 }),
    );
  });

  it('sets status to PAID when fully paid', async () => {
    mockFindInvoice
      .mockResolvedValueOnce(sampleInvoice) // first call
      .mockResolvedValueOnce({ ...sampleInvoice, status: 'PAID', paidAmount: '1000.00' }); // after

    const fullPayment = { ...paymentData, amount: 1000 };

    await recordPayment(TENANT_ID, 'inv-1', fullPayment as any, ACTOR_ID);

    expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'inv-1',
      'PAID',
      expect.objectContaining({ paidAmount: 1000, paidAt: expect.any(Date) }),
    );
  });

  it('publishes payment.received event', async () => {
    mockFindInvoice.mockResolvedValue(sampleInvoice);

    await recordPayment(TENANT_ID, 'inv-1', paymentData as any, ACTOR_ID);

    expect(mockPublishPaymentReceived).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        invoiceId: 'inv-1',
        amount: 400,
        method: 'BANK_TRANSFER',
        invoiceNumber: 1001,
        isFullyPaid: false,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getPaymentsByInvoice ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getPaymentsByInvoice', () => {
  it('delegates to repo', async () => {
    const payments = [{ id: 'pay-1', amount: 400 }];
    mockFindPaymentsByInvoice.mockResolvedValue(payments);

    const result = await getPaymentsByInvoice(TENANT_ID, 'inv-1');

    expect(mockFindPaymentsByInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-1');
    expect(result).toEqual(payments);
  });
});
