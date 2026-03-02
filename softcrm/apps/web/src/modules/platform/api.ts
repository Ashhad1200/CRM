import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Response shapes ───────── */

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  version: number;
  _count: { userRoles: number };
}

export interface RoleDetail extends Role {
  modulePermissions: { id: string; module: string; accessLevel: string }[];
  entityPermissions: {
    id: string;
    module: string;
    entity: string;
    scope: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }[];
  fieldPermissions: {
    id: string;
    module: string;
    entity: string;
    field: string;
    visible: boolean;
    editable: boolean;
  }[];
  userRoles: {
    id: string;
    user: { id: string; email: string; firstName: string; lastName: string };
  }[];
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  module: string;
  entity: string;
  recordId: string;
  action: string;
  changes: unknown;
  timestamp: string;
}

export interface FieldDef {
  id: string;
  module: string;
  entity: string;
  fieldName: string;
  fieldType: string;
  label: string;
  required: boolean;
  options: unknown;
  sortOrder: number;
}

/* ───────── Roles ───────── */

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () =>
      apiClient<{ data: Role[] }>('/api/v1/platform/roles').then((r) => r.data),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () =>
      apiClient<{ data: RoleDetail }>(`/api/v1/platform/roles/${id}`).then(
        (r) => r.data,
      ),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiClient<{ data: Role }>('/api/v1/platform/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<{ data: RoleDetail }>(`/api/v1/platform/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles', id] });
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<void>(`/api/v1/platform/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

/* ───────── Users (placeholder) ───────── */

// TODO: implement when user endpoints exist
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => [] as {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      lastLogin: string | null;
      status: string;
    }[],
  });
}

/* ───────── Custom field definitions ───────── */

export function useCustomFieldDefs(module: string, entity: string) {
  return useQuery({
    queryKey: ['custom-fields', module, entity],
    queryFn: () =>
      apiClient<{ data: FieldDef[] }>(
        `/api/v1/platform/custom-fields/defs?module=${encodeURIComponent(module)}&entity=${encodeURIComponent(entity)}`,
      ).then((r) => r.data),
    enabled: !!module && !!entity,
  });
}

export function useCreateFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Omit<FieldDef, 'id'> & { id?: string },
    ) =>
      apiClient<{ data: FieldDef }>('/api/v1/platform/custom-fields/defs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['custom-fields', variables.module, variables.entity],
      });
    },
  });
}

export function useDeleteFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; module: string; entity: string }) =>
      apiClient<void>(`/api/v1/platform/custom-fields/defs/${params.id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['custom-fields', variables.module, variables.entity],
      });
    },
  });
}

/* ───────── Audit log ───────── */

export interface AuditFilters {
  module?: string;
  entity?: string;
  page?: number;
  limit?: number;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.module) params.set('module', filters.module);
      if (filters.entity) params.set('entity', filters.entity);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return apiClient<{ data: AuditEntry[]; total: number }>(
        `/api/v1/platform/audit${qs ? `?${qs}` : ''}`,
      );
    },
  });
}

/* ───────── Global search ───────── */

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

export function useGlobalSearch(
  query: string,
  modules?: string[],
  limit?: number,
) {
  return useQuery({
    queryKey: ['platform', 'search', query, modules, limit] as const,
    queryFn: () =>
      apiClient<SearchResponse>(
        `/api/v1/platform/search?q=${encodeURIComponent(query)}&modules=${modules?.join(',') ?? ''}&limit=${limit ?? 10}`,
      ),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

/* ───────── Notifications ───────── */

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export function useNotifications(page?: number, limit?: number) {
  return useQuery({
    queryKey: ['platform', 'notifications', page, limit] as const,
    queryFn: () =>
      apiClient<{ notifications: Notification[]; total: number; unreadCount: number }>(
        `/api/v1/platform/notifications?page=${page ?? 1}&limit=${limit ?? 20}`,
      ),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['platform', 'notifications', 'unread-count'] as const,
    queryFn: () =>
      apiClient<{ count: number }>(
        '/api/v1/platform/notifications/unread-count',
      ),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient<void>('/api/v1/platform/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<void>('/api/v1/platform/notifications/mark-all-read', {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    },
  });
}
