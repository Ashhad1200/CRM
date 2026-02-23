import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  company?: string;
  jobTitle?: string;
  accountId?: string;
  lifecycleStage: string;
  tags: string[];
  ownerId?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  ownerId?: string;
  createdAt: string;
  version: number;
  contacts?: Contact[];
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  score: number;
  status: string;
  assignedOwnerId?: string;
  createdAt: string;
  version: number;
}

export interface DealStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color?: string;
}

export interface DealContact {
  contact: Contact;
  role?: string;
  isPrimary: boolean;
}

export interface Deal {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  value: string;
  currency: string;
  probability: number;
  weightedValue: string;
  expectedCloseDate?: string;
  ownerId?: string;
  accountId?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  createdAt: string;
  version: number;
  stage?: DealStage;
  contacts?: DealContact[];
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: DealStage[];
}

export interface QuoteLine {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  lineTotal: string;
  productId?: string;
}

export interface Quote {
  id: string;
  dealId: string;
  quoteNumber: number;
  title?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  currency: string;
  status: string;
  approvalStatus: string;
  validUntil?: string;
  lines: QuoteLine[];
  version: number;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

interface LeadConversionResult {
  leadId: string;
  contactId: string;
  accountId: string | null;
  dealId: string | null;
}

/* ───────── Query keys ───────── */

export const salesKeys = {
  contacts: ['sales', 'contacts'] as const,
  contact: (id: string) => ['sales', 'contacts', id] as const,
  accounts: ['sales', 'accounts'] as const,
  account: (id: string) => ['sales', 'accounts', id] as const,
  leads: ['sales', 'leads'] as const,
  lead: (id: string) => ['sales', 'leads', id] as const,
  deals: ['sales', 'deals'] as const,
  deal: (id: string) => ['sales', 'deals', id] as const,
  pipelines: ['sales', 'pipelines'] as const,
  pipeline: (id: string) => ['sales', 'pipelines', id] as const,
  quotes: (dealId: string) => ['sales', 'quotes', dealId] as const,
  quote: (id: string) => ['sales', 'quote', id] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Contacts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useContacts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...salesKeys.contacts, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Contact>>(buildUrl('/api/v1/sales/contacts', filters)),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: salesKeys.contact(id),
    queryFn: () =>
      apiClient<Single<Contact>>(`/api/v1/sales/contacts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Contact>>('/api/v1/sales/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.contacts });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Contact>>(`/api/v1/sales/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.contacts });
      void qc.invalidateQueries({ queryKey: salesKeys.contact(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Accounts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAccounts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...salesKeys.accounts, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Account>>(buildUrl('/api/v1/sales/accounts', filters)),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: salesKeys.account(id),
    queryFn: () =>
      apiClient<Single<Account>>(`/api/v1/sales/accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Account>>('/api/v1/sales/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.accounts });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Account>>(`/api/v1/sales/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.accounts });
      void qc.invalidateQueries({ queryKey: salesKeys.account(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Leads
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLeads(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...salesKeys.leads, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Lead>>(buildUrl('/api/v1/sales/leads', filters)),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: salesKeys.lead(id),
    queryFn: () =>
      apiClient<Single<Lead>>(`/api/v1/sales/leads/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Lead>>('/api/v1/sales/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.leads });
    },
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<LeadConversionResult>>(`/api/v1/sales/leads/${id}/convert`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.leads });
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
      void qc.invalidateQueries({ queryKey: salesKeys.contacts });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Deals
   ═══════════════════════════════════════════════════════════════════════════ */

export function useDeals(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...salesKeys.deals, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Deal>>(buildUrl('/api/v1/sales/deals', filters)),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: salesKeys.deal(id),
    queryFn: () =>
      apiClient<Single<Deal>>(`/api/v1/sales/deals/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Deal>>('/api/v1/sales/deals', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Deal>>(`/api/v1/sales/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
      void qc.invalidateQueries({ queryKey: salesKeys.deal(vars.id) });
    },
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; stageId: string }) =>
      apiClient<Single<Deal>>(`/api/v1/sales/deals/${id}/stage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
      void qc.invalidateQueries({ queryKey: salesKeys.deal(vars.id) });
    },
  });
}

export function useMarkDealWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Deal>>(`/api/v1/sales/deals/${id}/won`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
      void qc.invalidateQueries({ queryKey: salesKeys.deal(vars.id) });
    },
  });
}

export function useMarkDealLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<Deal>>(`/api/v1/sales/deals/${id}/lost`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.deals });
      void qc.invalidateQueries({ queryKey: salesKeys.deal(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pipelines
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePipelines() {
  return useQuery({
    queryKey: salesKeys.pipelines,
    queryFn: () =>
      apiClient<Paginated<Pipeline>>('/api/v1/sales/pipelines'),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: salesKeys.pipeline(id),
    queryFn: () =>
      apiClient<Single<Pipeline>>(`/api/v1/sales/pipelines/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Quotes
   ═══════════════════════════════════════════════════════════════════════════ */

export function useQuotes(dealId: string) {
  return useQuery({
    queryKey: salesKeys.quotes(dealId),
    queryFn: () =>
      apiClient<Paginated<Quote>>(`/api/v1/sales/deals/${dealId}/quotes`),
    enabled: !!dealId,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: salesKeys.quote(id),
    queryFn: () =>
      apiClient<Single<Quote>>(`/api/v1/sales/quotes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: { dealId: string } & Record<string, unknown>) =>
      apiClient<Single<Quote>>(`/api/v1/sales/deals/${dealId}/quotes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.quotes(vars.dealId) });
    },
  });
}

export function useSubmitQuoteApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<Quote>>(`/api/v1/sales/quotes/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: salesKeys.quote(vars.id) });
    },
  });
}
