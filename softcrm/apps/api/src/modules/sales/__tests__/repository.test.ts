import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ────────────────────────────────────────────────────────────────

const mockPrisma = {
  contact: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  account: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  lead: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  deal: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  quote: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  pipeline: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  dealContact: {
    createMany: vi.fn(),
    create: vi.fn(),
  },
  quoteLine: {
    createMany: vi.fn(),
  },
  $transaction: vi.fn((fnOrArray: unknown) => {
    if (typeof fnOrArray === 'function') {
      return (fnOrArray as Function)(mockPrisma);
    }
    // Array form — resolve all promises in the array
    return Promise.all(fnOrArray as Promise<unknown>[]);
  }),
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

// ── Import under test ──────────────────────────────────────────────────────────

import {
  findContacts,
  createContact,
  updateContact,
  getNextQuoteNumber,
  findContact,
  findLead,
} from '../repository.js';

import { ConflictError, NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── findContacts ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('findContacts', () => {
  it('builds correct where clause with search filter (OR on firstName, lastName, company)', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);

    await findContacts(
      TENANT_ID,
      { tenantId: TENANT_ID, search: 'john' },
      { page: 1, limit: 20 },
    );

    // $transaction is called with an array of two promises
    expect(mockPrisma.$transaction).toHaveBeenCalled();

    // Verify findMany was called with the OR clause
    expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          OR: expect.arrayContaining([
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { company: { contains: 'john', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('applies ownership scope OWN filter (adds ownerId to where)', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);

    await findContacts(
      TENANT_ID,
      { tenantId: TENANT_ID },
      { page: 1, limit: 20 },
      { scope: 'OWN', userId: 'user-1' },
    );

    expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          ownerId: 'user-1',
        }),
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createContact ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createContact', () => {
  it('passes correct data to prisma.contact.create', async () => {
    const contactData = {
      firstName: 'Jane',
      lastName: 'Doe',
      emails: ['jane@example.com'],
      phones: ['+1234567890'],
      company: 'Acme Corp',
      jobTitle: 'CTO',
    };

    const createdContact = { id: 'contact-1', tenantId: TENANT_ID, ...contactData };
    mockPrisma.contact.create.mockResolvedValue(createdContact);

    const result = await createContact(TENANT_ID, contactData, ACTOR_ID);

    expect(mockPrisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        emails: ['jane@example.com'],
        phones: ['+1234567890'],
        company: 'Acme Corp',
        jobTitle: 'CTO',
        createdBy: ACTOR_ID,
        updatedBy: ACTOR_ID,
      }),
    });
    expect(result.id).toBe('contact-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── updateContact ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateContact', () => {
  it('throws ConflictError when version mismatch (updateMany returns count 0)', async () => {
    mockPrisma.contact.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateContact(TENANT_ID, 'contact-1', { version: 1, firstName: 'Updated' }, ACTOR_ID),
    ).rejects.toThrow(ConflictError);
  });

  it('succeeds when version matches (updateMany returns count 1)', async () => {
    mockPrisma.contact.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.contact.findFirstOrThrow.mockResolvedValue({
      id: 'contact-1',
      firstName: 'Updated',
      version: 2,
    });

    const result = await updateContact(
      TENANT_ID,
      'contact-1',
      { version: 1, firstName: 'Updated' },
      ACTOR_ID,
    );

    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
      where: { id: 'contact-1', tenantId: TENANT_ID, version: 1 },
      data: expect.objectContaining({
        firstName: 'Updated',
        version: { increment: 1 },
        updatedBy: ACTOR_ID,
      }),
    });
    expect(result.firstName).toBe('Updated');
    expect(result.version).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getNextQuoteNumber ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getNextQuoteNumber', () => {
  it('returns 1 when no quotes exist', async () => {
    mockPrisma.quote.aggregate.mockResolvedValue({
      _max: { quoteNumber: null },
    });

    const num = await getNextQuoteNumber(TENANT_ID);

    expect(num).toBe(1);
    expect(mockPrisma.quote.aggregate).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID },
      _max: { quoteNumber: true },
    });
  });

  it('returns max+1 when quotes exist', async () => {
    mockPrisma.quote.aggregate.mockResolvedValue({
      _max: { quoteNumber: 7 },
    });

    const num = await getNextQuoteNumber(TENANT_ID);

    expect(num).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── findContact ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('findContact', () => {
  it('throws NotFoundError when contact does not exist', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);

    await expect(findContact(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
  });
});
