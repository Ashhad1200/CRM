import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
export type RequisitionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PO_CREATED';
export type POStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
  paymentTerms?: string;
  currency: Currency;
  rating?: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  products?: SupplierProduct[];
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierSku?: string;
  unitPrice: string;
  minOrderQty: string;
  leadTimeDays: number;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequisitionLine {
  id: string;
  requisitionId: string;
  productId: string;
  description: string;
  quantity: string;
  estimatedUnitPrice: string;
  requiredByDate: string;
}

export interface PurchaseRequisition {
  id: string;
  tenantId: string;
  reqNumber: string;
  requestedBy: string;
  departmentId?: string;
  status: RequisitionStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  lines: PurchaseRequisitionLine[];
}

export interface POLine {
  id: string;
  poId: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
  receivedQty: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  requisitionId?: string;
  status: POStatus;
  currency: Currency;
  subtotal: string;
  taxAmount: string;
  total: string;
  expectedDeliveryDate?: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  lines: POLine[];
  supplier?: Supplier;
}

export interface GoodsReceiptLine {
  id: string;
  receiptId: string;
  poLineId: string;
  productId: string;
  receivedQty: string;
  lotNumber?: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  tenantId: string;
  poId: string;
  receiptNumber: string;
  receivedBy: string;
  receivedAt: string;
  warehouseId?: string;
  notes?: string;
  status: GoodsReceiptStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lines: GoodsReceiptLine[];
  purchaseOrder?: PurchaseOrder;
}

export interface VendorInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  supplierId: string;
  poId?: string;
  goodsReceiptId?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: Currency;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  matchStatus: 'UNMATCHED' | 'PARTIAL' | 'MATCHED';
  createdAt: string;
  updatedAt: string;
  version: number;
  supplier?: Supplier;
  purchaseOrder?: PurchaseOrder;
  goodsReceipt?: GoodsReceipt;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const procurementKeys = {
  suppliers: ['procurement', 'suppliers'] as const,
  supplier: (id: string) => ['procurement', 'suppliers', id] as const,
  supplierProducts: (supplierId: string) => ['procurement', 'suppliers', supplierId, 'products'] as const,
  requisitions: ['procurement', 'requisitions'] as const,
  requisition: (id: string) => ['procurement', 'requisitions', id] as const,
  purchaseOrders: ['procurement', 'purchase-orders'] as const,
  purchaseOrder: (id: string) => ['procurement', 'purchase-orders', id] as const,
  goodsReceipts: ['procurement', 'goods-receipts'] as const,
  goodsReceipt: (id: string) => ['procurement', 'goods-receipts', id] as const,
  invoices: ['procurement', 'invoices'] as const,
  invoice: (id: string) => ['procurement', 'invoices', id] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Suppliers (Vendors)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSuppliers(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...procurementKeys.suppliers, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Supplier>>(buildUrl('/api/v1/procurement/suppliers', filters)),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: procurementKeys.supplier(id),
    queryFn: () =>
      apiClient<Single<Supplier>>(`/api/v1/procurement/suppliers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Supplier>>('/api/v1/procurement/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.suppliers });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Supplier>>(`/api/v1/procurement/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.suppliers });
      void qc.invalidateQueries({ queryKey: procurementKeys.supplier(vars.id) });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<void>(`/api/v1/procurement/suppliers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.suppliers });
    },
  });
}

/* ───────── Supplier Products (Nested) ───────── */

export function useSupplierProducts(supplierId: string) {
  return useQuery({
    queryKey: procurementKeys.supplierProducts(supplierId),
    queryFn: () =>
      apiClient<Paginated<SupplierProduct>>(`/api/v1/procurement/suppliers/${supplierId}/products`),
    enabled: !!supplierId,
  });
}

export function useAddSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, ...data }: { supplierId: string } & Record<string, unknown>) =>
      apiClient<Single<SupplierProduct>>(`/api/v1/procurement/suppliers/${supplierId}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.supplierProducts(vars.supplierId) });
      void qc.invalidateQueries({ queryKey: procurementKeys.supplier(vars.supplierId) });
    },
  });
}

export function useRemoveSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, productId }: { supplierId: string; productId: string }) =>
      apiClient<void>(`/api/v1/procurement/suppliers/${supplierId}/products/${productId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.supplierProducts(vars.supplierId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Purchase Requisitions
   ═══════════════════════════════════════════════════════════════════════════ */

export function useRequisitions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...procurementKeys.requisitions, filters] as const,
    queryFn: () =>
      apiClient<Paginated<PurchaseRequisition>>(buildUrl('/api/v1/procurement/requisitions', filters)),
  });
}

export function useRequisition(id: string) {
  return useQuery({
    queryKey: procurementKeys.requisition(id),
    queryFn: () =>
      apiClient<Single<PurchaseRequisition>>(`/api/v1/procurement/requisitions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<PurchaseRequisition>>('/api/v1/procurement/requisitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
    },
  });
}

export function useUpdateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<PurchaseRequisition>>(`/api/v1/procurement/requisitions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisition(vars.id) });
    },
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseRequisition>>(`/api/v1/procurement/requisitions/${id}/submit`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisition(vars.id) });
    },
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseRequisition>>(`/api/v1/procurement/requisitions/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisition(vars.id) });
    },
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<PurchaseRequisition>>(`/api/v1/procurement/requisitions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisition(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Purchase Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePurchaseOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...procurementKeys.purchaseOrders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<PurchaseOrder>>(buildUrl('/api/v1/procurement/purchase-orders', filters)),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: procurementKeys.purchaseOrder(id),
    queryFn: () =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/purchase-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<PurchaseOrder>>('/api/v1/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
    },
  });
}

export function useCreatePOFromRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requisitionId, ...data }: { requisitionId: string } & Record<string, unknown>) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/requisitions/${requisitionId}/create-po`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisitions });
      void qc.invalidateQueries({ queryKey: procurementKeys.requisition(vars.requisitionId) });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/purchase-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrder(vars.id) });
    },
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/purchase-orders/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrder(vars.id) });
    },
  });
}

export function useSendPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/purchase-orders/${id}/send`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrder(vars.id) });
    },
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/procurement/purchase-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrder(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Goods Receipts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useGoodsReceipts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...procurementKeys.goodsReceipts, filters] as const,
    queryFn: () =>
      apiClient<Paginated<GoodsReceipt>>(buildUrl('/api/v1/procurement/goods-receipts', filters)),
  });
}

export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: procurementKeys.goodsReceipt(id),
    queryFn: () =>
      apiClient<Single<GoodsReceipt>>(`/api/v1/procurement/goods-receipts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<GoodsReceipt>>('/api/v1/procurement/goods-receipts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.goodsReceipts });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
    },
  });
}

export function useConfirmGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<GoodsReceipt>>(`/api/v1/procurement/goods-receipts/${id}/confirm`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.goodsReceipts });
      void qc.invalidateQueries({ queryKey: procurementKeys.goodsReceipt(vars.id) });
      void qc.invalidateQueries({ queryKey: procurementKeys.purchaseOrders });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Vendor Invoices
   ═══════════════════════════════════════════════════════════════════════════ */

export function useVendorInvoices(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...procurementKeys.invoices, filters] as const,
    queryFn: () =>
      apiClient<Paginated<VendorInvoice>>(buildUrl('/api/v1/procurement/invoices', filters)),
  });
}

export function useVendorInvoice(id: string) {
  return useQuery({
    queryKey: procurementKeys.invoice(id),
    queryFn: () =>
      apiClient<Single<VendorInvoice>>(`/api/v1/procurement/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<VendorInvoice>>('/api/v1/procurement/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementKeys.invoices });
    },
  });
}

export function useMatchInvoiceToReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, goodsReceiptId }: { invoiceId: string; goodsReceiptId: string }) =>
      apiClient<Single<VendorInvoice>>(`/api/v1/procurement/invoices/${invoiceId}/match`, {
        method: 'POST',
        body: JSON.stringify({ goodsReceiptId }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.invoices });
      void qc.invalidateQueries({ queryKey: procurementKeys.invoice(vars.invoiceId) });
    },
  });
}

export function useApproveVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<VendorInvoice>>(`/api/v1/procurement/invoices/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: procurementKeys.invoices });
      void qc.invalidateQueries({ queryKey: procurementKeys.invoice(vars.id) });
    },
  });
}
