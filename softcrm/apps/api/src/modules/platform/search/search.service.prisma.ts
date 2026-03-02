import { getPrismaClient } from '@softcrm/db';
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

// Module → entity/schema mapping
type ModuleKey = 'contacts' | 'deals' | 'tickets' | 'invoices' | 'products';

const MODULE_CONFIG: Record<ModuleKey, { schema: string; entity: string }> = {
  contacts: { schema: 'sales', entity: 'contact' },
  deals: { schema: 'sales', entity: 'deal' },
  tickets: { schema: 'support', entity: 'ticket' },
  invoices: { schema: 'accounting', entity: 'invoice' },
  products: { schema: 'inventory', entity: 'product' },
};

const DEFAULT_MODULES: ModuleKey[] = ['contacts', 'deals', 'tickets', 'invoices', 'products'];

// ── SearchService ──────────────────────────────────────────────────────────────

export class SearchService {
  private db = getPrismaClient();

  async search(
    tenantId: string,
    query: string,
    modules?: string[],
    limit = 20,
  ): Promise<SearchResponse> {
    const startMs = Date.now();

    // Filter to only known searchable modules
    const requestedModules: ModuleKey[] =
      modules && modules.length > 0
        ? (modules.filter((m): m is ModuleKey => m in MODULE_CONFIG))
        : DEFAULT_MODULES;

    // Distribute the limit across modules (ceiling division)
    const perModule = Math.ceil(limit / requestedModules.length);

    const searchPromises = requestedModules.map(async (mod) => {
      try {
        switch (mod) {
          case 'contacts':
            return await this.searchContacts(tenantId, query, perModule);
          case 'deals':
            return await this.searchDeals(tenantId, query, perModule);
          case 'tickets':
            return await this.searchTickets(tenantId, query, perModule);
          case 'invoices':
            return await this.searchInvoices(tenantId, query, perModule);
          case 'products':
            return await this.searchProducts(tenantId, query, perModule);
          default:
            return [];
        }
      } catch (err) {
        logger.error({ err, module: mod, query, tenantId }, 'Prisma search failed for module');
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

  private async searchContacts(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const contacts = await this.db.contact.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { emails: { has: query } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
      },
    });

    return contacts.map((c) => ({
      module: 'contacts',
      entity: 'contact',
      id: c.id,
      title: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id,
      subtitle: c.company ?? undefined,
      url: `/sales/contacts/${c.id}`,
      score: 1,
    }));
  }

  private async searchDeals(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const deals = await this.db.deal.findMany({
      where: {
        tenantId,
        name: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        stage: {
          select: {
            name: true,
          },
        },
      },
    });

    return deals.map((d) => ({
      module: 'deals',
      entity: 'deal',
      id: d.id,
      title: d.name ?? d.id,
      subtitle: d.stage?.name ?? undefined,
      url: `/sales/deals/${d.id}`,
      score: 1,
    }));
  }

  private async searchTickets(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    // Try to parse as number for ticketNumber search
    const ticketNum = parseInt(query, 10);
    const numericFilter = !isNaN(ticketNum) ? { ticketNumber: ticketNum } : null;

    const tickets = await this.db.ticket.findMany({
      where: {
        tenantId,
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          ...(numericFilter ? [numericFilter] : []),
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
      },
    });

    return tickets.map((t) => ({
      module: 'tickets',
      entity: 'ticket',
      id: t.id,
      title: t.subject ?? `Ticket #${t.ticketNumber}`,
      subtitle: t.status ?? undefined,
      url: `/support/tickets/${t.id}`,
      score: 1,
    }));
  }

  private async searchInvoices(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    // Try to parse as number for invoiceNumber search
    const invoiceNum = parseInt(query, 10);
    const numericFilter = !isNaN(invoiceNum) ? { invoiceNumber: invoiceNum } : null;

    const invoices = await this.db.invoice.findMany({
      where: {
        tenantId,
        OR: [
          ...(numericFilter ? [numericFilter] : []),
          { notes: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
      },
    });

    return invoices.map((i) => ({
      module: 'invoices',
      entity: 'invoice',
      id: i.id,
      title: `INV-${String(i.invoiceNumber).padStart(6, '0')}`,
      subtitle: i.status ?? undefined,
      url: `/accounting/invoices/${i.id}`,
      score: 1,
    }));
  }

  private async searchProducts(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const products = await this.db.product.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });

    return products.map((p) => ({
      module: 'products',
      entity: 'product',
      id: p.id,
      title: p.name ?? p.id,
      subtitle: p.sku ?? undefined,
      url: `/inventory/products/${p.id}`,
      score: 1,
    }));
  }
}
