import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';
export type LocationType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'SHIPPING' | 'QUARANTINE';
export type StockLotStatus = 'AVAILABLE' | 'RESERVED' | 'QUARANTINE' | 'EXPIRED';
export type StockMoveType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT' | 'RETURN';
export type StockMoveStatus = 'DRAFT' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
export type PickListStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PickListLineStatus = 'PENDING' | 'PARTIAL' | 'DONE';
export type ShipmentStatus = 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
export type CycleCountStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: Address;
  isDefault: boolean;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WHLocation {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  type: LocationType;
  zone?: string;
  aisle?: string;
  rack?: string;
  bin?: string;
  maxCapacity?: string;
  createdAt: string;
  updatedAt: string;
  warehouse?: Warehouse;
  children?: WHLocation[];
}

export interface WHStockLot {
  id: string;
  productId: string;
  warehouseId: string;
  locationId?: string;
  lotNumber: string;
  serialNumber?: string;
  quantity: string;
  reservedQty: string;
  expiryDate?: string;
  receivedAt: string;
  status: StockLotStatus;
  warehouse?: Warehouse;
  location?: WHLocation;
}

export interface WHStockMove {
  id: string;
  reference: string;
  moveType: StockMoveType;
  productId: string;
  warehouseId: string;
  lotId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  plannedQty: string;
  doneQty: string;
  status: StockMoveStatus;
  sourceDocument?: string;
  scheduledDate: string;
  doneDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  warehouse?: Warehouse;
  lot?: WHStockLot;
  fromLocation?: WHLocation;
  toLocation?: WHLocation;
}

export interface WHPickListLine {
  id: string;
  pickListId: string;
  productId: string;
  locationId: string;
  lotId?: string;
  requestedQty: string;
  pickedQty: string;
  status: PickListLineStatus;
  location?: WHLocation;
  lot?: WHStockLot;
}

export interface WHPickList {
  id: string;
  warehouseId: string;
  sourceOrderId?: string;
  sourceOrderType?: string;
  status: PickListStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  warehouse?: Warehouse;
  lines: WHPickListLine[];
}

export interface WHShipment {
  id: string;
  warehouseId: string;
  pickListId?: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  status: ShipmentStatus;
  recipientName: string;
  recipientAddress: Address;
  weight?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  warehouse?: Warehouse;
  pickList?: WHPickList;
}

export interface CycleCountDiscrepancy {
  productId: string;
  lotId?: string;
  expectedQty: string;
  countedQty: string;
  variance: string;
}

export interface WHCycleCount {
  id: string;
  warehouseId: string;
  locationId?: string;
  status: CycleCountStatus;
  countedBy: string;
  startedAt?: string;
  completedAt?: string;
  discrepancies: CycleCountDiscrepancy[];
  createdAt: string;
  createdBy?: string;
  warehouse?: Warehouse;
  location?: WHLocation;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const warehouseKeys = {
  warehouses: ['warehouse', 'warehouses'] as const,
  warehouse: (id: string) => ['warehouse', 'warehouses', id] as const,
  locations: (warehouseId?: string) => ['warehouse', 'locations', warehouseId] as const,
  location: (id: string) => ['warehouse', 'locations', 'detail', id] as const,
  stockLots: ['warehouse', 'stockLots'] as const,
  stockLot: (id: string) => ['warehouse', 'stockLots', id] as const,
  stockMoves: ['warehouse', 'stockMoves'] as const,
  stockMove: (id: string) => ['warehouse', 'stockMoves', id] as const,
  pickLists: ['warehouse', 'pickLists'] as const,
  pickList: (id: string) => ['warehouse', 'pickLists', id] as const,
  shipments: ['warehouse', 'shipments'] as const,
  shipment: (id: string) => ['warehouse', 'shipments', id] as const,
  cycleCounts: ['warehouse', 'cycleCounts'] as const,
  cycleCount: (id: string) => ['warehouse', 'cycleCounts', id] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Warehouses
   ═══════════════════════════════════════════════════════════════════════════ */

export function useWarehouses(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.warehouses, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Warehouse>>(buildUrl('/api/v1/warehouse/warehouses', filters)),
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.warehouse(id),
    queryFn: () =>
      apiClient<Single<Warehouse>>(`/api/v1/warehouse/warehouses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Warehouse>>('/api/v1/warehouse/warehouses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.warehouses });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Warehouse>>(`/api/v1/warehouse/warehouses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.warehouses });
      void qc.invalidateQueries({ queryKey: warehouseKeys.warehouse(vars.id) });
    },
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/warehouse/warehouses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.warehouses });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Locations (tree structure)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLocations(warehouseId?: string, filters?: Record<string, string>) {
  const allFilters = warehouseId ? { ...filters, warehouseId } : filters;
  return useQuery({
    queryKey: [...warehouseKeys.locations(warehouseId), filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHLocation>>(buildUrl('/api/v1/warehouse/locations', allFilters)),
  });
}

export function useLocationTree(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse', 'locationTree', warehouseId] as const,
    queryFn: () =>
      apiClient<{ data: WHLocation[] }>(`/api/v1/warehouse/warehouses/${warehouseId}/locations/tree`).then((r) => r.data),
    enabled: !!warehouseId,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: warehouseKeys.location(id),
    queryFn: () =>
      apiClient<Single<WHLocation>>(`/api/v1/warehouse/locations/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WHLocation>>('/api/v1/warehouse/locations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.locations(vars['warehouseId'] as string) });
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<WHLocation>>(`/api/v1/warehouse/locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.locations() });
      void qc.invalidateQueries({ queryKey: warehouseKeys.location(vars.id) });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/warehouse/locations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.locations() });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Stock Lots
   ═══════════════════════════════════════════════════════════════════════════ */

export function useStockLots(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.stockLots, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHStockLot>>(buildUrl('/api/v1/warehouse/stock-lots', filters)),
  });
}

export function useStockLot(id: string) {
  return useQuery({
    queryKey: warehouseKeys.stockLot(id),
    queryFn: () =>
      apiClient<Single<WHStockLot>>(`/api/v1/warehouse/stock-lots/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WHStockLot>>('/api/v1/warehouse/stock-lots/receive', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockMoves });
    },
  });
}

export function useMoveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; toLocationId: string; quantity: string }) =>
      apiClient<Single<WHStockMove>>(`/api/v1/warehouse/stock-lots/${id}/move`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLot(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockMoves });
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; quantity: string; reason?: string }) =>
      apiClient<Single<WHStockLot>>(`/api/v1/warehouse/stock-lots/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLot(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockMoves });
    },
  });
}

export function useReserveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; quantity: string; orderId?: string }) =>
      apiClient<Single<WHStockLot>>(`/api/v1/warehouse/stock-lots/${id}/reserve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLot(vars.id) });
    },
  });
}

export function useReleaseStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; quantity: string }) =>
      apiClient<Single<WHStockLot>>(`/api/v1/warehouse/stock-lots/${id}/release`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLot(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Stock Moves
   ═══════════════════════════════════════════════════════════════════════════ */

export function useStockMoves(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.stockMoves, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHStockMove>>(buildUrl('/api/v1/warehouse/stock-moves', filters)),
  });
}

export function useStockMove(id: string) {
  return useQuery({
    queryKey: warehouseKeys.stockMove(id),
    queryFn: () =>
      apiClient<Single<WHStockMove>>(`/api/v1/warehouse/stock-moves/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pick Lists
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePickLists(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.pickLists, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHPickList>>(buildUrl('/api/v1/warehouse/pick-lists', filters)),
  });
}

export function usePickList(id: string) {
  return useQuery({
    queryKey: warehouseKeys.pickList(id),
    queryFn: () =>
      apiClient<Single<WHPickList>>(`/api/v1/warehouse/pick-lists/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WHPickList>>('/api/v1/warehouse/pick-lists', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickLists });
    },
  });
}

export function useUpdatePickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<WHPickList>>(`/api/v1/warehouse/pick-lists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickLists });
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickList(vars.id) });
    },
  });
}

export function useAssignPickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      apiClient<Single<WHPickList>>(`/api/v1/warehouse/pick-lists/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedTo }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickLists });
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickList(vars.id) });
    },
  });
}

export function useStartPickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WHPickList>>(`/api/v1/warehouse/pick-lists/${id}/start`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickLists });
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickList(id) });
    },
  });
}

export function useCompletePickList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: Array<{ lineId: string; pickedQty: string }> }) =>
      apiClient<Single<WHPickList>>(`/api/v1/warehouse/pick-lists/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ lines }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickLists });
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickList(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
    },
  });
}

export function useUpdatePickListLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pickListId, lineId, ...data }: { pickListId: string; lineId: string; pickedQty: string }) =>
      apiClient<Single<WHPickListLine>>(`/api/v1/warehouse/pick-lists/${pickListId}/lines/${lineId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.pickList(vars.pickListId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shipments
   ═══════════════════════════════════════════════════════════════════════════ */

export function useShipments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.shipments, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHShipment>>(buildUrl('/api/v1/warehouse/shipments', filters)),
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: warehouseKeys.shipment(id),
    queryFn: () =>
      apiClient<Single<WHShipment>>(`/api/v1/warehouse/shipments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WHShipment>>('/api/v1/warehouse/shipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipments });
    },
  });
}

export function useUpdateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<WHShipment>>(`/api/v1/warehouse/shipments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipments });
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipment(vars.id) });
    },
  });
}

export function useDispatchShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; carrier?: string; trackingNumber?: string }) =>
      apiClient<Single<WHShipment>>(`/api/v1/warehouse/shipments/${id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipments });
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipment(vars.id) });
    },
  });
}

export function useUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ShipmentStatus }) =>
      apiClient<Single<WHShipment>>(`/api/v1/warehouse/shipments/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipments });
      void qc.invalidateQueries({ queryKey: warehouseKeys.shipment(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Cycle Counts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useCycleCounts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...warehouseKeys.cycleCounts, filters] as const,
    queryFn: () =>
      apiClient<Paginated<WHCycleCount>>(buildUrl('/api/v1/warehouse/cycle-counts', filters)),
  });
}

export function useCycleCount(id: string) {
  return useQuery({
    queryKey: warehouseKeys.cycleCount(id),
    queryFn: () =>
      apiClient<Single<WHCycleCount>>(`/api/v1/warehouse/cycle-counts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<WHCycleCount>>('/api/v1/warehouse/cycle-counts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCounts });
    },
  });
}

export function useStartCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WHCycleCount>>(`/api/v1/warehouse/cycle-counts/${id}/start`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCounts });
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCount(id) });
    },
  });
}

export function useSubmitCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, discrepancies }: { id: string; discrepancies: CycleCountDiscrepancy[] }) =>
      apiClient<Single<WHCycleCount>>(`/api/v1/warehouse/cycle-counts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ discrepancies }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCounts });
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCount(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
    },
  });
}

export function useApproveCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<WHCycleCount>>(`/api/v1/warehouse/cycle-counts/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCounts });
      void qc.invalidateQueries({ queryKey: warehouseKeys.cycleCount(id) });
      void qc.invalidateQueries({ queryKey: warehouseKeys.stockLots });
    },
  });
}
