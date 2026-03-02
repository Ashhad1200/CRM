import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the db module ────────────────────────────────────────────────────────

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock('../../../../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getPrismaClient } from '@softcrm/db';
import { SearchService } from '../search.service.prisma.js';

const mockGetPrismaClient = vi.mocked(getPrismaClient);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-123';

const contactRecord = {
  id: 'c-1',
  firstName: 'Jane',
  lastName: 'Doe',
  company: 'Acme Corp',
};

const dealRecord = {
  id: 'd-1',
  name: 'Big Deal',
  stage: 'Proposal',
};

const ticketRecord = {
  id: 't-1',
  subject: 'Login broken',
  status: 'open',
};

const invoiceRecord = {
  id: 'i-1',
  invoiceNumber: 'INV-001',
  status: 'overdue',
};

const productRecord = {
  id: 'p-1',
  name: 'Widget Pro',
  sku: 'WGT-PRO-01',
};

function buildPrismaClient() {
  return {
    contact: {
      findMany: vi.fn().mockResolvedValue([contactRecord]),
    },
    deal: {
      findMany: vi.fn().mockResolvedValue([dealRecord]),
    },
    ticket: {
      findMany: vi.fn().mockResolvedValue([ticketRecord]),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([invoiceRecord]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([productRecord]),
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SearchService (Prisma)', () => {
  let service: SearchService;
  let mockDb: ReturnType<typeof buildPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = buildPrismaClient();
    mockGetPrismaClient.mockReturnValue(mockDb as never);
    service = new SearchService();
  });

  describe('search()', () => {
    it('returns correctly shaped SearchResults for all modules', async () => {
      const response = await service.search(TENANT_ID, 'test');

      expect(response.results).toHaveLength(5);

      const contactResult = response.results.find((r) => r.module === 'contacts');
      expect(contactResult).toMatchObject({
        module: 'contacts',
        entity: 'contact',
        id: 'c-1',
        title: 'Jane Doe',
        subtitle: 'Acme Corp',
        url: '/sales/contacts/c-1',
      });

      const dealResult = response.results.find((r) => r.module === 'deals');
      expect(dealResult).toMatchObject({
        module: 'deals',
        entity: 'deal',
        id: 'd-1',
        title: 'Big Deal',
        subtitle: 'Proposal',
        url: '/sales/deals/d-1',
      });

      const ticketResult = response.results.find((r) => r.module === 'tickets');
      expect(ticketResult).toMatchObject({
        module: 'tickets',
        entity: 'ticket',
        id: 't-1',
        title: 'Login broken',
        subtitle: 'open',
        url: '/support/tickets/t-1',
      });

      const invoiceResult = response.results.find((r) => r.module === 'invoices');
      expect(invoiceResult).toMatchObject({
        module: 'invoices',
        entity: 'invoice',
        id: 'i-1',
        title: 'INV-001',
        subtitle: 'overdue',
        url: '/accounting/invoices/i-1',
      });

      const productResult = response.results.find((r) => r.module === 'products');
      expect(productResult).toMatchObject({
        module: 'products',
        entity: 'product',
        id: 'p-1',
        title: 'Widget Pro',
        subtitle: 'WGT-PRO-01',
        url: '/inventory/products/p-1',
      });
    });

    it('returns empty results when no hits are found', async () => {
      mockDb.contact.findMany.mockResolvedValue([]);
      mockDb.deal.findMany.mockResolvedValue([]);
      mockDb.ticket.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([]);
      mockDb.product.findMany.mockResolvedValue([]);

      const response = await service.search(TENANT_ID, 'nonexistent');

      expect(response.results).toHaveLength(0);
      expect(response.totalHits).toBe(0);
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('filters to only the requested modules', async () => {
      await service.search(TENANT_ID, 'Jane', ['contacts'], 10);

      // Should only call findMany for the contacts model
      expect(mockDb.contact.findMany).toHaveBeenCalledTimes(1);
      expect(mockDb.deal.findMany).not.toHaveBeenCalled();
      expect(mockDb.ticket.findMany).not.toHaveBeenCalled();
      expect(mockDb.invoice.findMany).not.toHaveBeenCalled();
      expect(mockDb.product.findMany).not.toHaveBeenCalled();
    });

    it('uses case-insensitive search with contains', async () => {
      await service.search(TENANT_ID, 'test', ['contacts'], 10);

      expect(mockDb.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            OR: expect.arrayContaining([
              expect.objectContaining({
                firstName: { contains: 'test', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('handles Prisma errors gracefully and returns empty results for that module', async () => {
      mockDb.contact.findMany.mockRejectedValue(new Error('Database connection lost'));

      // Should not throw — error is caught per-module
      const response = await service.search(TENANT_ID, 'test');

      // contacts produced no results (error), other modules did
      const contactResults = response.results.filter((r) => r.module === 'contacts');
      expect(contactResults).toHaveLength(0);

      const dealResults = response.results.filter((r) => r.module === 'deals');
      expect(dealResults).toHaveLength(1);
    });

    it('trims results to the requested limit', async () => {
      // Each module returns 2 records
      mockDb.contact.findMany.mockResolvedValue([
        { id: 'c-1', firstName: 'A', lastName: 'B', company: null },
        { id: 'c-2', firstName: 'C', lastName: 'D', company: null },
      ]);
      mockDb.deal.findMany.mockResolvedValue([
        { id: 'd-1', name: 'Deal 1', stage: 'New' },
        { id: 'd-2', name: 'Deal 2', stage: 'New' },
      ]);

      const response = await service.search(TENANT_ID, 'test', ['contacts', 'deals'], 3);

      expect(response.results.length).toBeLessThanOrEqual(3);
    });

    it('returns processingTimeMs as a non-negative number', async () => {
      const response = await service.search(TENANT_ID, 'test');

      expect(typeof response.processingTimeMs).toBe('number');
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('uses id as fallback title when name fields are missing', async () => {
      mockDb.contact.findMany.mockResolvedValue([
        { id: 'c-no-name', firstName: null, lastName: null, company: null },
      ]);
      mockDb.deal.findMany.mockResolvedValue([]);
      mockDb.ticket.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([]);
      mockDb.product.findMany.mockResolvedValue([]);

      const response = await service.search(TENANT_ID, 'unknown', ['contacts']);

      const result = response.results[0];
      expect(result).toBeDefined();
      expect(result!.id).toBe('c-no-name');
      // title falls back to id when firstName/lastName are missing
      expect(result!.title).toBe('c-no-name');
    });

    it('scopes queries to the correct tenant', async () => {
      await service.search('my-tenant', 'query', ['deals']);

      expect(mockDb.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'my-tenant',
          }),
        }),
      );
    });
  });
});
