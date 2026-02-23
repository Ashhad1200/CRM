import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface CallLog {
  id: string;
  activityId: string;
  provider: string;
  callSid: string | null;
  fromNumber: string;
  toNumber: string;
  duration: number;
  recordingUrl: string | null;
  status: string;
}

export interface Activity {
  id: string;
  tenantId: string;
  type: 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE' | 'SMS';
  direction: 'INBOUND' | 'OUTBOUND';
  contactId: string | null;
  dealId: string | null;
  ticketId: string | null;
  accountId: string | null;
  subject: string | null;
  body: string | null;
  metadata: unknown;
  timestamp: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  callLog?: CallLog | null;
}

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  mergeFields: string[];
  isActive: boolean;
  createdBy: string;
  version: number;
}

export interface EmailSyncConfig {
  id: string;
  tenantId: string;
  userId: string;
  provider: 'GMAIL' | 'OUTLOOK';
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISCONNECTED';
  lastSyncAt: string | null;
}

/* ───────── Response envelopes ───────── */

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const commsKeys = {
  all: ['comms'] as const,
  activities: (params?: Record<string, unknown>) =>
    [...commsKeys.all, 'activities', params] as const,
  activity: (id: string) => [...commsKeys.all, 'activity', id] as const,
  timeline: (params: Record<string, unknown>) =>
    [...commsKeys.all, 'timeline', params] as const,
  templates: (params?: Record<string, unknown>) =>
    [...commsKeys.all, 'templates', params] as const,
  template: (id: string) => [...commsKeys.all, 'template', id] as const,
  emailSyncs: () => [...commsKeys.all, 'email-syncs'] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(
  base: string,
  params?: Record<string, unknown>,
): string {
  if (!params || Object.keys(params).length === 0) return base;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Activities
   ═══════════════════════════════════════════════════════════════════════════ */

export function useActivities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: commsKeys.activities(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Activity>>(
        buildUrl('/api/v1/comms/activities', params),
      ),
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: commsKeys.activity(id),
    queryFn: () =>
      apiClient<Single<Activity>>(`/api/v1/comms/activities/${id}`).then(
        (r) => r.data,
      ),
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Omit<Activity, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'callLog'>,
    ) =>
      apiClient<Single<Activity>>('/api/v1/comms/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.activities() });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Timeline
   ═══════════════════════════════════════════════════════════════════════════ */

export function useTimeline(params: {
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  accountId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: commsKeys.timeline(params),
    queryFn: () =>
      apiClient<PaginatedResponse<Activity>>(
        buildUrl('/api/v1/comms/timeline', params as Record<string, unknown>),
      ),
    enabled:
      !!params.contactId ||
      !!params.dealId ||
      !!params.ticketId ||
      !!params.accountId,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Calls
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLogCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      contactId?: string;
      dealId?: string;
      ticketId?: string;
      accountId?: string;
      direction: 'INBOUND' | 'OUTBOUND';
      subject?: string;
      body?: string;
      fromNumber: string;
      toNumber: string;
      duration: number;
      status: string;
      provider?: string;
    }) =>
      apiClient<Single<Activity>>('/api/v1/comms/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.activities() });
      qc.invalidateQueries({ queryKey: [...commsKeys.all, 'timeline'] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Emails
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSendEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      contactId?: string;
      dealId?: string;
      ticketId?: string;
      accountId?: string;
      to: string;
      subject: string;
      bodyHtml: string;
      templateId?: string;
    }) =>
      apiClient<Single<Activity>>('/api/v1/comms/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.activities() });
      qc.invalidateQueries({ queryKey: [...commsKeys.all, 'timeline'] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Email Templates
   ═══════════════════════════════════════════════════════════════════════════ */

export function useEmailTemplates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: commsKeys.templates(params),
    queryFn: () =>
      apiClient<PaginatedResponse<EmailTemplate>>(
        buildUrl('/api/v1/comms/email-templates', params),
      ),
  });
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: commsKeys.template(id),
    queryFn: () =>
      apiClient<Single<EmailTemplate>>(
        `/api/v1/comms/email-templates/${id}`,
      ).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      subject: string;
      bodyHtml: string;
      mergeFields?: string[];
      isActive?: boolean;
    }) =>
      apiClient<Single<EmailTemplate>>('/api/v1/comms/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.templates() });
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      subject?: string;
      bodyHtml?: string;
      mergeFields?: string[];
      isActive?: boolean;
      version: number;
    }) =>
      apiClient<Single<EmailTemplate>>(
        `/api/v1/comms/email-templates/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: commsKeys.templates() });
      qc.invalidateQueries({ queryKey: commsKeys.template(variables.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Email Sync
   ═══════════════════════════════════════════════════════════════════════════ */

export function useEmailSyncs() {
  return useQuery({
    queryKey: commsKeys.emailSyncs(),
    queryFn: () =>
      apiClient<Single<EmailSyncConfig[]>>('/api/v1/comms/email-sync').then(
        (r) => r.data,
      ),
  });
}

export function useConnectEmailSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { provider: 'GMAIL' | 'OUTLOOK'; authCode: string }) =>
      apiClient<Single<EmailSyncConfig>>('/api/v1/comms/email-sync/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.emailSyncs() });
    },
  });
}

export function useDisconnectEmailSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { syncId: string }) =>
      apiClient<void>('/api/v1/comms/email-sync/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commsKeys.emailSyncs() });
    },
  });
}

export function useGmailAuthUrl(enabled = false) {
  return useQuery({
    queryKey: [...commsKeys.all, 'gmail-auth-url'] as const,
    queryFn: () =>
      apiClient<Single<{ url: string }>>(
        '/api/v1/comms/email-sync/gmail/auth-url',
      ).then((r) => r.data),
    enabled,
  });
}

export function useOutlookAuthUrl(enabled = false) {
  return useQuery({
    queryKey: [...commsKeys.all, 'outlook-auth-url'] as const,
    queryFn: () =>
      apiClient<Single<{ url: string }>>(
        '/api/v1/comms/email-sync/outlook/auth-url',
      ).then((r) => r.data),
    enabled,
  });
}
