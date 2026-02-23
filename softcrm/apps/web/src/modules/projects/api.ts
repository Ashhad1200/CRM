import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

// Types
export interface ProjectTemplate {
  id: string; tenantId: string; name: string;
  tasks: unknown; milestones: unknown; defaultAssignees: unknown;
  createdAt: string; updatedAt: string;
}

export interface Project {
  id: string; tenantId: string; name: string;
  dealId: string | null; accountId: string | null; templateId: string | null;
  status: string; startDate: string | null; endDate: string | null;
  createdAt: string; updatedAt: string;
  tasks?: Task[];
  milestones?: Milestone[];
}

export interface Task {
  id: string; projectId: string; title: string;
  description: string | null; assigneeId: string | null;
  priority: string; status: string; dueDate: string | null;
  order: number; createdAt: string; updatedAt: string;
  timeEntries?: TimeEntry[];
}

export interface Milestone {
  id: string; projectId: string; name: string;
  dueDate: string | null; completedAt: string | null;
  createdAt: string; updatedAt: string;
  milestoneTasks?: Array<{ id: string; milestoneId: string; taskId: string; task?: { id: string; title: string; status: string } }>;
}

export interface TimeEntry {
  id: string; taskId: string; userId: string;
  hours: number; isBillable: boolean; description: string | null;
  date: string; createdAt: string;
}

export interface ProjectProgress {
  totalTasks: number; completedTasks: number; percentComplete: number;
  milestoneStatus: Array<{ name: string; completed: boolean; dueDate: string | null }>;
}

interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; pageSize: number; totalPages: number;
}

// Query keys
const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (f: Record<string, unknown>) => [...projectKeys.lists(), f] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  tasks: (projectId: string) => [...projectKeys.all, projectId, 'tasks'] as const,
  milestones: (projectId: string) => [...projectKeys.all, projectId, 'milestones'] as const,
  timeEntries: (projectId: string) => [...projectKeys.all, projectId, 'time-entries'] as const,
  progress: (projectId: string) => [...projectKeys.all, projectId, 'progress'] as const,
  templates: () => [...projectKeys.all, 'templates'] as const,
};

// Query string helper
function qs(params: Record<string, unknown>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') s.append(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

// ── Templates ────────
export function useTemplates() {
  return useQuery({
    queryKey: projectKeys.templates(),
    queryFn: () => apiClient<{ data: ProjectTemplate[] }>('/api/v1/projects/templates'),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; tasks: unknown[]; milestones: unknown[] }) =>
      apiClient<{ data: ProjectTemplate }>('/api/v1/projects/templates', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.templates() }); },
  });
}

// ── Projects ────────
export function useProjects(params: Record<string, unknown>) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => apiClient<PaginatedResponse<Project>>(`/api/v1/projects${qs(params)}`),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiClient<{ data: Project }>(`/api/v1/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; dealId?: string; accountId?: string; startDate?: string; endDate?: string }) =>
      apiClient<{ data: Project }>('/api/v1/projects', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.lists() }); },
  });
}

export function useCreateProjectFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { templateId: string; name: string; dealId?: string; accountId?: string; startDate?: string; endDate?: string }) =>
      apiClient<{ data: Project }>('/api/v1/projects/from-template', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.lists() }); },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; status?: string; startDate?: string; endDate?: string }) =>
      apiClient<{ data: Project }>(`/api/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient<{ data: { success: boolean } }>(`/api/v1/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.lists() }); },
  });
}

// ── Tasks ────────
export function useTasks(projectId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: () => apiClient<{ data: Task[] }>(`/api/v1/projects/${projectId}/tasks${qs(params ?? {})}`),
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; assigneeId?: string; priority?: string; dueDate?: string; order?: number }) =>
      apiClient<{ data: Task }>(`/api/v1/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
    },
  });
}

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; status: string }) =>
      apiClient<{ data: Task }>(`/api/v1/projects/tasks/${data.taskId}/move`, { method: 'PATCH', body: JSON.stringify({ status: data.status }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.milestones(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; updates: Record<string, unknown> }) =>
      apiClient<{ data: Task }>(`/api/v1/projects/tasks/${data.taskId}`, { method: 'PATCH', body: JSON.stringify(data.updates), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) }); },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiClient<{ data: { success: boolean } }>(`/api/v1/projects/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
    },
  });
}

// ── Milestones ────────
export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: projectKeys.milestones(projectId),
    queryFn: () => apiClient<{ data: Milestone[] }>(`/api/v1/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });
}

// ── Time Entries ────────
export function useTimeEntries(projectId: string) {
  return useQuery({
    queryKey: projectKeys.timeEntries(projectId),
    queryFn: () => apiClient<{ data: TimeEntry[] }>(`/api/v1/projects/${projectId}/time-entries`),
    enabled: !!projectId,
  });
}

export function useLogTime(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; hours: number; isBillable?: boolean; description?: string; date: string }) =>
      apiClient<{ data: TimeEntry }>(`/api/v1/projects/${projectId}/time-entries`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: projectKeys.timeEntries(projectId) }); },
  });
}

// ── Progress ────────
export function useProjectProgress(projectId: string) {
  return useQuery({
    queryKey: projectKeys.progress(projectId),
    queryFn: () => apiClient<{ data: ProjectProgress }>(`/api/v1/projects/${projectId}/progress`),
    enabled: !!projectId,
  });
}
