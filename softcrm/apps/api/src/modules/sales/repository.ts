/**
 * Sales module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 *
 * `tenantContext` is imported for RLS middleware integration; all repository
 * functions still receive `tenantId` explicitly for clarity and testability.
 */

import { getPrismaClient } from '@softcrm/db';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by RLS middleware; kept for explicit dependency
import { tenantContext } from '@softcrm/db';
import { NotFoundError, ConflictError } from '@softcrm/shared-kernel';

import type {
  DecimalValue,
  ContactFilters,
  LeadFilters,
  DealFilters,
  PipelineWithStages,
  DealWithRelations,
  QuoteWithLines,
} from './types.js';
import type {
  CreateContactInput,
  UpdateContactInput,
  CreateAccountInput,
  UpdateAccountInput,
  CreateLeadInput,
  CreateDealInput,
  UpdateDealInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Ownership-based filter applied by the RBAC middleware. */
export interface OwnershipScope {
  scope: 'OWN' | 'TEAM' | 'ALL';
  userId: string;
}

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Filter parameters for account listing. */
export interface AccountFilters {
  search?: string;
  ownerId?: string;
  industry?: string;
}

/**
 * Data passed from the service layer to create a quote.
 * Calculated totals are pre-computed in the service.
 */
export interface CreateQuoteData {
  dealId: string;
  title?: string;
  lines: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    lineTotal: number;
  }>;
  currency: string;
  validUntil?: Date | string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  quoteNumber: number;
}

// ── Prisma include fragments ───────────────────────────────────────────────────

const contactDetailInclude = {
  account: true,
  deals: {
    include: {
      deal: true,
    },
  },
} as const;

const accountDetailInclude = {
  contacts: true,
  deals: true,
  childAccounts: true,
  parentAccount: true,
} as const;

const pipelineWithStagesInclude = {
  stages: { orderBy: { order: 'asc' as const } },
} as const;

const dealListInclude = {
  stage: true,
  pipeline: true,
  account: true,
  contacts: { include: { contact: true } },
} as const;

const dealDetailInclude = {
  stage: true,
  pipeline: true,
  account: true,
  contacts: { include: { contact: true } },
  quotes: { include: { lines: true } },
} as const;

const quoteWithLinesInclude = {
  lines: true,
} as const;

const quoteDetailInclude = {
  lines: true,
  deal: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (pagination.page - 1) * pagination.limit;
  const orderBy = pagination.sortBy
    ? { [pagination.sortBy]: pagination.sortDir ?? 'asc' }
    : undefined;
  return { skip, take: pagination.limit, ...(orderBy ? { orderBy } : {}) };
}

function applyOwnershipScope(
  where: Record<string, unknown>,
  ownershipScope?: OwnershipScope,
): Record<string, unknown> {
  if (!ownershipScope || ownershipScope.scope === 'ALL') {
    return where;
  }
  // For both OWN and TEAM, filter by ownerId for now.
  // TODO: TEAM scope should resolve user's teamIds and filter by teamId.
  return { ...where, ownerId: ownershipScope.userId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Contacts ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findContacts(
  tenantId: string,
  filters: ContactFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['OR'] = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
      { emails: { has: filters.search } },
    ];
  }
  if (filters.lifecycleStage) {
    where['lifecycleStage'] = filters.lifecycleStage;
  }
  if (filters.ownerId) {
    where['ownerId'] = filters.ownerId;
  }
  if (filters.accountId) {
    where['accountId'] = filters.accountId;
  }

  const scoped = applyOwnershipScope(where, ownershipScope);
  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.contact.findMany({ where: scoped, skip, take, orderBy }),
    db.contact.count({ where: scoped }),
  ]);

  return { data, total };
}

export async function findContact(tenantId: string, id: string) {
  const db = getPrismaClient();

  const contact = await db.contact.findFirst({
    where: { id, tenantId },
    include: contactDetailInclude,
  });

  if (!contact) {
    throw new NotFoundError('Contact', id);
  }
  return contact;
}

export async function createContact(
  tenantId: string,
  data: CreateContactInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.contact.create({
    data: {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      emails: data.emails ?? [],
      phones: data.phones ?? [],
      company: data.company,
      jobTitle: data.jobTitle,
      accountId: data.accountId,
      lifecycleStage: data.lifecycleStage as never,
      tags: data.tags ?? [],
      ownerId: data.ownerId,
      teamId: data.teamId,
      source: data.source,
      address: (data.address ?? undefined) as never,
      socialProfiles: (data.socialProfiles ?? undefined) as never,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

export async function updateContact(
  tenantId: string,
  id: string,
  data: UpdateContactInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const { version, lifecycleStage, address, socialProfiles, ...rest } = data;

  const updates: Record<string, unknown> = { ...rest };
  if (lifecycleStage !== undefined) {
    updates['lifecycleStage'] = lifecycleStage as never;
  }
  if (address !== undefined) {
    updates['address'] = address;
  }
  if (socialProfiles !== undefined) {
    updates['socialProfiles'] = socialProfiles;
  }

  const result = await db.contact.updateMany({
    where: { id, tenantId, version },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedBy: actorId,
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('Contact was modified by another user');
  }

  return db.contact.findFirstOrThrow({ where: { id, tenantId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Accounts ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAccounts(
  tenantId: string,
  filters: AccountFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { industry: { contains: filters.search, mode: 'insensitive' } },
      { website: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.ownerId) {
    where['ownerId'] = filters.ownerId;
  }
  if (filters.industry) {
    where['industry'] = filters.industry;
  }

  const scoped = applyOwnershipScope(where, ownershipScope);
  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.account.findMany({ where: scoped, skip, take, orderBy }),
    db.account.count({ where: scoped }),
  ]);

  return { data, total };
}

export async function findAccount(tenantId: string, id: string) {
  const db = getPrismaClient();

  const account = await db.account.findFirst({
    where: { id, tenantId },
    include: accountDetailInclude,
  });

  if (!account) {
    throw new NotFoundError('Account', id);
  }
  return account;
}

export async function createAccount(
  tenantId: string,
  data: CreateAccountInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.account.create({
    data: {
      tenantId,
      name: data.name,
      industry: data.industry,
      size: data.size,
      website: data.website,
      phone: data.phone,
      billingAddress: (data.billingAddress ?? undefined) as never,
      shippingAddress: (data.shippingAddress ?? undefined) as never,
      parentAccountId: data.parentAccountId,
      ownerId: data.ownerId,
      teamId: data.teamId,
      annualRevenue: data.annualRevenue,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

export async function updateAccount(
  tenantId: string,
  id: string,
  data: UpdateAccountInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const { version, billingAddress, shippingAddress, ...rest } = data;

  const updates: Record<string, unknown> = { ...rest };
  if (billingAddress !== undefined) {
    updates['billingAddress'] = billingAddress;
  }
  if (shippingAddress !== undefined) {
    updates['shippingAddress'] = shippingAddress;
  }

  const result = await db.account.updateMany({
    where: { id, tenantId, version },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedBy: actorId,
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('Account was modified by another user');
  }

  return db.account.findFirstOrThrow({ where: { id, tenantId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Leads ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findLeads(
  tenantId: string,
  filters: LeadFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['OR'] = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) {
    where['status'] = filters.status;
  }
  if (filters.source) {
    where['source'] = filters.source;
  }
  if (filters.assignedOwnerId) {
    where['assignedOwnerId'] = filters.assignedOwnerId;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.lead.findMany({ where, skip, take, orderBy }),
    db.lead.count({ where }),
  ]);

  return { data, total };
}

export async function findLead(tenantId: string, id: string) {
  const db = getPrismaClient();
  return db.lead.findFirst({ where: { id, tenantId } });
}

export async function createLead(
  tenantId: string,
  data: CreateLeadInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.lead.create({
    data: {
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      source: data.source as never,
      notes: data.notes,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

export async function updateLead(
  tenantId: string,
  id: string,
  data: Partial<Omit<CreateLeadInput, 'source'>> & {
    version: number;
    status?: string;
    score?: number;
  },
  actorId: string,
) {
  const db = getPrismaClient();
  const { version, status, ...rest } = data;

  const updates: Record<string, unknown> = { ...rest };
  if (status !== undefined) {
    updates['status'] = status as never;
  }

  const result = await db.lead.updateMany({
    where: { id, tenantId, version },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedBy: actorId,
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('Lead was modified by another user');
  }

  return db.lead.findFirstOrThrow({ where: { id, tenantId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Pipelines ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findPipelines(
  tenantId: string,
): Promise<PipelineWithStages[]> {
  const db = getPrismaClient();

  return db.pipeline.findMany({
    where: { tenantId },
    include: pipelineWithStagesInclude,
  }) as unknown as Promise<PipelineWithStages[]>;
}

export async function findPipeline(
  tenantId: string,
  id: string,
): Promise<PipelineWithStages> {
  const db = getPrismaClient();

  const pipeline = await db.pipeline.findFirst({
    where: { id, tenantId },
    include: pipelineWithStagesInclude,
  });

  if (!pipeline) {
    throw new NotFoundError('Pipeline', id);
  }
  return pipeline as unknown as PipelineWithStages;
}

export async function getDefaultPipeline(
  tenantId: string,
): Promise<PipelineWithStages> {
  const db = getPrismaClient();

  const pipeline = await db.pipeline.findFirst({
    where: { tenantId, isDefault: true },
    include: pipelineWithStagesInclude,
  });

  if (!pipeline) {
    throw new NotFoundError('Pipeline', undefined);
  }
  return pipeline as unknown as PipelineWithStages;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Deals ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findDeals(
  tenantId: string,
  filters: DealFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.pipelineId) {
    where['pipelineId'] = filters.pipelineId;
  }
  if (filters.stageId) {
    where['stageId'] = filters.stageId;
  }
  if (filters.ownerId) {
    where['ownerId'] = filters.ownerId;
  }
  if (filters.accountId) {
    where['accountId'] = filters.accountId;
  }

  const scoped = applyOwnershipScope(where, ownershipScope);
  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.deal.findMany({ where: scoped, include: dealListInclude, skip, take, orderBy }),
    db.deal.count({ where: scoped }),
  ]);

  return { data: data as unknown as DealWithRelations[], total };
}

export async function findDeal(
  tenantId: string,
  id: string,
): Promise<DealWithRelations> {
  const db = getPrismaClient();

  const deal = await db.deal.findFirst({
    where: { id, tenantId },
    include: dealDetailInclude,
  });

  if (!deal) {
    throw new NotFoundError('Deal', id);
  }
  return deal as unknown as DealWithRelations;
}

export async function createDeal(
  tenantId: string,
  data: CreateDealInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const { contactIds, expectedCloseDate, currency, ...rest } = data;

  return db.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        tenantId,
        name: rest.name,
        pipelineId: rest.pipelineId,
        stageId: rest.stageId,
        value: rest.value,
        currency: currency as never,
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate)
          : undefined,
        ownerId: rest.ownerId,
        accountId: rest.accountId,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    if (contactIds && contactIds.length > 0) {
      await tx.dealContact.createMany({
        data: contactIds.map((contactId, index) => ({
          dealId: deal.id,
          contactId,
          isPrimary: index === 0,
        })),
      });
    }

    return deal;
  });
}

export async function updateDeal(
  tenantId: string,
  id: string,
  data: UpdateDealInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const { version, expectedCloseDate, currency, ...rest } = data;

  const updates: Record<string, unknown> = { ...rest };
  if (expectedCloseDate !== undefined) {
    updates['expectedCloseDate'] = new Date(expectedCloseDate);
  }
  if (currency !== undefined) {
    updates['currency'] = currency as never;
  }

  const result = await db.deal.updateMany({
    where: { id, tenantId, version },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedBy: actorId,
    } as never,
  });

  if (result.count === 0) {
    throw new ConflictError('Deal was modified by another user');
  }

  return db.deal.findFirstOrThrow({ where: { id, tenantId } });
}

export async function updateDealStage(
  tenantId: string,
  id: string,
  stageId: string,
  probability: number,
  weightedValue: DecimalValue,
  actorId: string,
) {
  const db = getPrismaClient();

  const result = await db.deal.updateMany({
    where: { id, tenantId },
    data: {
      stageId,
      probability,
      weightedValue: weightedValue as never,
      version: { increment: 1 },
      updatedBy: actorId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundError('Deal', id);
  }

  return db.deal.findFirstOrThrow({ where: { id, tenantId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Quotes ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findQuotes(
  tenantId: string,
  dealId: string,
): Promise<QuoteWithLines[]> {
  const db = getPrismaClient();

  return db.quote.findMany({
    where: { tenantId, dealId },
    include: quoteWithLinesInclude,
    orderBy: { quoteNumber: 'desc' },
  }) as unknown as Promise<QuoteWithLines[]>;
}

export async function findQuote(tenantId: string, id: string) {
  const db = getPrismaClient();

  const quote = await db.quote.findFirst({
    where: { id, tenantId },
    include: quoteDetailInclude,
  });

  if (!quote) {
    throw new NotFoundError('Quote', id);
  }
  return quote;
}

export async function createQuote(
  tenantId: string,
  data: CreateQuoteData,
  actorId: string,
) {
  const db = getPrismaClient();
  const { lines, validUntil, currency, ...quoteFields } = data;

  return db.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        tenantId,
        dealId: quoteFields.dealId,
        quoteNumber: quoteFields.quoteNumber,
        title: quoteFields.title,
        subtotal: quoteFields.subtotal,
        taxAmount: quoteFields.taxAmount,
        discountAmount: quoteFields.discountAmount,
        total: quoteFields.total,
        currency: currency as never,
        notes: quoteFields.notes,
        validUntil: validUntil ? new Date(validUntil as string) : undefined,
        createdBy: actorId,
        updatedBy: actorId,
        lines: {
          create: lines,
        },
      },
      include: quoteWithLinesInclude,
    });

    return quote;
  });
}

export async function updateQuoteStatus(
  tenantId: string,
  id: string,
  status: string,
  approvalStatus?: string,
) {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = {
    status: status as never,
  };
  if (approvalStatus !== undefined) {
    updateData['approvalStatus'] = approvalStatus as never;
  }

  // Set timestamp fields based on new status
  const now = new Date();
  if (status === 'SENT') {
    updateData['sentAt'] = now;
  } else if (status === 'ACCEPTED') {
    updateData['acceptedAt'] = now;
  } else if (status === 'REJECTED') {
    updateData['rejectedAt'] = now;
  }

  const quote = await db.quote.findFirst({ where: { id, tenantId } });
  if (!quote) {
    throw new NotFoundError('Quote', id);
  }

  return db.quote.update({
    where: { id },
    data: updateData,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the next sequential quote number for the given tenant.
 * Uses an aggregate MAX query to determine the current highest number.
 */
export async function getNextQuoteNumber(tenantId: string): Promise<number> {
  const db = getPrismaClient();

  const result = await db.quote.aggregate({
    where: { tenantId },
    _max: { quoteNumber: true },
  });

  return (result._max.quoteNumber ?? 0) + 1;
}
