import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

// Types
export interface Dashboard {
  id: string; tenantId: string; name: string; ownerId: string;
  isDefault: boolean; layout?: unknown; createdAt: string; updatedAt: string;
  widgets?: Widget[];
}

export interface Widget {
  id: string; dashboardId: string; type: string;
  config: unknown; position: unknown; createdAt: string; updatedAt: string;
}

export interface SavedReport {
  id: string; tenantId: string; name: string; ownerId: string;
  fieldSelection: string[]; groupBy?: string; aggregation?: string;
  filters?: unknown; scheduleFrequency?: string; scheduleRecipients?: string[];
  createdAt: string; updatedAt: string;
}

export interface ReportResult {
  columns: string[]; rows: unknown[]; totalRows: number;
}

export interface ForecastResult {
  id: string; type: string; period: string; predictedValue: number;
  confidenceLow: number; confidenceHigh: number; modelVersion: string; createdAt: string;
}

export interface AnomalyResult {
  metric: string; currentValue: number; rollingAvg: number;
  stdDeviation: number; deviationFactor: number; isAnomaly: boolean; detectedAt: string;
}

export interface PipelineMetrics {
  totalPipeline: number; weightedPipeline: number;
  dealsByStage: Record<string, number>; winRate: number;
  revenueMTD: number; revenueQTD: number; revenueYTD: number;
  avgDealSize: number; velocity: number;
}

export interface RepScorecard {
  userId: string; dealsClosed: number; revenue: number;
  activities: number; avgResponseTime: number; pipelineCoverage: number;
}

interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; pageSize: number; totalPages: number;
}

// Query keys
const analyticsKeys = {
  all: ['analytics'] as const,
  dashboards: () => [...analyticsKeys.all, 'dashboards'] as const,
  dashboardList: (f: Record<string, unknown>) => [...analyticsKeys.dashboards(), f] as const,
  dashboardDetail: (id: string) => [...analyticsKeys.dashboards(), id] as const,
  dashboardMetrics: (id: string) => [...analyticsKeys.dashboards(), id, 'metrics'] as const,
  reports: () => [...analyticsKeys.all, 'reports'] as const,
  reportList: (f: Record<string, unknown>) => [...analyticsKeys.reports(), f] as const,
  reportDetail: (id: string) => [...analyticsKeys.reports(), id] as const,
  forecast: (f: Record<string, unknown>) => [...analyticsKeys.all, 'forecast', f] as const,
  anomalies: (f: Record<string, unknown>) => [...analyticsKeys.all, 'anomalies', f] as const,
  pipelineMetrics: () => [...analyticsKeys.all, 'pipeline-metrics'] as const,
  scorecards: (userId: string) => [...analyticsKeys.all, 'scorecards', userId] as const,
};

// Build query string helper
function qs(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  return q.toString();
}

// --- Dashboard hooks ---
export function useDashboards(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: analyticsKeys.dashboardList(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<Dashboard>>(`/api/v1/analytics/dashboards?${qs(params ?? {})}`),
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: analyticsKeys.dashboardDetail(id),
    queryFn: () => apiClient<{ data: Dashboard }>(`/api/v1/analytics/dashboards/${id}`),
    enabled: !!id,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; isDefault?: boolean; layout?: unknown }) =>
      apiClient<{ data: Dashboard }>('/api/v1/analytics/dashboards', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.dashboards() }); },
  });
}

export function useUpdateDashboard(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<{ data: Dashboard }>(`/api/v1/analytics/dashboards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.dashboards() }); },
  });
}

export function useDeleteDashboard(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ success: boolean }>(`/api/v1/analytics/dashboards/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.dashboards() }); },
  });
}

export function useAddWidget(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; config?: unknown; position?: unknown }) =>
      apiClient<{ data: Widget }>(`/api/v1/analytics/dashboards/${dashboardId}/widgets`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.dashboardDetail(dashboardId) }); },
  });
}

export function useDashboardMetrics(id: string) {
  return useQuery({
    queryKey: analyticsKeys.dashboardMetrics(id),
    queryFn: () => apiClient<{ data: PipelineMetrics }>(`/api/v1/analytics/dashboards/${id}/metrics`),
    enabled: !!id,
  });
}

// --- Report hooks ---
export function useReports(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: analyticsKeys.reportList(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<SavedReport>>(`/api/v1/analytics/reports?${qs(params ?? {})}`),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: analyticsKeys.reportDetail(id),
    queryFn: () => apiClient<{ data: SavedReport }>(`/api/v1/analytics/reports/${id}`),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; fieldSelection: string[]; groupBy?: string; aggregation?: string; filters?: unknown; scheduleFrequency?: string; scheduleRecipients?: string[] }) =>
      apiClient<{ data: SavedReport }>('/api/v1/analytics/reports', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.reports() }); },
  });
}

export function useRunReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ data: ReportResult }>(`/api/v1/analytics/reports/${id}/run`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: analyticsKeys.reportDetail(id) }); },
  });
}

// --- Forecast & Anomaly hooks ---
export function useForecast(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: analyticsKeys.forecast(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<ForecastResult>>(`/api/v1/analytics/forecast?${qs(params ?? {})}`),
  });
}

export function useAnomalies(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: analyticsKeys.anomalies(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<AnomalyResult>>(`/api/v1/analytics/anomalies?${qs(params ?? {})}`),
  });
}

// --- Pipeline & Scorecard hooks ---
export function usePipelineMetrics() {
  return useQuery({
    queryKey: analyticsKeys.pipelineMetrics(),
    queryFn: () => apiClient<{ data: PipelineMetrics }>('/api/v1/analytics/pipeline-metrics'),
  });
}

export function useScorecard(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.scorecards(userId),
    queryFn: () => apiClient<{ data: RepScorecard }>(`/api/v1/analytics/scorecards/${userId}`),
    enabled: !!userId,
  });
}
