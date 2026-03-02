import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface SupplierRating {
  id: string;
  supplierId: string;
  poId?: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  overallScore: number;
  comments?: string;
  ratedBy: string;
  createdAt: string;
}

export interface SupplierScorecard {
  avgQuality: number;
  avgDelivery: number;
  avgPrice: number;
  avgOverall: number;
  totalRatings: number;
}

export interface RFQComparison {
  rfqId: string;
  rfqNumber: string;
  suppliers: {
    supplierId: string;
    supplierName: string;
    quotedPrice?: number;
    quotedLeadTimeDays?: number;
    notes?: string;
    responseReceivedAt?: string;
  }[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Supplier Ratings
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSupplierRatings(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-ratings', supplierId],
    queryFn: () =>
      apiClient<{ data: SupplierRating[] }>(
        `/api/v1/procurement/suppliers/${supplierId}/ratings`,
      ).then((r) => r.data),
    enabled: !!supplierId,
  });
}

export function useSupplierScorecard(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-scorecard', supplierId],
    queryFn: () =>
      apiClient<{ data: SupplierScorecard }>(
        `/api/v1/procurement/suppliers/${supplierId}/scorecard`,
      ).then((r) => r.data),
    enabled: !!supplierId,
  });
}

export function useRateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      ...data
    }: {
      supplierId: string;
      qualityScore: number;
      deliveryScore: number;
      priceScore: number;
      poId?: string;
      comments?: string;
    }) =>
      apiClient<{ data: SupplierRating }>(
        `/api/v1/procurement/suppliers/${supplierId}/rate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      ).then((r) => r.data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['supplier-ratings', vars.supplierId] });
      void qc.invalidateQueries({ queryKey: ['supplier-scorecard', vars.supplierId] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   RFQ Comparison
   ═══════════════════════════════════════════════════════════════════════════ */

export function useRFQComparison(rfqId?: string) {
  return useQuery({
    queryKey: ['rfq-comparison', rfqId],
    queryFn: () =>
      apiClient<{ data: RFQComparison }>(
        `/api/v1/procurement/rfqs/${rfqId}/comparison`,
      ).then((r) => r.data),
    enabled: !!rfqId,
  });
}

export function useRFQs() {
  return useQuery({
    queryKey: ['rfqs'],
    queryFn: () =>
      apiClient<{ data: { id: string; rfqNumber: string; status: string }[] }>(
        '/api/v1/procurement/rfqs',
      ).then((r) => r.data),
  });
}
