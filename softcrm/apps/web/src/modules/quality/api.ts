import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Enums ───────── */

export type InspectionType = 'INCOMING' | 'IN_PROCESS' | 'FINAL' | 'SUPPLIER';
export type ChecklistItemType = 'PASS_FAIL' | 'NUMERIC' | 'TEXT';
export type InspectionStatus = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'WAIVED';
export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL';
export type NcrSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';
export type NcrStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
export type CorrectiveActionType = 'CORRECTIVE' | 'PREVENTIVE';
export type CorrectiveActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'OVERDUE';

/* ───────── Types ───────── */

export interface ChecklistItem {
  id: string;
  question: string;
  type: ChecklistItemType;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  required: boolean;
  order: number;
}

export interface QCChecklist {
  id: string;
  name: string;
  type: InspectionType;
  description?: string;
  checklistItems: ChecklistItem[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionResultItem {
  id: string;
  inspectionId: string;
  checklistItemId: string;
  question: string;
  resultType: ChecklistItemType;
  passFail?: boolean;
  numericValue?: string;
  textValue?: string;
  isPassing: boolean;
  notes?: string;
}

export interface Inspection {
  id: string;
  templateId: string;
  inspectionNumber: string;
  type: InspectionType;
  referenceId?: string;
  referenceType?: string;
  productId?: string;
  lotNumber?: string;
  batchSize?: number;
  sampledUnits?: number;
  status: InspectionStatus;
  inspectorId: string;
  scheduledDate: string;
  conductedDate?: string;
  overallResult?: InspectionResult;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  template?: QCChecklist;
  results?: InspectionResultItem[];
}

export interface NCRAction {
  id: string;
  ncrId: string;
  actionType: CorrectiveActionType;
  description: string;
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  status: CorrectiveActionStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  inspectionId?: string;
  title: string;
  description: string;
  severity: NcrSeverity;
  productId?: string;
  supplierId?: string;
  status: NcrStatus;
  rootCause?: string;
  immediateAction?: string;
  detectedBy: string;
  detectedAt: string;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  inspection?: Inspection;
  correctiveActions?: NCRAction[];
}

export interface TestPlanStep {
  id: string;
  description: string;
  expectedResult: string;
  order: number;
}

export interface TestPlan {
  id: string;
  name: string;
  description?: string;
  productId?: string;
  steps: TestPlanStep[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  type: CorrectiveActionType;
  ncrId?: string;
  status: CorrectiveActionStatus;
  rootCauseAnalysis?: string;
  proposedAction: string;
  implementationPlan?: string;
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  effectiveness?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  ncr?: NCR;
}

export interface SupplierQualityScore {
  id: string;
  supplierId: string;
  period: string;
  totalInspections: number;
  passedInspections: number;
  qualityScore: string;
  ncrCount: number;
  calculatedAt: string;
}

export interface QualityMetrics {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  passRate: number;
  openNcrs: number;
  openCapas: number;
  overdueActions: number;
  averageResolutionTime: number;
  trendData: {
    period: string;
    inspections: number;
    passRate: number;
    ncrs: number;
  }[];
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const qualityKeys = {
  checklists: ['quality', 'checklists'] as const,
  checklist: (id: string) => ['quality', 'checklists', id] as const,
  inspections: ['quality', 'inspections'] as const,
  inspection: (id: string) => ['quality', 'inspections', id] as const,
  testPlans: ['quality', 'test-plans'] as const,
  testPlan: (id: string) => ['quality', 'test-plans', id] as const,
  ncrs: ['quality', 'ncrs'] as const,
  ncr: (id: string) => ['quality', 'ncrs', id] as const,
  ncrActions: (ncrId: string) => ['quality', 'ncrs', ncrId, 'actions'] as const,
  capas: ['quality', 'capas'] as const,
  capa: (id: string) => ['quality', 'capas', id] as const,
  metrics: ['quality', 'metrics'] as const,
  supplierScores: ['quality', 'supplier-scores'] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   QC Checklists (Templates)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useChecklists(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.checklists, filters] as const,
    queryFn: () =>
      apiClient<Paginated<QCChecklist>>(buildUrl('/api/v1/quality/checklists', filters)),
  });
}

export function useChecklist(id: string) {
  return useQuery({
    queryKey: qualityKeys.checklist(id),
    queryFn: () =>
      apiClient<Single<QCChecklist>>(`/api/v1/quality/checklists/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<QCChecklist>>('/api/v1/quality/checklists', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.checklists });
    },
  });
}

export function useUpdateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<QCChecklist>>(`/api/v1/quality/checklists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.checklists });
      void qc.invalidateQueries({ queryKey: qualityKeys.checklist(vars.id) });
    },
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<void>(`/api/v1/quality/checklists/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.checklists });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Inspections
   ═══════════════════════════════════════════════════════════════════════════ */

export function useInspections(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.inspections, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Inspection>>(buildUrl('/api/v1/quality/inspections', filters)),
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: qualityKeys.inspection(id),
    queryFn: () =>
      apiClient<Single<Inspection>>(`/api/v1/quality/inspections/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Inspection>>('/api/v1/quality/inspections', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.inspections });
    },
  });
}

export function useUpdateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Inspection>>(`/api/v1/quality/inspections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.inspections });
      void qc.invalidateQueries({ queryKey: qualityKeys.inspection(vars.id) });
    },
  });
}

export function useSubmitInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, results, overallResult, notes }: {
      id: string;
      results: Array<{
        checklistItemId: string;
        passFail?: boolean;
        numericValue?: number;
        textValue?: string;
        notes?: string;
      }>;
      overallResult: InspectionResult;
      notes?: string;
    }) =>
      apiClient<Single<Inspection>>(`/api/v1/quality/inspections/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ results, overallResult, notes }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.inspections });
      void qc.invalidateQueries({ queryKey: qualityKeys.inspection(vars.id) });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

export function useApproveInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) =>
      apiClient<Single<Inspection>>(`/api/v1/quality/inspections/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved, notes }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.inspections });
      void qc.invalidateQueries({ queryKey: qualityKeys.inspection(vars.id) });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Test Plans
   ═══════════════════════════════════════════════════════════════════════════ */

export function useTestPlans(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.testPlans, filters] as const,
    queryFn: () =>
      apiClient<Paginated<TestPlan>>(buildUrl('/api/v1/quality/test-plans', filters)),
  });
}

export function useTestPlan(id: string) {
  return useQuery({
    queryKey: qualityKeys.testPlan(id),
    queryFn: () =>
      apiClient<Single<TestPlan>>(`/api/v1/quality/test-plans/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<TestPlan>>('/api/v1/quality/test-plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.testPlans });
    },
  });
}

export function useUpdateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<TestPlan>>(`/api/v1/quality/test-plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.testPlans });
      void qc.invalidateQueries({ queryKey: qualityKeys.testPlan(vars.id) });
    },
  });
}

export function useDeleteTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<void>(`/api/v1/quality/test-plans/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.testPlans });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   NCRs (Non-Conformance Reports)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useNCRs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.ncrs, filters] as const,
    queryFn: () =>
      apiClient<Paginated<NCR>>(buildUrl('/api/v1/quality/ncrs', filters)),
  });
}

export function useNCR(id: string) {
  return useQuery({
    queryKey: qualityKeys.ncr(id),
    queryFn: () =>
      apiClient<Single<NCR>>(`/api/v1/quality/ncrs/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateNCR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<NCR>>('/api/v1/quality/ncrs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrs });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

export function useUpdateNCR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<NCR>>(`/api/v1/quality/ncrs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrs });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.id) });
    },
  });
}

export function useUpdateNCRStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rootCause, closedBy }: {
      id: string;
      status: NcrStatus;
      rootCause?: string;
      closedBy?: string;
    }) =>
      apiClient<Single<NCR>>(`/api/v1/quality/ncrs/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, rootCause, closedBy }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrs });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.id) });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   NCR Actions (Corrective/Preventive)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useNCRActions(ncrId: string) {
  return useQuery({
    queryKey: qualityKeys.ncrActions(ncrId),
    queryFn: () =>
      apiClient<Paginated<NCRAction>>(`/api/v1/quality/ncrs/${ncrId}/actions`),
    enabled: !!ncrId,
  });
}

export function useCreateNCRAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ncrId, ...data }: { ncrId: string } & Record<string, unknown>) =>
      apiClient<Single<NCRAction>>(`/api/v1/quality/ncrs/${ncrId}/actions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrActions(vars.ncrId) });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.ncrId) });
    },
  });
}

export function useUpdateNCRAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ncrId, actionId, ...data }: { ncrId: string; actionId: string } & Record<string, unknown>) =>
      apiClient<Single<NCRAction>>(`/api/v1/quality/ncrs/${ncrId}/actions/${actionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrActions(vars.ncrId) });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.ncrId) });
    },
  });
}

export function useCompleteNCRAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ncrId, actionId }: { ncrId: string; actionId: string }) =>
      apiClient<Single<NCRAction>>(`/api/v1/quality/ncrs/${ncrId}/actions/${actionId}/complete`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrActions(vars.ncrId) });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.ncrId) });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

export function useVerifyNCRAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ncrId, actionId, verifiedBy }: { ncrId: string; actionId: string; verifiedBy: string }) =>
      apiClient<Single<NCRAction>>(`/api/v1/quality/ncrs/${ncrId}/actions/${actionId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verifiedBy }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.ncrActions(vars.ncrId) });
      void qc.invalidateQueries({ queryKey: qualityKeys.ncr(vars.ncrId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAPAs (Corrective and Preventive Actions)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useCAPAs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.capas, filters] as const,
    queryFn: () =>
      apiClient<Paginated<CAPA>>(buildUrl('/api/v1/quality/capas', filters)),
  });
}

export function useCAPA(id: string) {
  return useQuery({
    queryKey: qualityKeys.capa(id),
    queryFn: () =>
      apiClient<Single<CAPA>>(`/api/v1/quality/capas/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCAPA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<CAPA>>('/api/v1/quality/capas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qualityKeys.capas });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

export function useUpdateCAPA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<CAPA>>(`/api/v1/quality/capas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.capas });
      void qc.invalidateQueries({ queryKey: qualityKeys.capa(vars.id) });
    },
  });
}

export function useTrackCAPA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, completedDate, effectiveness }: {
      id: string;
      status: CorrectiveActionStatus;
      completedDate?: string;
      effectiveness?: string;
    }) =>
      apiClient<Single<CAPA>>(`/api/v1/quality/capas/${id}/track`, {
        method: 'POST',
        body: JSON.stringify({ status, completedDate, effectiveness }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.capas });
      void qc.invalidateQueries({ queryKey: qualityKeys.capa(vars.id) });
      void qc.invalidateQueries({ queryKey: qualityKeys.metrics });
    },
  });
}

export function useVerifyCAPA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verifiedBy, effectiveness }: { id: string; verifiedBy: string; effectiveness: string }) =>
      apiClient<Single<CAPA>>(`/api/v1/quality/capas/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verifiedBy, effectiveness }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: qualityKeys.capas });
      void qc.invalidateQueries({ queryKey: qualityKeys.capa(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Quality Metrics & Reports
   ═══════════════════════════════════════════════════════════════════════════ */

export function useQualityMetrics(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.metrics, filters] as const,
    queryFn: () =>
      apiClient<Single<QualityMetrics>>(buildUrl('/api/v1/quality/metrics', filters)).then((r) => r.data),
  });
}

export function useSupplierQualityScores(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...qualityKeys.supplierScores, filters] as const,
    queryFn: () =>
      apiClient<Paginated<SupplierQualityScore>>(buildUrl('/api/v1/quality/supplier-scores', filters)),
  });
}
