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
