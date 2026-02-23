import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault: boolean;
}

export interface Ticket {
  id: string;
  tenantId: string;
  ticketNumber: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  channel: string;
  contactId?: string;
  accountId?: string;
  assignedAgentId?: string;
  slaPolicyId?: string;
  slaDeadline?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  replies: TicketReply[];
  slaPolicy?: SlaPolicy;
}

export interface KBCategory {
  id: string;
  name: string;
  parentId?: string;
  order: number;
}

export interface KBArticle {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  body: string;
  categoryId?: string;
  status: string;
  viewCount: number;
  helpfulCount: number;
  authorId: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  category?: KBCategory;
}

export interface CsatSurvey {
  id: string;
  ticketId: string;
  rating?: number;
  comment?: string;
  sentAt: string;
  submittedAt?: string;
}

export interface CsatStats {
  averageRating: number | null;
  totalSurveys: number;
  totalResponses: number;
  responseRate: number;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const supportKeys = {
  tickets: ['support', 'tickets'] as const,
  ticket: (id: string) => ['support', 'tickets', id] as const,
  ticketReplies: (id: string) => ['support', 'tickets', id, 'replies'] as const,
  articles: ['support', 'kb', 'articles'] as const,
  article: (id: string) => ['support', 'kb', 'articles', id] as const,
  categories: ['support', 'kb', 'categories'] as const,
  csatStats: ['support', 'csat', 'stats'] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tickets
   ═══════════════════════════════════════════════════════════════════════════ */

export function useTickets(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...supportKeys.tickets, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Ticket>>(buildUrl('/api/v1/support/tickets', filters)),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: supportKeys.ticket(id),
    queryFn: () =>
      apiClient<Single<Ticket>>(`/api/v1/support/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Ticket>>('/api/v1/support/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
    },
  });
}

export function useAddReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: { ticketId: string } & Record<string, unknown>) =>
      apiClient<Single<TicketReply>>(`/api/v1/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.ticket(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: supportKeys.ticketReplies(vars.ticketId) });
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
    },
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Ticket>>(`/api/v1/support/tickets/${id}/resolve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
      void qc.invalidateQueries({ queryKey: supportKeys.ticket(vars.id) });
    },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Ticket>>(`/api/v1/support/tickets/${id}/close`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
      void qc.invalidateQueries({ queryKey: supportKeys.ticket(vars.id) });
    },
  });
}

export function useEscalateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Ticket>>(`/api/v1/support/tickets/${id}/escalate`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
      void qc.invalidateQueries({ queryKey: supportKeys.ticket(vars.id) });
    },
  });
}

export function useReopenTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Ticket>>(`/api/v1/support/tickets/${id}/reopen`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.tickets });
      void qc.invalidateQueries({ queryKey: supportKeys.ticket(vars.id) });
    },
  });
}

export function useTicketReplies(ticketId: string) {
  return useQuery({
    queryKey: supportKeys.ticketReplies(ticketId),
    queryFn: () =>
      apiClient<{ data: TicketReply[] }>(`/api/v1/support/tickets/${ticketId}/replies`),
    enabled: !!ticketId,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Knowledge Base — Articles
   ═══════════════════════════════════════════════════════════════════════════ */

export function useArticles(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...supportKeys.articles, filters] as const,
    queryFn: () =>
      apiClient<Paginated<KBArticle>>(buildUrl('/api/v1/support/kb/articles', filters)),
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: supportKeys.article(id),
    queryFn: () =>
      apiClient<Single<KBArticle>>(`/api/v1/support/kb/articles/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<KBArticle>>('/api/v1/support/kb/articles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.articles });
    },
  });
}

export function usePublishArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<KBArticle>>(`/api/v1/support/kb/articles/${id}/publish`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.articles });
      void qc.invalidateQueries({ queryKey: supportKeys.article(vars.id) });
    },
  });
}

export function useArchiveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<KBArticle>>(`/api/v1/support/kb/articles/${id}/archive`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.articles });
      void qc.invalidateQueries({ queryKey: supportKeys.article(vars.id) });
    },
  });
}

export function useMarkArticleHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<KBArticle>>(`/api/v1/support/kb/articles/${id}/helpful`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: supportKeys.article(vars.id) });
      void qc.invalidateQueries({ queryKey: supportKeys.articles });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Knowledge Base — Categories
   ═══════════════════════════════════════════════════════════════════════════ */

export function useCategories() {
  return useQuery({
    queryKey: supportKeys.categories,
    queryFn: () =>
      apiClient<{ data: KBCategory[] }>('/api/v1/support/kb/categories'),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<KBCategory>>('/api/v1/support/kb/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.categories });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSAT
   ═══════════════════════════════════════════════════════════════════════════ */

export function useCsatStats() {
  return useQuery({
    queryKey: supportKeys.csatStats,
    queryFn: () =>
      apiClient<{ data: CsatStats }>('/api/v1/support/csat/stats'),
  });
}
