import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateInvoiceFromDeal = vi.fn();

vi.mock('../invoicing/invoice.service.js', () => ({
  createInvoiceFromDeal: (...args: unknown[]) => mockCreateInvoiceFromDeal(...args),
}));

const mockQuoteFindFirst = vi.fn();

const mockPrisma = {
  quote: { findFirst: mockQuoteFindFirst },
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
}));

const mockLoggerWarn = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('../../../logger.js', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import { handleDealWon } from '../listeners.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateInvoiceFromDeal.mockResolvedValue({ id: 'inv-1' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── handleDealWon ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleDealWon', () => {
  it('creates invoice from deal\'s most recent quote', async () => {
    const quoteLines = [
      {
        description: 'Widget Pro',
        quantity: 5,
        unitPrice: 100,
        discount: 10,
        taxRate: 0.08,
      },
    ];

    // Prisma returns Decimal-like values; mock them as numbers
    const dbQuoteLines = quoteLines.map((l) => ({
      ...l,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      taxRate: l.taxRate,
    }));

    mockQuoteFindFirst.mockResolvedValue({
      id: 'quote-1',
      dealId: 'deal-1',
      lines: dbQuoteLines,
    });

    const payload = {
      dealId: 'deal-1',
      accountId: 'acc-1',
      contactId: 'contact-1',
    };

    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    expect(mockQuoteFindFirst).toHaveBeenCalledWith({
      where: { dealId: 'deal-1', tenantId: TENANT_ID },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    expect(mockCreateInvoiceFromDeal).toHaveBeenCalledWith(
      TENANT_ID,
      { id: 'deal-1', accountId: 'acc-1' },
      {
        lines: expect.arrayContaining([
          expect.objectContaining({ description: 'Widget Pro', quantity: 5, unitPrice: 100 }),
        ]),
      },
      'contact-1',
      ACTOR_ID,
    );
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it('handles case with no quotes gracefully', async () => {
    mockQuoteFindFirst.mockResolvedValue(null);

    const payload = { dealId: 'deal-2', accountId: null, contactId: null };

    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    expect(mockCreateInvoiceFromDeal).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ dealId: 'deal-2' }),
      expect.stringContaining('No quote found'),
    );
  });

  it('handles case with empty quote lines gracefully', async () => {
    mockQuoteFindFirst.mockResolvedValue({ id: 'quote-empty', dealId: 'deal-3', lines: [] });

    const payload = { dealId: 'deal-3', accountId: null, contactId: null };

    await handleDealWon(TENANT_ID, ACTOR_ID, payload as any);

    expect(mockCreateInvoiceFromDeal).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalled();
  });
});
