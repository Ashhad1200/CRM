import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateLead = vi.fn();
const mockFindLead = vi.fn();
const mockFindDeal = vi.fn();
const mockUpdateDealStage = vi.fn();
const mockCreateQuote = vi.fn();
const mockGetNextQuoteNumber = vi.fn();
const mockFindQuote = vi.fn();
const mockUpdateQuoteStatus = vi.fn();
const mockFindContacts = vi.fn();
const mockCreateContact = vi.fn();
const mockUpdateContact = vi.fn();
const mockFindContact = vi.fn();

vi.mock('../repository.js', () => ({
  createLead: (...args: unknown[]) => mockCreateLead(...args),
  findLead: (...args: unknown[]) => mockFindLead(...args),
  findDeal: (...args: unknown[]) => mockFindDeal(...args),
  updateDealStage: (...args: unknown[]) => mockUpdateDealStage(...args),
  createQuote: (...args: unknown[]) => mockCreateQuote(...args),
  getNextQuoteNumber: (...args: unknown[]) => mockGetNextQuoteNumber(...args),
  findQuote: (...args: unknown[]) => mockFindQuote(...args),
  updateQuoteStatus: (...args: unknown[]) => mockUpdateQuoteStatus(...args),
  findContacts: (...args: unknown[]) => mockFindContacts(...args),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  findContact: (...args: unknown[]) => mockFindContact(...args),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  findDeals: vi.fn(),
  findAccounts: vi.fn(),
  findAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  findLeads: vi.fn(),
  findPipelines: vi.fn(),
  findPipeline: vi.fn(),
  getDefaultPipeline: vi.fn(),
  findQuotes: vi.fn(),
}));

const mockPublishLeadCreated = vi.fn();
const mockPublishLeadConverted = vi.fn();
const mockPublishDealStageChanged = vi.fn();
const mockPublishDealWon = vi.fn();
const mockPublishDealLost = vi.fn();

vi.mock('../events.js', () => ({
  publishLeadCreated: (...args: unknown[]) => mockPublishLeadCreated(...args),
  publishLeadConverted: (...args: unknown[]) => mockPublishLeadConverted(...args),
  publishDealStageChanged: (...args: unknown[]) => mockPublishDealStageChanged(...args),
  publishDealWon: (...args: unknown[]) => mockPublishDealWon(...args),
  publishDealLost: (...args: unknown[]) => mockPublishDealLost(...args),
}));

const mockLeadUpdate = vi.fn();
const mockDealFindMany = vi.fn();
const mockDealUpdate = vi.fn();
const mockPipelineStageFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockContactCreate = vi.fn();
const mockAccountCreate = vi.fn();
const mockDealCreate = vi.fn();
const mockDealContactCreate = vi.fn();
const mockPipelineFindFirst = vi.fn();
const mockLeadUpdateInTx = vi.fn();
const mockQuoteAggregate = vi.fn();

const mockPrisma = {
  lead: { update: mockLeadUpdate },
  deal: { findMany: mockDealFindMany, update: mockDealUpdate },
  pipelineStage: { findFirst: mockPipelineStageFindFirst },
  quote: { aggregate: mockQuoteAggregate },
  $transaction: mockTransaction,
  contact: { create: mockContactCreate },
  account: { create: mockAccountCreate },
  pipeline: { findFirst: mockPipelineFindFirst },
  dealContact: { create: mockDealContactCreate },
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

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  captureLead,
  convertLead,
  moveDealStage,
  markDealWon,
  markDealLost,
  createQuote,
  submitForApproval,
  detectRottingDeals,
} from '../service.js';

import { NotFoundError, ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishLeadCreated.mockResolvedValue(undefined);
  mockPublishLeadConverted.mockResolvedValue(undefined);
  mockPublishDealStageChanged.mockResolvedValue(undefined);
  mockPublishDealWon.mockResolvedValue(undefined);
  mockPublishDealLost.mockResolvedValue(undefined);
  mockLeadUpdate.mockResolvedValue({});
  mockDealUpdate.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── captureLead ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('captureLead', () => {
  it('creates lead with calculated score (base 10 + 10 for company + 5 for phone)', async () => {
    const leadData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
      source: 'WEB_FORM' as const,
    };

    const createdLead = { id: 'lead-1', ...leadData, score: 0 };
    mockCreateLead.mockResolvedValue(createdLead);
    mockLeadUpdate.mockResolvedValue({ ...createdLead, score: 25 });

    const result = await captureLead(TENANT_ID, leadData, ACTOR_ID);

    // base (10) + company (10) + phone (5) = 25
    expect(result.score).toBe(25);
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { score: 25 },
    });
    expect(mockCreateLead).toHaveBeenCalledWith(TENANT_ID, leadData, ACTOR_ID);
    expect(mockPublishLeadCreated).toHaveBeenCalled();
  });

  it('lead with REFERRAL source gets +15 score bonus', async () => {
    const leadData = {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      source: 'REFERRAL' as const,
    };

    // No company, no phone → base (10) + REFERRAL (15) = 25
    const createdLead = { id: 'lead-2', ...leadData, score: 0 };
    mockCreateLead.mockResolvedValue(createdLead);
    mockLeadUpdate.mockResolvedValue({ ...createdLead, score: 25 });

    const result = await captureLead(TENANT_ID, leadData, ACTOR_ID);

    // base (10) + REFERRAL (15) = 25
    expect(result.score).toBe(25);
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: 'lead-2' },
      data: { score: 25 },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── convertLead ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('convertLead', () => {
  it('throws ValidationError when lead already converted', async () => {
    mockFindLead.mockResolvedValue({
      id: 'lead-1',
      status: 'CONVERTED',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    await expect(
      convertLead(TENANT_ID, 'lead-1', { createContact: true, createDeal: true }, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
  });

  it('creates contact, account and deal atomically (mock $transaction)', async () => {
    const lead = {
      id: 'lead-1',
      status: 'QUALIFIED',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
      jobTitle: 'CTO',
      assignedOwnerId: 'owner-1',
    };

    mockFindLead.mockResolvedValue(lead);

    // Set up $transaction to invoke the callback with a mock tx
    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        contact: {
          create: vi.fn().mockResolvedValue({ id: 'contact-1' }),
        },
        account: {
          create: vi.fn().mockResolvedValue({ id: 'account-1' }),
        },
        pipeline: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'pipeline-1',
            stages: [{ id: 'stage-1' }],
          }),
        },
        deal: {
          create: vi.fn().mockResolvedValue({ id: 'deal-1' }),
        },
        dealContact: {
          create: vi.fn().mockResolvedValue({}),
        },
        lead: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    const result = await convertLead(
      TENANT_ID,
      'lead-1',
      { createContact: true, createDeal: true },
      ACTOR_ID,
    );

    expect(result.leadId).toBe('lead-1');
    expect(result.contactId).toBeTruthy();
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockPublishLeadConverted).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── moveDealStage ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('moveDealStage', () => {
  it('updates stage and recalculates weighted value (value * newProbability / 100)', async () => {
    const deal = {
      id: 'deal-1',
      tenantId: TENANT_ID,
      pipelineId: 'pipeline-1',
      stageId: 'stage-old',
      value: '10000',
      stage: { name: 'Qualification' },
      contacts: [],
    };

    mockFindDeal
      .mockResolvedValueOnce(deal)
      .mockResolvedValueOnce({ ...deal, stageId: 'stage-new', probability: 60, weightedValue: 60 });

    mockPipelineStageFindFirst.mockResolvedValue({
      id: 'stage-new',
      name: 'Negotiation',
      probability: 60,
      pipelineId: 'pipeline-1',
    });

    mockUpdateDealStage.mockResolvedValue({});
    mockDealUpdate.mockResolvedValue({});

    const result = await moveDealStage(TENANT_ID, 'deal-1', 'stage-new', ACTOR_ID);

    // Math.round(10000 * 60) / 100 = 6000
    expect(mockUpdateDealStage).toHaveBeenCalledWith(
      TENANT_ID,
      'deal-1',
      'stage-new',
      60,
      6000,
      ACTOR_ID,
    );
    expect(mockPublishDealStageChanged).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      { id: 'deal-1' },
      'Qualification',
      'Negotiation',
    );
    expect(result).toBeDefined();
  });

  it('throws NotFoundError for nonexistent deal', async () => {
    mockFindDeal.mockRejectedValue(new NotFoundError('Deal', 'nonexistent'));

    await expect(
      moveDealStage(TENANT_ID, 'nonexistent', 'stage-1', ACTOR_ID),
    ).rejects.toThrow(NotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── markDealWon ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('markDealWon', () => {
  it('sets wonAt, probability=100, publishes deal.won event', async () => {
    const deal = {
      id: 'deal-1',
      tenantId: TENANT_ID,
      value: '50000',
      currency: 'USD',
      accountId: 'account-1',
      wonAt: null,
      lostAt: null,
      contacts: [{ contactId: 'contact-1' }],
      stage: { name: 'Closed Won' },
    };

    mockFindDeal
      .mockResolvedValueOnce(deal)
      .mockResolvedValueOnce({ ...deal, wonAt: new Date(), probability: 100 });

    mockDealUpdate.mockResolvedValue({});

    const result = await markDealWon(TENANT_ID, 'deal-1', ACTOR_ID);

    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deal-1' },
        data: expect.objectContaining({
          probability: 100,
          weightedValue: 50000,
        }),
      }),
    );
    expect(mockPublishDealWon).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: 'deal-1', value: 50000, currency: 'USD' }),
      ['contact-1'],
    );
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── markDealLost ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('markDealLost', () => {
  it('sets lostAt, lostReason, probability=0, publishes deal.lost event', async () => {
    const deal = {
      id: 'deal-2',
      tenantId: TENANT_ID,
      value: '30000',
      wonAt: null,
      lostAt: null,
      contacts: [],
      stage: { name: 'Proposal' },
    };

    mockFindDeal
      .mockResolvedValueOnce(deal)
      .mockResolvedValueOnce({ ...deal, lostAt: new Date(), probability: 0 });

    mockDealUpdate.mockResolvedValue({});

    const result = await markDealLost(TENANT_ID, 'deal-2', 'Budget constraints', ACTOR_ID);

    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deal-2' },
        data: expect.objectContaining({
          probability: 0,
          weightedValue: 0,
          lostReason: 'Budget constraints',
        }),
      }),
    );
    expect(mockPublishDealLost).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: 'deal-2', lostReason: 'Budget constraints' }),
    );
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createQuote ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createQuote', () => {
  it('calculates line totals correctly (quantity * unitPrice with discount and tax)', async () => {
    // Ensure findDeal (for deal validation) succeeds
    mockFindDeal.mockResolvedValue({ id: 'deal-1', tenantId: TENANT_ID });
    mockGetNextQuoteNumber.mockResolvedValue(1);

    const mockQuote = {
      id: 'quote-1',
      quoteNumber: 1,
      total: 110.0,
      lines: [
        {
          description: 'Widget A',
          quantity: 2,
          unitPrice: 50,
          discount: 10,
          taxRate: 10,
          lineTotal: 99.0,
        },
      ],
    };
    mockCreateQuote.mockResolvedValue(mockQuote);

    const quoteData = {
      dealId: 'deal-1',
      title: 'Test Quote',
      lines: [
        {
          description: 'Widget A',
          quantity: 2,
          unitPrice: 50,
          discount: 10, // 10%
          taxRate: 10,  // 10%
        },
      ],
    };

    const result = await createQuote(TENANT_ID, quoteData, ACTOR_ID);

    // Line calculation: 2 * 50 = 100, after 10% discount = 90, plus 10% tax = 99
    expect(mockCreateQuote).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        dealId: 'deal-1',
        quoteNumber: 1,
        lines: expect.arrayContaining([
          expect.objectContaining({
            description: 'Widget A',
            lineTotal: 99,
          }),
        ]),
      }),
      ACTOR_ID,
    );
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── submitForApproval ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('submitForApproval', () => {
  it('auto-approves when no line discount exceeds threshold', async () => {
    const quote = {
      id: 'quote-1',
      tenantId: TENANT_ID,
      status: 'DRAFT',
      approvalStatus: 'NONE',
      lines: [
        { discount: 5, description: 'Item 1' },
        { discount: 10, description: 'Item 2' },
      ],
    };

    mockFindQuote.mockResolvedValue(quote);
    mockUpdateQuoteStatus.mockResolvedValue({
      ...quote,
      approvalStatus: 'APPROVED',
    });

    const result = await submitForApproval(TENANT_ID, 'quote-1', 20, ACTOR_ID);

    // No line has discount > 20, so it should be auto-approved
    expect(mockUpdateQuoteStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'quote-1',
      'DRAFT',     // current status (kept)
      'APPROVED',  // auto-approved since no line exceeds threshold
    );
    expect(result).toBeDefined();
  });

  it('sets PENDING when a line discount exceeds threshold', async () => {
    const quote = {
      id: 'quote-2',
      tenantId: TENANT_ID,
      status: 'DRAFT',
      approvalStatus: 'NONE',
      lines: [
        { discount: 5, description: 'Item 1' },
        { discount: 25, description: 'Item 2' }, // exceeds 20
      ],
    };

    mockFindQuote.mockResolvedValue(quote);
    mockUpdateQuoteStatus.mockResolvedValue({
      ...quote,
      approvalStatus: 'PENDING',
    });

    await submitForApproval(TENANT_ID, 'quote-2', 20, ACTOR_ID);

    expect(mockUpdateQuoteStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'quote-2',
      'DRAFT',
      'PENDING',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── detectRottingDeals ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('detectRottingDeals', () => {
  it('returns deals with no activity past threshold', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);

    const rottingDeal = {
      id: 'deal-rot-1',
      tenantId: TENANT_ID,
      name: 'Stale deal',
      lastActivityAt: oldDate,
      wonAt: null,
      lostAt: null,
    };

    mockDealFindMany.mockResolvedValue([rottingDeal]);

    const result = await detectRottingDeals(TENANT_ID, 30);

    expect(mockDealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          wonAt: null,
          lostAt: null,
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('deal-rot-1');
  });
});
