import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateInvoice = vi.fn();
const mockFindInvoice = vi.fn();
const mockFindInvoices = vi.fn();
const mockUpdateInvoiceStatus = vi.fn();
const mockUpdateDraftInvoice = vi.fn();
const mockFindChartOfAccounts = vi.fn();
const mockFindOverdueInvoices = vi.fn();
const mockCreateCreditNote = vi.fn();

vi.mock('../repository.js', () => ({
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
  findInvoice: (...args: unknown[]) => mockFindInvoice(...args),
  findInvoices: (...args: unknown[]) => mockFindInvoices(...args),
  updateInvoiceStatus: (...args: unknown[]) => mockUpdateInvoiceStatus(...args),
  updateDraftInvoice: (...args: unknown[]) => mockUpdateDraftInvoice(...args),
  findChartOfAccounts: (...args: unknown[]) => mockFindChartOfAccounts(...args),
  findOverdueInvoices: (...args: unknown[]) => mockFindOverdueInvoices(...args),
  createCreditNote: (...args: unknown[]) => mockCreateCreditNote(...args),
}));

const mockPublishInvoiceSent = vi.fn();

vi.mock('../events.js', () => ({
  publishInvoiceSent: (...args: unknown[]) => mockPublishInvoiceSent(...args),
  publishInvoiceCreated: vi.fn(),
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
  createInvoice,
  getInvoices,
  getInvoice,
  sendInvoice,
  voidInvoice,
  createInvoiceFromDeal,
} from '../invoicing/invoice.service.js';

import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

const systemAccounts = [
  { id: 'ar-id', code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { id: 'rev-id', code: '4000', name: 'Revenue', type: 'REVENUE' },
  { id: 'cash-id', code: '1000', name: 'Cash', type: 'ASSET' },
];

const sampleInvoice = {
  id: 'inv-1',
  invoiceNumber: 1001,
  status: 'DRAFT',
  total: '500.00',
  paidAmount: '0.00',
  lines: [],
};

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishInvoiceSent.mockResolvedValue(undefined);
  mockCreateJournalEntry.mockResolvedValue({ id: 'je-1' });
  mockFindChartOfAccounts.mockResolvedValue(systemAccounts);
  mockUpdateInvoiceStatus.mockResolvedValue(undefined);
  mockCreateCreditNote.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createInvoice ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createInvoice', () => {
  it('delegates to repo.createInvoice', async () => {
    const invoiceData = {
      contactId: 'contact-1',
      currency: 'USD',
      paymentTerms: 'Net 30',
      dueDate: '2026-03-01',
      lines: [{ description: 'Service', quantity: 1, unitPrice: 500, discount: 0, taxRate: 0 }],
    };
    mockCreateInvoice.mockResolvedValue({ id: 'inv-new', ...invoiceData });

    const result = await createInvoice(TENANT_ID, invoiceData as any, ACTOR_ID);

    expect(mockCreateInvoice).toHaveBeenCalledWith(TENANT_ID, invoiceData, ACTOR_ID);
    expect(result.id).toBe('inv-new');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getInvoices ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getInvoices', () => {
  it('returns paginated result with page/pageSize/totalPages', async () => {
    mockFindInvoices.mockResolvedValue({
      data: [{ id: 'inv-1' }, { id: 'inv-2' }],
      total: 15,
    });

    const result = await getInvoices(TENANT_ID, {}, { page: 2, limit: 5 });

    expect(result).toEqual({
      data: [{ id: 'inv-1' }, { id: 'inv-2' }],
      total: 15,
      page: 2,
      pageSize: 5,
      totalPages: 3,
    });
    expect(mockFindInvoices).toHaveBeenCalledWith(TENANT_ID, {}, { page: 2, limit: 5 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getInvoice ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getInvoice', () => {
  it('delegates to repo.findInvoice', async () => {
    mockFindInvoice.mockResolvedValue(sampleInvoice);

    const result = await getInvoice(TENANT_ID, 'inv-1');

    expect(mockFindInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-1');
    expect(result).toEqual(sampleInvoice);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── sendInvoice ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendInvoice', () => {
  it('throws when status is not DRAFT', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'SENT' });

    await expect(sendInvoice(TENANT_ID, 'inv-1', ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(sendInvoice(TENANT_ID, 'inv-1', ACTOR_ID))
      .rejects.toThrow(/draft/i);
  });

  it('throws when system accounts missing (no 1200 or 4000)', async () => {
    mockFindInvoice.mockResolvedValue(sampleInvoice);
    mockFindChartOfAccounts.mockResolvedValue([]); // no accounts

    await expect(sendInvoice(TENANT_ID, 'inv-1', ACTOR_ID))
      .rejects.toThrow(ValidationError);
    await expect(sendInvoice(TENANT_ID, 'inv-1', ACTOR_ID))
      .rejects.toThrow(/System accounts/);
  });

  it('creates JE with debit AR credit Revenue, updates status to SENT', async () => {
    mockFindInvoice.mockResolvedValue(sampleInvoice);
    mockFindInvoice.mockResolvedValueOnce(sampleInvoice); // first call for validation
    mockFindInvoice.mockResolvedValueOnce({ ...sampleInvoice, status: 'SENT' }); // after update

    await sendInvoice(TENANT_ID, 'inv-1', ACTOR_ID);

    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        description: expect.stringContaining('1001'),
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'ar-id', debit: 500, credit: 0 }),
          expect.objectContaining({ accountId: 'rev-id', debit: 0, credit: 500 }),
        ]),
      }),
      ACTOR_ID,
    );
    expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'inv-1',
      'SENT',
      expect.objectContaining({ sentAt: expect.any(Date) }),
    );
    expect(mockPublishInvoiceSent).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: 'inv-1', invoiceNumber: 1001, total: 500 }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── voidInvoice ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('voidInvoice', () => {
  it('throws when status is DRAFT', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'DRAFT' });

    await expect(voidInvoice(TENANT_ID, 'inv-1', 'Duplicate', ACTOR_ID))
      .rejects.toThrow(ValidationError);
  });

  it('throws when status is PAID', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'PAID' });

    await expect(voidInvoice(TENANT_ID, 'inv-1', 'Error', ACTOR_ID))
      .rejects.toThrow(ValidationError);
  });

  it('creates reversing JE and credit note, updates to VOID', async () => {
    mockFindInvoice.mockResolvedValue({ ...sampleInvoice, status: 'SENT' });

    await voidInvoice(TENANT_ID, 'inv-1', 'Client cancelled', ACTOR_ID);

    // Reversing JE: credit AR, debit Revenue (opposite of send)
    expect(mockCreateJournalEntry).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        description: expect.stringContaining('Void'),
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'ar-id', debit: 0, credit: 500 }),
          expect.objectContaining({ accountId: 'rev-id', debit: 500, credit: 0 }),
        ]),
      }),
      ACTOR_ID,
    );
    expect(mockCreateCreditNote).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ invoiceId: 'inv-1', amount: 500, reason: 'Client cancelled' }),
      ACTOR_ID,
    );
    expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith(TENANT_ID, 'inv-1', 'VOID');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createInvoiceFromDeal ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createInvoiceFromDeal', () => {
  it('maps quote lines to invoice lines', async () => {
    const deal = { id: 'deal-1', accountId: 'acc-1' };
    const quote = {
      lines: [
        { description: 'Widget', quantity: 2, unitPrice: 100, discount: 10, taxRate: 0.1, productId: 'prod-1' },
        { description: 'Service', quantity: 1, unitPrice: 300, discount: 0, taxRate: 0 },
      ],
    };

    mockCreateInvoice.mockResolvedValue({ id: 'inv-new', dealId: 'deal-1' });

    await createInvoiceFromDeal(TENANT_ID, deal, quote, 'contact-1', ACTOR_ID);

    expect(mockCreateInvoice).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        dealId: 'deal-1',
        accountId: 'acc-1',
        contactId: 'contact-1',
        currency: 'USD',
        paymentTerms: 'Net 30',
        lines: [
          expect.objectContaining({ description: 'Widget', quantity: 2, unitPrice: 100, discount: 10, taxRate: 0.1 }),
          expect.objectContaining({ description: 'Service', quantity: 1, unitPrice: 300, discount: 0, taxRate: 0 }),
        ],
      }),
      ACTOR_ID,
    );
  });
});
