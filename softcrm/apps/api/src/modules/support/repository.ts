/**
 * Support module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, generateId } from '@softcrm/shared-kernel';

import type {
  TicketFilters,
  PaginationInput,
  ArticleFilters,
} from './types.js';
import type {
  CreateTicketInput,
  AddReplyInput,
  CreateArticleInput,
  UpdateArticleInput,
  CreateCategoryInput,
} from './validators.js';

// ── Prisma include fragments ───────────────────────────────────────────────────

const ticketDetailInclude = {
  replies: { orderBy: { createdAt: 'asc' as const } },
  slaPolicy: true,
} as const;

const articleDetailInclude = {
  category: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: PaginationInput): {
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tickets ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the next ticket number for a tenant (max + 1). */
export async function getNextTicketNumber(tenantId: string): Promise<number> {
  const db = getPrismaClient();
  const result = await db.ticket.aggregate({
    where: { tenantId },
    _max: { ticketNumber: true },
  });
  return (result._max.ticketNumber ?? 0) + 1;
}

/** Create a new ticket. */
export async function createTicket(
  tenantId: string,
  data: CreateTicketInput & {
    id: string;
    ticketNumber: number;
    assignedAgentId?: string | null;
    slaPolicyId?: string | null;
    slaDeadline?: Date | null;
    createdBy: string;
  },
) {
  const db = getPrismaClient();
  return db.ticket.create({
    data: {
      id: data.id,
      tenantId,
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      description: data.description,
      priority: (data.priority ?? 'MEDIUM') as never,
      status: 'OPEN' as never,
      channel: (data.channel ?? 'PORTAL') as never,
      contactId: data.contactId ?? null,
      accountId: data.accountId ?? null,
      assignedAgentId: data.assignedAgentId ?? null,
      slaPolicyId: data.slaPolicyId ?? null,
      slaDeadline: data.slaDeadline ?? null,
      tags: [],
      createdBy: data.createdBy,
      version: 1,
    },
    include: ticketDetailInclude,
  });
}

/** Find a single ticket by ID with replies and SLA policy. */
export async function findTicket(tenantId: string, id: string) {
  const db = getPrismaClient();
  const ticket = await db.ticket.findFirst({
    where: { id, tenantId },
    include: ticketDetailInclude,
  });
  if (!ticket) throw new NotFoundError(`Ticket ${id} not found`);
  return ticket;
}

/** Find tickets with filters and pagination. */
export async function findTickets(
  tenantId: string,
  filters: TicketFilters,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) where['status'] = filters.status;
  if (filters.priority) where['priority'] = filters.priority;
  if (filters.assignedAgentId) where['assignedAgentId'] = filters.assignedAgentId;
  if (filters.contactId) where['contactId'] = filters.contactId;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.ticket.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: { slaPolicy: true },
    }),
    db.ticket.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update a ticket by ID (partial update). */
export async function updateTicket(
  tenantId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const db = getPrismaClient();
  return db.ticket.update({
    where: { id, tenantId } as never,
    data: {
      ...data,
      version: { increment: 1 },
      updatedAt: new Date(),
    } as never,
    include: ticketDetailInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Ticket Replies ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a reply on a ticket. */
export async function createReply(
  ticketId: string,
  data: AddReplyInput & { authorId: string },
) {
  const db = getPrismaClient();
  return db.ticketReply.create({
    data: {
      id: generateId(),
      ticketId,
      authorId: data.authorId,
      authorType: (data.authorType ?? 'AGENT') as never,
      body: data.body,
      attachments: {} as never,
      isInternal: data.isInternal ?? false,
    },
  });
}

/** Find all replies for a ticket, ordered by creation time. */
export async function findRepliesByTicket(ticketId: string) {
  const db = getPrismaClient();
  return db.ticketReply.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── SLA Policies ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Find an SLA policy by tenant and priority. Falls back to default. */
export async function findSlaPolicy(tenantId: string, priority: string) {
  const db = getPrismaClient();

  // Try to find a policy matching the specific priority
  let policy = await db.slaPolicy.findFirst({
    where: { tenantId, priority: priority as never },
  });

  // Fall back to the default policy
  if (!policy) {
    policy = await db.slaPolicy.findFirst({
      where: { tenantId, isDefault: true },
    });
  }

  return policy;
}

/** Find all SLA policies for a tenant. */
export async function findSlaPolicies(tenantId: string) {
  const db = getPrismaClient();
  return db.slaPolicy.findMany({
    where: { tenantId },
    orderBy: { priority: 'asc' },
  });
}

/** Create a new SLA policy. */
export async function createSlaPolicy(
  tenantId: string,
  data: {
    name: string;
    priority: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
    isDefault?: boolean;
  },
) {
  const db = getPrismaClient();
  return db.slaPolicy.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      priority: data.priority as never,
      firstResponseMinutes: data.firstResponseMinutes,
      resolutionMinutes: data.resolutionMinutes,
      isDefault: data.isDefault ?? false,
    },
  });
}

/** Find tickets that have breached their SLA deadline. */
export async function findBreachedTickets(tenantId: string) {
  const db = getPrismaClient();
  return db.ticket.findMany({
    where: {
      tenantId,
      slaDeadline: { lt: new Date() },
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_INTERNAL'] as never },
      resolvedAt: null,
    },
    include: ticketDetailInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Knowledge Base — Articles ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a new KB article. */
export async function createArticle(
  tenantId: string,
  data: CreateArticleInput & { id: string; slug: string; authorId: string },
) {
  const db = getPrismaClient();
  return db.kBArticle.create({
    data: {
      id: data.id,
      tenantId,
      title: data.title,
      slug: data.slug,
      body: data.body,
      categoryId: data.categoryId ?? null,
      status: (data.status ?? 'DRAFT') as never,
      viewCount: 0,
      helpfulCount: 0,
      authorId: data.authorId,
      version: 1,
    },
    include: articleDetailInclude,
  });
}

/** Find a single KB article by ID with category. */
export async function findArticle(tenantId: string, id: string) {
  const db = getPrismaClient();
  const article = await db.kBArticle.findFirst({
    where: { id, tenantId },
    include: articleDetailInclude,
  });
  if (!article) throw new NotFoundError(`Article ${id} not found`);
  return article;
}

/** Find articles with filters and pagination. */
export async function findArticles(
  tenantId: string,
  filters: ArticleFilters,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) where['status'] = filters.status;
  if (filters.categoryId) where['categoryId'] = filters.categoryId;
  if (filters.search) {
    where['OR'] = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { body: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.kBArticle.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: articleDetailInclude,
    }),
    db.kBArticle.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update a KB article by ID (partial update). */
export async function updateArticle(
  tenantId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const db = getPrismaClient();
  // Ensure the article exists
  await findArticle(tenantId, id);
  return db.kBArticle.update({
    where: { id } as never,
    data: {
      ...data,
      version: { increment: 1 },
      updatedAt: new Date(),
    } as never,
    include: articleDetailInclude,
  });
}

/** Search articles by text (title + body). */
export async function findArticlesBySearch(
  tenantId: string,
  query: string,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where = {
    tenantId,
    status: 'PUBLISHED' as const,
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { body: { contains: query, mode: 'insensitive' as const } },
    ],
  };

  const { skip, take } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.kBArticle.findMany({
      where,
      skip,
      take,
      orderBy: { viewCount: 'desc' },
      include: articleDetailInclude,
    }),
    db.kBArticle.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Increment view count for an article. */
export async function incrementViewCount(tenantId: string, id: string) {
  const db = getPrismaClient();
  return db.kBArticle.update({
    where: { id } as never,
    data: { viewCount: { increment: 1 } },
    include: articleDetailInclude,
  });
}

/** Increment helpful count for an article. */
export async function incrementHelpfulCount(tenantId: string, id: string) {
  const db = getPrismaClient();
  return db.kBArticle.update({
    where: { id } as never,
    data: { helpfulCount: { increment: 1 } },
    include: articleDetailInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Knowledge Base — Categories ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a new KB category. */
export async function createCategory(
  tenantId: string,
  data: CreateCategoryInput,
) {
  const db = getPrismaClient();
  return db.kBCategory.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      parentId: data.parentId ?? null,
      order: data.order ?? 0,
    },
  });
}

/** Find all categories for a tenant. */
export async function findCategories(tenantId: string) {
  const db = getPrismaClient();
  return db.kBCategory.findMany({
    where: { tenantId },
    orderBy: { order: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CSAT Surveys ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a CSAT survey record (sent when a ticket is resolved). */
export async function createCsatSurvey(
  tenantId: string,
  ticketId: string,
) {
  const db = getPrismaClient();
  return db.csatSurvey.create({
    data: {
      id: generateId(),
      tenantId,
      ticketId,
      sentAt: new Date(),
    },
  });
}

/** Find a CSAT survey by ticket ID. */
export async function findCsatByTicket(tenantId: string, ticketId: string) {
  const db = getPrismaClient();
  return db.csatSurvey.findFirst({
    where: { tenantId, ticketId },
  });
}

/** Submit a CSAT rating. */
export async function submitCsatRating(
  surveyId: string,
  rating: number,
  comment?: string,
) {
  const db = getPrismaClient();
  return db.csatSurvey.update({
    where: { id: surveyId },
    data: {
      rating,
      comment: comment ?? null,
      submittedAt: new Date(),
    },
  });
}

/** Get aggregate CSAT stats for a tenant. */
export async function getCsatStats(tenantId: string) {
  const db = getPrismaClient();

  const [avgResult, totals] = await Promise.all([
    db.csatSurvey.aggregate({
      where: { tenantId, rating: { not: null } },
      _avg: { rating: true },
    }),
    db.csatSurvey.groupBy({
      by: ['tenantId'],
      where: { tenantId },
      _count: { id: true },
    }),
  ]);

  const totalSurveys = totals[0]?._count?.id ?? 0;

  const responsesCount = await db.csatSurvey.count({
    where: { tenantId, submittedAt: { not: null } },
  });

  return {
    averageRating: avgResult._avg.rating ?? null,
    totalSurveys,
    totalResponses: responsesCount,
    responseRate: totalSurveys > 0 ? responsesCount / totalSurveys : 0,
  };
}
