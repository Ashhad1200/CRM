import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface PackOrder {
  id: string;
  warehouseId: string;
  pickListId?: string;
  shipmentId?: string;
  status: string;
  packedBy?: string;
  packedAt?: string;
  totalWeight?: number;
  boxCount: number;
  lines?: PackOrderLine[];
}

export interface PackOrderLine {
  id: string;
  productId: string;
  quantity: number;
  boxNumber: number;
}

export interface SerialNumber {
  id: string;
  productId: string;
  serialNumber: string;
  lotId?: string;
  warehouseId: string;
  locationId?: string;
  status: string;
  receivedAt: string;
  shippedAt?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pack Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePackOrders(warehouseId?: string, status?: string) {
  return useQuery({
    queryKey: ['pack-orders', warehouseId, status],
    queryFn: () =>
      apiClient<{ data: PackOrder[] }>(
        `/api/v1/warehouse/pack-orders?${warehouseId ? `warehouseId=${warehouseId}&` : ''}${status ? `status=${status}` : ''}`,
      ).then((r) => r.data),
  });
}

export function usePackOrder(id?: string) {
  return useQuery({
    queryKey: ['pack-order', id],
    queryFn: () =>
      apiClient<{ data: PackOrder }>(`/api/v1/warehouse/pack-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePackOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      warehouseId: string;
      pickListId?: string;
      shipmentId?: string;
      lines: { productId: string; quantity: number; boxNumber?: number }[];
    }) =>
      apiClient<{ data: PackOrder }>('/api/v1/warehouse/pack-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pack-orders'] });
    },
  });
}

export function useStartPacking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: PackOrder }>(`/api/v1/warehouse/pack-orders/${id}/start`, {
        method: 'POST',
      }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pack-orders'] });
    },
  });
}

export function useCompletePacking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; totalWeight?: number; boxCount?: number }) =>
      apiClient<{ data: PackOrder }>(`/api/v1/warehouse/pack-orders/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pack-orders'] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Serial Numbers
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSerials(productId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['serials', productId, warehouseId],
    queryFn: () =>
      apiClient<{ data: SerialNumber[] }>(
        `/api/v1/warehouse/serials?${productId ? `productId=${productId}&` : ''}${warehouseId ? `warehouseId=${warehouseId}` : ''}`,
      ).then((r) => r.data),
  });
}

export function useRegisterSerial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productId: string;
      serialNumber: string;
      lotId?: string;
      warehouseId: string;
      locationId?: string;
    }) =>
      apiClient<{ data: SerialNumber }>('/api/v1/warehouse/serials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['serials'] });
    },
  });
}
