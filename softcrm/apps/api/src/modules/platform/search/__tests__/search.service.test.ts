import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../search.service.js';

// ── Mock the infra/search module ───────────────────────────────────────────────

vi.mock('../../../../infra/search.js', () => ({
  search: vi.fn(),
}));

vi.mock('../../../../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { search as mockSearch } from '../../../../infra/search.js';

const mockSearchFn = vi.mocked(mockSearch);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-123';

const contactHit = {
  id: 'c-1',
  firstName: 'Jane',
  lastName: 'Doe',
  company: 'Acme Corp',
};

const dealHit = {
  id: 'd-1',
  name: 'Big Deal',
  stage: 'Proposal',
};

const ticketHit = {
  id: 't-1',
  subject: 'Login broken',
  status: 'open',
};

const invoiceHit = {
  id: 'i-1',
  invoiceNumber: 'INV-001',
  status: 'overdue',
};

const productHit = {
  id: 'p-1',
  name: 'Widget Pro',
  sku: 'WGT-PRO-01',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
    vi.clearAllMocks();
  });

  describe('search()', () => {
    it('returns correctly shaped SearchResults for all modules', async () => {
      // Return hits only for the index that matches
      mockSearchFn.mockImplementation(async (indexName: string) => {
        if (indexName.endsWith('_contacts')) {
          return { hits: [contactHit], estimatedTotalHits: 1 };
        }
        if (indexName.endsWith('_deals')) {
          return { hits: [dealHit], estimatedTotalHits: 1 };
        }
        if (indexName.endsWith('_tickets')) {
          return { hits: [ticketHit], estimatedTotalHits: 1 };
        }
        if (indexName.endsWith('_invoices')) {
          return { hits: [invoiceHit], estimatedTotalHits: 1 };
        }
        if (indexName.endsWith('_products')) {
          return { hits: [productHit], estimatedTotalHits: 1 };
        }
        return { hits: [], estimatedTotalHits: 0 };
      });

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
      mockSearchFn.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      const response = await service.search(TENANT_ID, 'nonexistent');

      expect(response.results).toHaveLength(0);
      expect(response.totalHits).toBe(0);
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('filters to only the requested modules', async () => {
      mockSearchFn.mockResolvedValue({ hits: [contactHit], estimatedTotalHits: 1 });

      await service.search(TENANT_ID, 'Jane', ['contacts'], 10);

      // Should only call search for the contacts index
      expect(mockSearchFn).toHaveBeenCalledTimes(1);
      expect(mockSearchFn).toHaveBeenCalledWith(
        `${TENANT_ID}_contacts`,
        'Jane',
        expect.objectContaining({ limit: 10 }),
      );
    });

    it('uses tenant-prefixed index names', async () => {
      mockSearchFn.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await service.search('my-tenant', 'query', ['deals']);

      expect(mockSearchFn).toHaveBeenCalledWith(
        'my-tenant_deals',
        'query',
        expect.any(Object),
      );
    });

    it('handles Meilisearch errors gracefully and returns empty results for that module', async () => {
      mockSearchFn.mockImplementation(async (indexName: string) => {
        if (indexName.endsWith('_contacts')) {
          throw new Error('Meilisearch connection refused');
        }
        return { hits: [dealHit], estimatedTotalHits: 1 };
      });

      // Should not throw — error is caught per-module
      const response = await service.search(TENANT_ID, 'test');

      // contacts produced no results (error), other modules did
      const contactResults = response.results.filter((r) => r.module === 'contacts');
      expect(contactResults).toHaveLength(0);

      const dealResults = response.results.filter((r) => r.module === 'deals');
      expect(dealResults).toHaveLength(1);
    });

    it('trims results to the requested limit', async () => {
      // Each module returns 2 hits, limit=3 across 2 modules
      const hits = [
        { id: '1', name: 'Deal 1', stage: 'New' },
        { id: '2', name: 'Deal 2', stage: 'New' },
      ];
      mockSearchFn.mockResolvedValue({ hits, estimatedTotalHits: 2 });

      const response = await service.search(TENANT_ID, 'deal', ['deals', 'products'], 3);

      expect(response.results.length).toBeLessThanOrEqual(3);
    });

    it('returns processingTimeMs as a non-negative number', async () => {
      mockSearchFn.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      const response = await service.search(TENANT_ID, 'test');

      expect(typeof response.processingTimeMs).toBe('number');
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('uses id as fallback title when name fields are missing', async () => {
      mockSearchFn.mockImplementation(async (indexName: string) => {
        if (indexName.endsWith('_contacts')) {
          return { hits: [{ id: 'c-no-name' }], estimatedTotalHits: 1 };
        }
        return { hits: [], estimatedTotalHits: 0 };
      });

      const response = await service.search(TENANT_ID, 'unknown', ['contacts']);

      const result = response.results[0];
      expect(result).toBeDefined();
      expect(result!.id).toBe('c-no-name');
      // title falls back to id when firstName/lastName are missing
      expect(result!.title).toBe('c-no-name');
    });
  });
});
