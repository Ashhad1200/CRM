import { search } from '../../../infra/search.js';
import { logger } from '../../../logger.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SearchResult {
  module: string;
  entity: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalHits: number;
  processingTimeMs: number;
}

// Hit shapes returned from Meilisearch per index
interface ContactHit extends Record<string, unknown> {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

interface DealHit extends Record<string, unknown> {
  id: string;
  name?: string;
  stage?: string;
}

interface TicketHit extends Record<string, unknown> {
  id: string;
  subject?: string;
  status?: string;
}

interface InvoiceHit extends Record<string, unknown> {
  id: string;
  invoiceNumber?: string;
  status?: string;
}

interface ProductHit extends Record<string, unknown> {
  id: string;
  name?: string;
  sku?: string;
}

// Module → index suffix and mapper
type ModuleKey = 'contacts' | 'deals' | 'tickets' | 'invoices' | 'products';

const INDEX_SUFFIX: Record<ModuleKey, string> = {
  contacts: 'contacts',
  deals: 'deals',
  tickets: 'tickets',
  invoices: 'invoices',
  products: 'products',
};

function mapContact(hit: ContactHit, tenantId: string): SearchResult {
  const firstName = hit.firstName ?? '';
  const lastName = hit.lastName ?? '';
  return {
    module: 'contacts',
    entity: 'contact',
    id: hit.id,
    title: `${firstName} ${lastName}`.trim() || hit.id,
    subtitle: hit.company as string | undefined,
    url: `/sales/contacts/${hit.id}`,
    score: 1,
  };
}

function mapDeal(hit: DealHit): SearchResult {
  return {
    module: 'deals',
    entity: 'deal',
    id: hit.id,
    title: hit.name ?? hit.id,
    subtitle: hit.stage as string | undefined,
    url: `/sales/deals/${hit.id}`,
    score: 1,
  };
}

function mapTicket(hit: TicketHit): SearchResult {
  return {
    module: 'tickets',
    entity: 'ticket',
    id: hit.id,
    title: hit.subject ?? hit.id,
    subtitle: hit.status as string | undefined,
    url: `/support/tickets/${hit.id}`,
    score: 1,
  };
}

function mapInvoice(hit: InvoiceHit): SearchResult {
  return {
    module: 'invoices',
    entity: 'invoice',
    id: hit.id,
    title: hit.invoiceNumber ?? hit.id,
    subtitle: hit.status as string | undefined,
    url: `/accounting/invoices/${hit.id}`,
    score: 1,
  };
}

function mapProduct(hit: ProductHit): SearchResult {
  return {
    module: 'products',
    entity: 'product',
    id: hit.id,
    title: hit.name ?? hit.id,
    subtitle: hit.sku as string | undefined,
    url: `/inventory/products/${hit.id}`,
    score: 1,
  };
}

const DEFAULT_MODULES: ModuleKey[] = ['contacts', 'deals', 'tickets', 'invoices', 'products'];

// ── SearchService ──────────────────────────────────────────────────────────────

export class SearchService {
  async search(
    tenantId: string,
    query: string,
    modules?: string[],
    limit = 20,
  ): Promise<SearchResponse> {
    const startMs = Date.now();

    // Filter to only known searchable modules
    const requestedModules: ModuleKey[] = (
      modules && modules.length > 0
        ? modules.filter((m): m is ModuleKey => m in INDEX_SUFFIX)
        : DEFAULT_MODULES
    );

    // Distribute the limit across modules (ceiling division)
    const perIndex = Math.ceil(limit / requestedModules.length);

    const searchPromises = requestedModules.map(async (mod) => {
      const indexName = `${tenantId}_${INDEX_SUFFIX[mod]}`;
      try {
        switch (mod) {
          case 'contacts': {
            const { hits } = await search<ContactHit>(indexName, query, { limit: perIndex });
            return hits.map((h) => mapContact(h, tenantId));
          }
          case 'deals': {
            const { hits } = await search<DealHit>(indexName, query, { limit: perIndex });
            return hits.map(mapDeal);
          }
          case 'tickets': {
            const { hits } = await search<TicketHit>(indexName, query, { limit: perIndex });
            return hits.map(mapTicket);
          }
          case 'invoices': {
            const { hits } = await search<InvoiceHit>(indexName, query, { limit: perIndex });
            return hits.map(mapInvoice);
          }
          case 'products': {
            const { hits } = await search<ProductHit>(indexName, query, { limit: perIndex });
            return hits.map(mapProduct);
          }
          default:
            return [];
        }
      } catch (err) {
        logger.error({ err, indexName, query }, 'Meilisearch search failed for index');
        return [];
      }
    });

    const resultGroups = await Promise.all(searchPromises);
    const allResults = resultGroups.flat();

    // Trim to requested limit
    const results = allResults.slice(0, limit);
    const processingTimeMs = Date.now() - startMs;

    return {
      results,
      totalHits: allResults.length,
      processingTimeMs,
    };
  }
}
