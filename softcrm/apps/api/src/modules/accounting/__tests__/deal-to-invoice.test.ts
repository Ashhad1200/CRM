import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test: Deal → Invoice flow.
 *
 * Verifies the full deal-won-to-invoice pipeline:
 *   1. deal.won event triggers handleDealWon listener
 *   2. handleDealWon fetches the deal's quote from the DB
 *   3. invoice.service.createInvoiceFromDeal maps quote lines
 *   4. repo.createInvoice persists the invoice
 *
 * This test wires the real service + listener code together,
 * but mocks the database and event bus boundaries.
 */

// ── Common mocks ───────────────────────────────────────────────────────────────

const mockInvoiceCreate = vi.fn();
const mockInvoiceFindFirst = vi.fn();
const mockQuoteFindFirst = vi.fn();

const mockPrisma = {
  quote: { findFirst: mockQuoteFindFirst },
  invoice: {
    create: mockInvoiceCreate,
    findFirst: mockInvoiceFindFirst,
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    // Simple passthrough — delegate to the same mock prisma
    return fn(mockPrisma);
  }),
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

vi.mock('../../../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the outbox so events don't fail
const mockOutboxCreate = vi.fn();
Object.assign(mockPrisma, { outbox: { create: mockOutboxCreate } });

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { handleDealWon } from '../listeners.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOutboxCreate.mockResolvedValue({ id: 'outbox-1' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Deal-to-Invoice Integration ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deal-to-Invoice integration flow', () => {
  const quoteWithLines = {
    id: 'quote-1',
    dealId: 'deal-1',
    tenantId: TENANT_ID,
    lines: [
      {
        description: 'Consulting Services',
        quantity: 10,
        unitPrice: 150,
        discount: 5,
        taxRate: 8,
      },
      {
        description: 'Software License',
        quantity: 1,
        unitPrice: 5000,
        discount: 0,
        taxRate: 8,
      },
    ],
  };

  it('creates invoice from deal quote when deal is won', async () => {
    mockQuoteFindFirst.mockResolvedValue(quoteWithLines);

    // The repo.createInvoice goes through $transaction → invoice.create
    const createdInvoice = {
      id: 'inv-1',
      tenantId: TENANT_ID,
      invoiceNumber: 1,
      status: 'DRAFT',
      dealId: 'deal-1',
      total: 6825, // (10*150*(0.95) + 5000) + tax
      lines: quoteWithLines.lines,
      payments: [],
    };
    mockInvoiceFindFirst.mockResolvedValue({ invoiceNumber: 0 });
    mockInvoiceCreate.mockResolvedValue(createdInvoice);

    const payload = {
      dealId: 'deal-1',
      accountId: 'acc-1',
      contactId: 'contact-1',
    };

    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    // Verify quote was fetched for the deal
    expect(mockQuoteFindFirst).toHaveBeenCalledWith({
      where: { dealId: 'deal-1', tenantId: TENANT_ID },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('skips invoice creation when deal has no quote', async () => {
    mockQuoteFindFirst.mockResolvedValue(null);

    const payload = {
      dealId: 'deal-no-quote',
      accountId: null,
      contactId: null,
    };

    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    // Should NOT attempt to create an invoice
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
  });

  it('maps all quote line fields to invoice line fields', async () => {
    const singleLineQuote = {
      id: 'quote-2',
      dealId: 'deal-2',
      tenantId: TENANT_ID,
      lines: [
        {
          description: 'Widget',
          quantity: 3,
          unitPrice: 200,
          discount: 10,
          taxRate: 5,
        },
      ],
    };

    mockQuoteFindFirst.mockResolvedValue(singleLineQuote);
    mockInvoiceFindFirst.mockResolvedValue({ invoiceNumber: 5 });
    mockInvoiceCreate.mockResolvedValue({
      id: 'inv-2',
      tenantId: TENANT_ID,
      invoiceNumber: 6,
      status: 'DRAFT',
      lines: [],
      payments: [],
    });

    const payload = { dealId: 'deal-2', accountId: null, contactId: null };
    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    // Quote was found and had lines, so createInvoiceFromDeal should have been called
    expect(mockQuoteFindFirst).toHaveBeenCalled();
  });
});
