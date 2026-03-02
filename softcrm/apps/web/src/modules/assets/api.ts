import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Enums ───────── */

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
export type AssetStatus = 'ACTIVE' | 'DISPOSED' | 'UNDER_MAINTENANCE' | 'FULLY_DEPRECIATED';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DisposalMethod = 'SOLD' | 'SCRAPPED' | 'DONATED' | 'WRITTEN_OFF';
export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type MaintenanceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type DisposalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type AuditStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AuditScope = 'FULL' | 'LOCATION' | 'CATEGORY' | 'DEPARTMENT';

/* ───────── Types ───────── */

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
  usefulLifeYears: number;
  salvageValuePercent: string;
  depreciationMethod: DepreciationMethod;
  glAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepreciationSchedule {
  id: string;
  assetId: string;
  periodStart: string;
  periodEnd: string;
  openingValue: string;
  depreciationCharge: string;
  closingValue: string;
  isPosted: boolean;
  journalEntryId?: string;
  createdAt: string;
}

export interface FixedAsset {
  id: string;
  assetNumber: string;
  name: string;
  description?: string;
  categoryId: string;
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: string;
  currentBookValue: string;
  salvageValue: string;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  totalUnitsExpected?: string;
  totalUnitsProduced: string;
  locationId?: string;
  departmentId?: string;
  assignedTo?: string;
  condition: AssetCondition;
  status: AssetStatus;
  purchaseInvoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  category?: AssetCategory;
  depreciationSchedule?: DepreciationSchedule[];
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: MaintenanceType;
  scheduledDate: string;
  completedDate?: string;
  cost?: string;
  vendor?: string;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  asset?: FixedAsset;
}

export interface MaintenanceSchedule {
  id: string;
  assetId: string;
  name: string;
  description?: string;
  maintenanceType: MaintenanceType;
  frequency: MaintenanceFrequency;
  startDate: string;
  endDate?: string;
  lastScheduledDate?: string;
  nextScheduledDate?: string;
  estimatedCost?: string;
  vendor?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  asset?: FixedAsset;
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  transferNumber: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromAssignedTo?: string;
  toAssignedTo?: string;
  transferDate: string;
  effectiveDate: string;
  reason?: string;
  status: TransferStatus;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  asset?: FixedAsset;
}

export interface AssetAuditLine {
  id: string;
  auditId: string;
  assetId: string;
  expectedLocation?: string;
  actualLocation?: string;
  expectedCondition?: AssetCondition;
  actualCondition?: AssetCondition;
  isVerified: boolean;
  isDiscrepancy: boolean;
  discrepancyType?: string;
  notes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  asset?: FixedAsset;
}

export interface AssetAudit {
  id: string;
  auditNumber: string;
  name: string;
  description?: string;
  scope: AuditScope;
  scopeFilter?: Record<string, unknown>;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: AuditStatus;
  totalAssets: number;
  assetsVerified: number;
  assetsMissing: number;
  assetsFound: number;
  discrepancies: number;
  findings?: string;
  recommendations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  conductedBy?: string;
  lines?: AssetAuditLine[];
}

export interface AssetDisposal {
  id: string;
  assetId: string;
  disposalNumber: string;
  disposalDate: string;
  disposalMethod: DisposalMethod;
  status: DisposalStatus;
  bookValueAtDisposal: string;
  proceedsAmount: string;
  disposalCosts: string;
  gainLoss: string;
  buyerName?: string;
  buyerContact?: string;
  invoiceId?: string;
  reason?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  asset?: FixedAsset;
}

export interface DepreciationReport {
  assetId: string;
  assetNumber: string;
  assetName: string;
  purchasePrice: string;
  currentBookValue: string;
  totalDepreciation: string;
  monthlyDepreciation: string;
  yearlyDepreciation: string;
  remainingLife: number;
  depreciationMethod: DepreciationMethod;
  schedules: DepreciationSchedule[];
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const assetsKeys = {
  categories: ['assets', 'categories'] as const,
  category: (id: string) => ['assets', 'categories', id] as const,
  assets: ['assets', 'assets'] as const,
  asset: (id: string) => ['assets', 'assets', id] as const,
  assetDepreciation: (id: string) => ['assets', 'assets', id, 'depreciation'] as const,
  maintenance: ['assets', 'maintenance'] as const,
  maintenanceRecord: (id: string) => ['assets', 'maintenance', id] as const,
  maintenanceSchedules: ['assets', 'maintenance-schedules'] as const,
  maintenanceSchedule: (id: string) => ['assets', 'maintenance-schedules', id] as const,
  transfers: ['assets', 'transfers'] as const,
  transfer: (id: string) => ['assets', 'transfers', id] as const,
  audits: ['assets', 'audits'] as const,
  audit: (id: string) => ['assets', 'audits', id] as const,
  disposals: ['assets', 'disposals'] as const,
  disposal: (id: string) => ['assets', 'disposals', id] as const,
  depreciationReport: ['assets', 'depreciation-report'] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset Categories
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAssetCategories(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.categories, filters] as const,
    queryFn: () =>
      apiClient<Paginated<AssetCategory>>(buildUrl('/api/v1/assets/categories', filters)),
  });
}

export function useAssetCategory(id: string) {
  return useQuery({
    queryKey: assetsKeys.category(id),
    queryFn: () =>
      apiClient<Single<AssetCategory>>(`/api/v1/assets/categories/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<AssetCategory>>('/api/v1/assets/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.categories });
    },
  });
}

export function useUpdateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<AssetCategory>>(`/api/v1/assets/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.categories });
      void qc.invalidateQueries({ queryKey: assetsKeys.category(vars.id) });
    },
  });
}

export function useDeleteAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/assets/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.categories });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Fixed Assets
   ═══════════════════════════════════════════════════════════════════════════ */

export function useFixedAssets(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.assets, filters] as const,
    queryFn: () =>
      apiClient<Paginated<FixedAsset>>(buildUrl('/api/v1/assets/assets', filters)),
  });
}

export function useFixedAsset(id: string) {
  return useQuery({
    queryKey: assetsKeys.asset(id),
    queryFn: () =>
      apiClient<Single<FixedAsset>>(`/api/v1/assets/assets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<FixedAsset>>('/api/v1/assets/assets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

export function useUpdateFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<FixedAsset>>(`/api/v1/assets/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
      void qc.invalidateQueries({ queryKey: assetsKeys.asset(vars.id) });
    },
  });
}

export function useDeleteFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/assets/assets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

export function useCalculateDepreciation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; periodEnd?: string }) =>
      apiClient<Single<DepreciationSchedule[]>>(`/api/v1/assets/assets/${id}/depreciation/calculate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.asset(vars.id) });
      void qc.invalidateQueries({ queryKey: assetsKeys.assetDepreciation(vars.id) });
      void qc.invalidateQueries({ queryKey: assetsKeys.depreciationReport });
    },
  });
}

export function useAssetDepreciationSchedule(assetId: string) {
  return useQuery({
    queryKey: assetsKeys.assetDepreciation(assetId),
    queryFn: () =>
      apiClient<Paginated<DepreciationSchedule>>(`/api/v1/assets/assets/${assetId}/depreciation`),
    enabled: !!assetId,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset Maintenance
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAssetMaintenanceRecords(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.maintenance, filters] as const,
    queryFn: () =>
      apiClient<Paginated<AssetMaintenance>>(buildUrl('/api/v1/assets/maintenance', filters)),
  });
}

export function useAssetMaintenanceRecord(id: string) {
  return useQuery({
    queryKey: assetsKeys.maintenanceRecord(id),
    queryFn: () =>
      apiClient<Single<AssetMaintenance>>(`/api/v1/assets/maintenance/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<AssetMaintenance>>('/api/v1/assets/maintenance', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenance });
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

export function useCompleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; completedDate?: string; cost?: string }) =>
      apiClient<Single<AssetMaintenance>>(`/api/v1/assets/maintenance/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenance });
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenanceRecord(vars.id) });
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Maintenance Schedules (Recurring)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useMaintenanceSchedules(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.maintenanceSchedules, filters] as const,
    queryFn: () =>
      apiClient<Paginated<MaintenanceSchedule>>(buildUrl('/api/v1/assets/maintenance-schedules', filters)),
  });
}

export function useMaintenanceSchedule(id: string) {
  return useQuery({
    queryKey: assetsKeys.maintenanceSchedule(id),
    queryFn: () =>
      apiClient<Single<MaintenanceSchedule>>(`/api/v1/assets/maintenance-schedules/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<MaintenanceSchedule>>('/api/v1/assets/maintenance-schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenanceSchedules });
    },
  });
}

export function useUpdateMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<MaintenanceSchedule>>(`/api/v1/assets/maintenance-schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenanceSchedules });
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenanceSchedule(vars.id) });
    },
  });
}

export function useDeleteMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/assets/maintenance-schedules/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.maintenanceSchedules });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset Transfers
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAssetTransfers(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.transfers, filters] as const,
    queryFn: () =>
      apiClient<Paginated<AssetTransfer>>(buildUrl('/api/v1/assets/transfers', filters)),
  });
}

export function useAssetTransfer(id: string) {
  return useQuery({
    queryKey: assetsKeys.transfer(id),
    queryFn: () =>
      apiClient<Single<AssetTransfer>>(`/api/v1/assets/transfers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<AssetTransfer>>('/api/v1/assets/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.transfers });
    },
  });
}

export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<AssetTransfer>>(`/api/v1/assets/transfers/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.transfers });
      void qc.invalidateQueries({ queryKey: assetsKeys.transfer(vars.id) });
    },
  });
}

export function useRejectTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<AssetTransfer>>(`/api/v1/assets/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.transfers });
      void qc.invalidateQueries({ queryKey: assetsKeys.transfer(vars.id) });
    },
  });
}

export function useCompleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<AssetTransfer>>(`/api/v1/assets/transfers/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.transfers });
      void qc.invalidateQueries({ queryKey: assetsKeys.transfer(vars.id) });
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset Audits
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAssetAudits(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.audits, filters] as const,
    queryFn: () =>
      apiClient<Paginated<AssetAudit>>(buildUrl('/api/v1/assets/audits', filters)),
  });
}

export function useAssetAudit(id: string) {
  return useQuery({
    queryKey: assetsKeys.audit(id),
    queryFn: () =>
      apiClient<Single<AssetAudit>>(`/api/v1/assets/audits/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<AssetAudit>>('/api/v1/assets/audits', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.audits });
    },
  });
}

export function useStartAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<AssetAudit>>(`/api/v1/assets/audits/${id}/start`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.audits });
      void qc.invalidateQueries({ queryKey: assetsKeys.audit(vars.id) });
    },
  });
}

export function useCompleteAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; findings?: string; recommendations?: string }) =>
      apiClient<Single<AssetAudit>>(`/api/v1/assets/audits/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.audits });
      void qc.invalidateQueries({ queryKey: assetsKeys.audit(vars.id) });
    },
  });
}

export function useUpdateAuditLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      auditId,
      lineId,
      ...data
    }: {
      auditId: string;
      lineId: string;
      actualLocation?: string;
      actualCondition?: AssetCondition;
      isVerified?: boolean;
      notes?: string;
    }) =>
      apiClient<Single<AssetAuditLine>>(`/api/v1/assets/audits/${auditId}/lines/${lineId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.audit(vars.auditId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Asset Disposals
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAssetDisposals(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.disposals, filters] as const,
    queryFn: () =>
      apiClient<Paginated<AssetDisposal>>(buildUrl('/api/v1/assets/disposals', filters)),
  });
}

export function useAssetDisposal(id: string) {
  return useQuery({
    queryKey: assetsKeys.disposal(id),
    queryFn: () =>
      apiClient<Single<AssetDisposal>>(`/api/v1/assets/disposals/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAssetDisposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<AssetDisposal>>('/api/v1/assets/disposals', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetsKeys.disposals });
    },
  });
}

export function useApproveDisposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<AssetDisposal>>(`/api/v1/assets/disposals/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.disposals });
      void qc.invalidateQueries({ queryKey: assetsKeys.disposal(vars.id) });
      void qc.invalidateQueries({ queryKey: assetsKeys.assets });
    },
  });
}

export function useRejectDisposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<AssetDisposal>>(`/api/v1/assets/disposals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: assetsKeys.disposals });
      void qc.invalidateQueries({ queryKey: assetsKeys.disposal(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Depreciation Reports
   ═══════════════════════════════════════════════════════════════════════════ */

export function useDepreciationReport(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...assetsKeys.depreciationReport, filters] as const,
    queryFn: () =>
      apiClient<Paginated<DepreciationReport>>(buildUrl('/api/v1/assets/depreciation/report', filters)),
  });
}
