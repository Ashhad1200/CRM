import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export type WorkCenterStatus = 'ACTIVE' | 'INACTIVE';
export type WorkOrderStatus = 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type OperationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type MRPStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface BomLine {
  id: string;
  bomId: string;
  componentProductId: string;
  description?: string;
  quantity: string;
  unit: string;
  unitCost: string;
  lineTotal: string;
}

export interface BillOfMaterial {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  bomVersion: string;
  isActive: boolean;
  totalCost: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  lines?: BomLine[];
}

export interface WorkCenter {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  capacity: string;
  capacityUnit: string;
  costPerHour: string;
  status: WorkCenterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderOperation {
  id: string;
  workOrderId: string;
  workCenterId: string;
  name: string;
  sequence: number;
  plannedHours: string;
  actualHours: string;
  status: OperationStatus;
  startedAt?: string;
  completedAt?: string;
  workCenter?: WorkCenter;
}

export interface MaterialConsumption {
  id: string;
  workOrderId: string;
  componentProductId: string;
  plannedQty: string;
  consumedQty: string;
  unit: string;
  consumedAt?: string;
  consumedBy?: string;
}

export interface ProductionOutput {
  id: string;
  workOrderId: string;
  productId: string;
  quantity: string;
  unit: string;
  lotNumber?: string;
  receivedAt: string;
  receivedBy?: string;
  warehouseLocationId?: string;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  workOrderNumber: string;
  bomId: string;
  productId: string;
  plannedQuantity: string;
  producedQuantity: string;
  status: WorkOrderStatus;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  bom?: BillOfMaterial;
  operations?: WorkOrderOperation[];
  materialConsumptions?: MaterialConsumption[];
  productionOutputs?: ProductionOutput[];
}

export interface RoutingStep {
  id: string;
  routingId: string;
  workCenterId: string;
  name: string;
  sequence: number;
  standardHours: string;
  setupHours: string;
  description?: string;
  workCenter?: WorkCenter;
}

export interface Routing {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  routingVersion: string;
  isActive: boolean;
  totalHours: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  steps?: RoutingStep[];
}

export interface ProductionScheduleEntry {
  id: string;
  tenantId: string;
  workOrderId: string;
  workCenterId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  priority: number;
  notes?: string;
  workOrder?: WorkOrder;
  workCenter?: WorkCenter;
}

export interface MRPRecommendation {
  type: 'PURCHASE' | 'MANUFACTURE';
  productId: string;
  quantity: number;
  dueDate: string;
  reason: string;
}

export interface MRPRun {
  id: string;
  tenantId: string;
  runDate: string;
  horizon: number;
  status: MRPStatus;
  recommendations: MRPRecommendation[];
  createdAt: string;
  createdBy?: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const manufacturingKeys = {
  // BOMs
  boms: ['manufacturing', 'boms'] as const,
  bom: (id: string) => ['manufacturing', 'boms', id] as const,
  bomLines: (bomId: string) => ['manufacturing', 'boms', bomId, 'lines'] as const,

  // Work Orders
  workOrders: ['manufacturing', 'work-orders'] as const,
  workOrder: (id: string) => ['manufacturing', 'work-orders', id] as const,
  workOrderOperations: (workOrderId: string) =>
    ['manufacturing', 'work-orders', workOrderId, 'operations'] as const,
  workOrderMaterials: (workOrderId: string) =>
    ['manufacturing', 'work-orders', workOrderId, 'materials'] as const,
  workOrderOutputs: (workOrderId: string) =>
    ['manufacturing', 'work-orders', workOrderId, 'outputs'] as const,

  // Routings
  routings: ['manufacturing', 'routings'] as const,
  routing: (id: string) => ['manufacturing', 'routings', id] as const,
  routingSteps: (routingId: string) =>
    ['manufacturing', 'routings', routingId, 'steps'] as const,

  // Work Centers (Workstations)
  workCenters: ['manufacturing', 'work-centers'] as const,
  workCenter: (id: string) => ['manufacturing', 'work-centers', id] as const,

  // Production Schedule
  schedule: ['manufacturing', 'schedule'] as const,
  scheduleEntry: (id: string) => ['manufacturing', 'schedule', id] as const,

  // MRP
  mrpRuns: ['manufacturing', 'mrp-runs'] as const,
  mrpRun: (id: string) => ['manufacturing', 'mrp-runs', id] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bills of Material (BOMs)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useBoms(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.boms, filters] as const,
    queryFn: () =>
      apiClient<Paginated<BillOfMaterial>>(
        buildUrl('/api/v1/manufacturing/boms', filters)
      ),
  });
}

export function useBom(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.bom(id),
    queryFn: () =>
      apiClient<Single<BillOfMaterial>>(`/api/v1/manufacturing/boms/${id}`).then(
        (r) => r.data
      ),
    enabled: !!id,
  });
}

export function useCreateBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<BillOfMaterial>>('/api/v1/manufacturing/boms', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.boms });
    },
  });
}

export function useUpdateBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<BillOfMaterial>>(`/api/v1/manufacturing/boms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.boms });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bom(vars.id) });
    },
  });
}

export function useDeleteBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/manufacturing/boms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.boms });
    },
  });
}

/* ─── BOM Lines (nested) ─── */

export function useBomLines(bomId: string) {
  return useQuery({
    queryKey: manufacturingKeys.bomLines(bomId),
    queryFn: () =>
      apiClient<Paginated<BomLine>>(`/api/v1/manufacturing/boms/${bomId}/lines`),
    enabled: !!bomId,
  });
}

export function useCreateBomLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bomId, ...data }: { bomId: string } & Record<string, unknown>) =>
      apiClient<Single<BomLine>>(`/api/v1/manufacturing/boms/${bomId}/lines`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bomLines(vars.bomId) });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bom(vars.bomId) });
    },
  });
}

export function useUpdateBomLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bomId,
      lineId,
      ...data
    }: { bomId: string; lineId: string } & Record<string, unknown>) =>
      apiClient<Single<BomLine>>(
        `/api/v1/manufacturing/boms/${bomId}/lines/${lineId}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bomLines(vars.bomId) });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bom(vars.bomId) });
    },
  });
}

export function useDeleteBomLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bomId, lineId }: { bomId: string; lineId: string }) =>
      apiClient<void>(`/api/v1/manufacturing/boms/${bomId}/lines/${lineId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bomLines(vars.bomId) });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.bom(vars.bomId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Work Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function useWorkOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.workOrders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WorkOrder>>(
        buildUrl('/api/v1/manufacturing/work-orders', filters)
      ),
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.workOrder(id),
    queryFn: () =>
      apiClient<Single<WorkOrder>>(`/api/v1/manufacturing/work-orders/${id}`).then(
        (r) => r.data
      ),
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WorkOrder>>('/api/v1/manufacturing/work-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
    },
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<WorkOrder>>(`/api/v1/manufacturing/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(vars.id) });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      apiClient<Single<WorkOrder>>(
        `/api/v1/manufacturing/work-orders/${id}/status`,
        { method: 'POST', body: JSON.stringify({ status }) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(vars.id) });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.schedule });
    },
  });
}

export function useReleaseWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WorkOrder>>(
        `/api/v1/manufacturing/work-orders/${id}/release`,
        { method: 'POST' }
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(id) });
    },
  });
}

export function useStartWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WorkOrder>>(
        `/api/v1/manufacturing/work-orders/${id}/start`,
        { method: 'POST' }
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(id) });
    },
  });
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WorkOrder>>(
        `/api/v1/manufacturing/work-orders/${id}/complete`,
        { method: 'POST' }
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(id) });
    },
  });
}

export function useCancelWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<WorkOrder>>(
        `/api/v1/manufacturing/work-orders/${id}/cancel`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrders });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workOrder(id) });
    },
  });
}

/* ─── Work Order Operations (nested) ─── */

export function useWorkOrderOperations(workOrderId: string) {
  return useQuery({
    queryKey: manufacturingKeys.workOrderOperations(workOrderId),
    queryFn: () =>
      apiClient<Paginated<WorkOrderOperation>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/operations`
      ),
    enabled: !!workOrderId,
  });
}

export function useUpdateOperationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      operationId,
      status,
    }: {
      workOrderId: string;
      operationId: string;
      status: OperationStatus;
    }) =>
      apiClient<Single<WorkOrderOperation>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/operations/${operationId}/status`,
        { method: 'POST', body: JSON.stringify({ status }) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrderOperations(vars.workOrderId),
      });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrder(vars.workOrderId),
      });
    },
  });
}

export function useRecordOperationTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      operationId,
      actualHours,
    }: {
      workOrderId: string;
      operationId: string;
      actualHours: number;
    }) =>
      apiClient<Single<WorkOrderOperation>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/operations/${operationId}/time`,
        { method: 'POST', body: JSON.stringify({ actualHours }) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrderOperations(vars.workOrderId),
      });
    },
  });
}

/* ─── Material Consumption ─── */

export function useWorkOrderMaterials(workOrderId: string) {
  return useQuery({
    queryKey: manufacturingKeys.workOrderMaterials(workOrderId),
    queryFn: () =>
      apiClient<Paginated<MaterialConsumption>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/materials`
      ),
    enabled: !!workOrderId,
  });
}

export function useRecordMaterialConsumption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      materialId,
      quantity,
    }: {
      workOrderId: string;
      materialId: string;
      quantity: number;
    }) =>
      apiClient<Single<MaterialConsumption>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/materials/${materialId}/consume`,
        { method: 'POST', body: JSON.stringify({ quantity }) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrderMaterials(vars.workOrderId),
      });
    },
  });
}

/* ─── Production Output ─── */

export function useWorkOrderOutputs(workOrderId: string) {
  return useQuery({
    queryKey: manufacturingKeys.workOrderOutputs(workOrderId),
    queryFn: () =>
      apiClient<Paginated<ProductionOutput>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/outputs`
      ),
    enabled: !!workOrderId,
  });
}

export function useRecordProductionOutput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      ...data
    }: { workOrderId: string } & Record<string, unknown>) =>
      apiClient<Single<ProductionOutput>>(
        `/api/v1/manufacturing/work-orders/${workOrderId}/outputs`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrderOutputs(vars.workOrderId),
      });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workOrder(vars.workOrderId),
      });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Routings
   ═══════════════════════════════════════════════════════════════════════════ */

export function useRoutings(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.routings, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Routing>>(
        buildUrl('/api/v1/manufacturing/routings', filters)
      ),
  });
}

export function useRouting(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.routing(id),
    queryFn: () =>
      apiClient<Single<Routing>>(`/api/v1/manufacturing/routings/${id}`).then(
        (r) => r.data
      ),
    enabled: !!id,
  });
}

export function useCreateRouting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Routing>>('/api/v1/manufacturing/routings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.routings });
    },
  });
}

export function useUpdateRouting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Routing>>(`/api/v1/manufacturing/routings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.routings });
      void qc.invalidateQueries({ queryKey: manufacturingKeys.routing(vars.id) });
    },
  });
}

export function useDeleteRouting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/manufacturing/routings/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.routings });
    },
  });
}

/* ─── Routing Steps (nested) ─── */

export function useRoutingSteps(routingId: string) {
  return useQuery({
    queryKey: manufacturingKeys.routingSteps(routingId),
    queryFn: () =>
      apiClient<Paginated<RoutingStep>>(
        `/api/v1/manufacturing/routings/${routingId}/steps`
      ),
    enabled: !!routingId,
  });
}

export function useCreateRoutingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      routingId,
      ...data
    }: { routingId: string } & Record<string, unknown>) =>
      apiClient<Single<RoutingStep>>(
        `/api/v1/manufacturing/routings/${routingId}/steps`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routingSteps(vars.routingId),
      });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routing(vars.routingId),
      });
    },
  });
}

export function useUpdateRoutingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      routingId,
      stepId,
      ...data
    }: { routingId: string; stepId: string } & Record<string, unknown>) =>
      apiClient<Single<RoutingStep>>(
        `/api/v1/manufacturing/routings/${routingId}/steps/${stepId}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routingSteps(vars.routingId),
      });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routing(vars.routingId),
      });
    },
  });
}

export function useDeleteRoutingStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routingId, stepId }: { routingId: string; stepId: string }) =>
      apiClient<void>(
        `/api/v1/manufacturing/routings/${routingId}/steps/${stepId}`,
        { method: 'DELETE' }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routingSteps(vars.routingId),
      });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.routing(vars.routingId),
      });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Work Centers (Workstations)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useWorkCenters(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.workCenters, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WorkCenter>>(
        buildUrl('/api/v1/manufacturing/work-centers', filters)
      ),
  });
}

export function useWorkCenter(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.workCenter(id),
    queryFn: () =>
      apiClient<Single<WorkCenter>>(
        `/api/v1/manufacturing/work-centers/${id}`
      ).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WorkCenter>>('/api/v1/manufacturing/work-centers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workCenters });
    },
  });
}

export function useUpdateWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<WorkCenter>>(`/api/v1/manufacturing/work-centers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workCenters });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.workCenter(vars.id),
      });
    },
  });
}

export function useDeleteWorkCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/manufacturing/work-centers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.workCenters });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Production Schedule
   ═══════════════════════════════════════════════════════════════════════════ */

export function useProductionSchedule(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.schedule, filters] as const,
    queryFn: () =>
      apiClient<Paginated<ProductionScheduleEntry>>(
        buildUrl('/api/v1/manufacturing/schedule', filters)
      ),
  });
}

export function useScheduleEntry(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.scheduleEntry(id),
    queryFn: () =>
      apiClient<Single<ProductionScheduleEntry>>(
        `/api/v1/manufacturing/schedule/${id}`
      ).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<ProductionScheduleEntry>>(
        '/api/v1/manufacturing/schedule',
        { method: 'POST', body: JSON.stringify(payload) }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.schedule });
    },
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<ProductionScheduleEntry>>(
        `/api/v1/manufacturing/schedule/${id}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.schedule });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.scheduleEntry(vars.id),
      });
    },
  });
}

export function useDeleteScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/manufacturing/schedule/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.schedule });
    },
  });
}

export function useRescheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      scheduledStart,
      scheduledEnd,
    }: {
      id: string;
      scheduledStart: string;
      scheduledEnd: string;
    }) =>
      apiClient<Single<ProductionScheduleEntry>>(
        `/api/v1/manufacturing/schedule/${id}/reschedule`,
        { method: 'POST', body: JSON.stringify({ scheduledStart, scheduledEnd }) }
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.schedule });
      void qc.invalidateQueries({
        queryKey: manufacturingKeys.scheduleEntry(vars.id),
      });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   MRP (Material Requirements Planning)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useMrpRuns(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...manufacturingKeys.mrpRuns, filters] as const,
    queryFn: () =>
      apiClient<Paginated<MRPRun>>(
        buildUrl('/api/v1/manufacturing/mrp-runs', filters)
      ),
  });
}

export function useMrpRun(id: string) {
  return useQuery({
    queryKey: manufacturingKeys.mrpRun(id),
    queryFn: () =>
      apiClient<Single<MRPRun>>(`/api/v1/manufacturing/mrp-runs/${id}`).then(
        (r) => r.data
      ),
    enabled: !!id,
  });
}

export function useRunMrp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { horizon?: number }) =>
      apiClient<Single<MRPRun>>('/api/v1/manufacturing/mrp-runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: manufacturingKeys.mrpRuns });
    },
  });
}
