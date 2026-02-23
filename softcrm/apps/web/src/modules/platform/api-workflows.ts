import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface WorkflowTrigger {
  type: 'event' | 'cron';
  event?: string;
  cron?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  status: string;
  loopLimit: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
  executions?: WorkflowExecution[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggerEvent: string;
  triggerPayload: unknown;
  status: string;
  actionResults: unknown[];
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ───────── Queries ───────── */

export function useWorkflows(params?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();

  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () =>
      apiClient<PaginatedResponse<Workflow>>(
        `/api/v1/platform/workflows${query ? `?${query}` : ''}`,
      ),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () =>
      apiClient<{ data: Workflow }>(`/api/v1/platform/workflows/${id}`).then(
        (r) => r.data,
      ),
    enabled: !!id && id !== 'new',
  });
}

export function useWorkflowExecutions(
  id: string,
  params?: { page?: number },
) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  const query = qs.toString();

  return useQuery({
    queryKey: ['workflows', id, 'executions', params],
    queryFn: () =>
      apiClient<PaginatedResponse<WorkflowExecution>>(
        `/api/v1/platform/workflows/${id}/executions${query ? `?${query}` : ''}`,
      ),
    enabled: !!id && id !== 'new',
  });
}

/* ───────── Mutations ───────── */

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Omit<
        Workflow,
        'id' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt' | '_count' | 'executions'
      >,
    ) =>
      apiClient<{ data: Workflow }>('/api/v1/platform/workflows', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<{ data: Workflow }>(`/api/v1/platform/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows', id] });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/platform/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Workflow }>(
        `/api/v1/platform/workflows/${id}/activate`,
        { method: 'POST' },
      ),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['workflows', id] });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeactivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Workflow }>(
        `/api/v1/platform/workflows/${id}/deactivate`,
        { method: 'POST' },
      ),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['workflows', id] });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
