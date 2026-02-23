import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

// Types
export interface Segment {
  id: string; tenantId: string; name: string; description?: string;
  criteria?: unknown; isDynamic: boolean; memberCount: number;
  createdBy: string; createdAt: string; updatedAt: string;
}

export interface Campaign {
  id: string; tenantId: string; name: string; type: string;
  segmentId?: string; subjectA: string; subjectB?: string;
  bodyHtml: string; scheduledAt?: string; sentAt?: string;
  status: string; createdBy: string; createdAt: string; updatedAt: string;
  segment?: Segment;
}

export interface CampaignMetrics {
  total: number; delivered: number; opened: number; clicked: number;
  bounced: number; unsubscribed: number; openRate: number;
  clickRate: number; bounceRate: number;
}

export interface AttributionResult {
  campaignId: string; campaignName: string; dealCount: number;
  firstTouchRevenue: number; lastTouchRevenue: number; linearRevenue: number;
}

export interface MarketingTouch {
  id: string; contactId: string; campaignId: string;
  dealId?: string; touchType: string; timestamp: string;
}

export interface Unsubscribe {
  id: string; contactId: string; source: string; timestamp: string;
}

interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; pageSize: number; totalPages: number;
}

// Query keys
const marketingKeys = {
  all: ['marketing'] as const,
  segments: () => [...marketingKeys.all, 'segments'] as const,
  segmentList: (f: Record<string, unknown>) => [...marketingKeys.segments(), f] as const,
  segmentDetail: (id: string) => [...marketingKeys.segments(), id] as const,
  campaigns: () => [...marketingKeys.all, 'campaigns'] as const,
  campaignList: (f: Record<string, unknown>) => [...marketingKeys.campaigns(), f] as const,
  campaignDetail: (id: string) => [...marketingKeys.campaigns(), id] as const,
  campaignMetrics: (id: string) => [...marketingKeys.campaigns(), id, 'metrics'] as const,
  attribution: (f: Record<string, unknown>) => [...marketingKeys.all, 'attribution', f] as const,
  unsubscribes: (f: Record<string, unknown>) => [...marketingKeys.all, 'unsubscribes', f] as const,
};

// Build query string helper
function qs(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  return q.toString();
}

// --- Segment hooks ---
export function useSegments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: marketingKeys.segmentList(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<Segment>>(`/api/v1/marketing/segments?${qs(params ?? {})}`),
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: marketingKeys.segmentDetail(id),
    queryFn: () => apiClient<{ data: Segment }>(`/api/v1/marketing/segments/${id}`),
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; criteria?: unknown; isDynamic?: boolean }) =>
      apiClient<{ data: Segment }>('/api/v1/marketing/segments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.segments() }); },
  });
}

export function useUpdateSegment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string; criteria?: unknown; isDynamic?: boolean }) =>
      apiClient<{ data: Segment }>(`/api/v1/marketing/segments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.segments() }); },
  });
}

// --- Campaign hooks ---
export function useCampaigns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: marketingKeys.campaignList(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<Campaign>>(`/api/v1/marketing/campaigns?${qs(params ?? {})}`),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: marketingKeys.campaignDetail(id),
    queryFn: () => apiClient<{ data: Campaign }>(`/api/v1/marketing/campaigns/${id}`),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type?: string; segmentId?: string; subjectA: string; subjectB?: string; bodyHtml: string; scheduledAt?: string }) =>
      apiClient<{ data: Campaign }>('/api/v1/marketing/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.campaigns() }); },
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<{ data: Campaign }>(`/api/v1/marketing/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.campaigns() }); },
  });
}

export function useScheduleCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sendAt: string }) =>
      apiClient<{ data: Campaign }>(`/api/v1/marketing/campaigns/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.campaigns() }); },
  });
}

export function useSendCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactIds: string[] }) =>
      apiClient<{ data: Campaign }>(`/api/v1/marketing/campaigns/${id}/send`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketingKeys.campaigns() }); },
  });
}

export function useCampaignMetrics(id: string) {
  return useQuery({
    queryKey: marketingKeys.campaignMetrics(id),
    queryFn: () => apiClient<{ data: CampaignMetrics }>(`/api/v1/marketing/campaigns/${id}/metrics`),
    enabled: !!id,
  });
}

// --- Webhook & Touch hooks ---
export function useProcessWebhook() {
  return useMutation({
    mutationFn: (data: { recipientId: string; event: string }) =>
      apiClient<{ data: { success: boolean } }>('/api/v1/marketing/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function useRecordTouch() {
  return useMutation({
    mutationFn: (data: { contactId: string; campaignId: string; touchType?: string; dealId?: string }) =>
      apiClient<{ data: MarketingTouch }>('/api/v1/marketing/touches', { method: 'POST', body: JSON.stringify(data) }),
  });
}

// --- Attribution ---
export function useAttribution(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: marketingKeys.attribution(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<AttributionResult>>(`/api/v1/marketing/attribution?${qs(params ?? {})}`),
  });
}

// --- Unsubscribes ---
export function useUnsubscribes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: marketingKeys.unsubscribes(params ?? {}),
    queryFn: () => apiClient<PaginatedResponse<Unsubscribe>>(`/api/v1/marketing/unsubscribes?${qs(params ?? {})}`),
  });
}
