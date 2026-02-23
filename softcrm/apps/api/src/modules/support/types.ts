/**
 * Support module — TypeScript type definitions.
 *
 * Hydrated entity types for tickets, KB articles, and CSAT surveys.
 * These types mirror Prisma models with eagerly-loaded relations.
 */

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** Ticket with replies and optional SLA policy eagerly loaded. */
export interface TicketWithReplies {
  id: string;
  tenantId: string;
  ticketNumber: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  channel: string;
  contactId: string | null;
  accountId: string | null;
  assignedAgentId: string | null;
  slaPolicyId: string | null;
  slaDeadline: Date | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  replies: TicketReplyItem[];
  slaPolicy: SlaPolicyItem | null;
}

/** Single reply on a ticket. */
export interface TicketReplyItem {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: string;
  body: string;
  attachments: unknown;
  isInternal: boolean;
  createdAt: Date;
}

/** SLA policy summary. */
export interface SlaPolicyItem {
  id: string;
  tenantId: string;
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** KB article with its category eagerly loaded. */
export interface KBArticleWithCategory {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  body: string;
  categoryId: string | null;
  status: string;
  viewCount: number;
  helpfulCount: number;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  category: KBCategoryItem | null;
}

/** KB category summary. */
export interface KBCategoryItem {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/** CSAT survey result. */
export interface CsatSurveyResult {
  id: string;
  tenantId: string;
  ticketId: string;
  rating: number | null;
  comment: string | null;
  sentAt: Date;
  submittedAt: Date | null;
}

/** CSAT aggregate stats for a tenant. */
export interface CsatStats {
  averageRating: number | null;
  totalSurveys: number;
  totalResponses: number;
  responseRate: number;
}

// ── Filter & pagination types ──────────────────────────────────────────────────

/** Filter parameters for ticket listing. */
export interface TicketFilters {
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  contactId?: string;
}

/** Standard pagination parameters. */
export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Filter parameters for KB article listing. */
export interface ArticleFilters {
  status?: string;
  categoryId?: string;
  search?: string;
}
