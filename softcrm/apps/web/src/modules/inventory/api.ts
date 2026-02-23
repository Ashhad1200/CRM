import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  unitPrice: string;
  cost: string;
  taxClass: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  reservedQty: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  fulfilled: boolean;
  product?: { id: string; sku: string; name: string };
}

export interface SalesOrder {
  id: string;
  tenantId: string;
  orderNumber: number;
  dealId?: string;
  contactId?: string;
  accountId?: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  lines: SalesOrderLine[];
}

export interface POLine {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  lineTotal: string;
  receivedQty: string;
  product?: { id: string; sku: string; name: string };
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: number;
  vendorName: string;
  status: string;
  approvalStatus: string;
  subtotal: string;
  total: string;
  approvedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  lines: POLine[];
}

export interface PriceBook {
  id: string;
  tenantId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
}

export interface PriceBookEntry {
  id: string;
  priceBookId: string;
  productId: string;
  price: string;
  product?: { id: string; sku: string; name: string };
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const inventoryKeys = {
  products: ['inventory', 'products'] as const,
  product: (id: string) => ['inventory', 'products', id] as const,
  warehouses: ['inventory', 'warehouses'] as const,
  salesOrders: ['inventory', 'sales-orders'] as const,
  salesOrder: (id: string) => ['inventory', 'sales-orders', id] as const,
  purchaseOrders: ['inventory', 'purchase-orders'] as const,
  purchaseOrder: (id: string) => ['inventory', 'purchase-orders', id] as const,
  priceBooks: ['inventory', 'price-books'] as const,
  stockLevels: (productId: string) => ['inventory', 'stock-levels', productId] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Products
   ═══════════════════════════════════════════════════════════════════════════ */

export function useProducts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...inventoryKeys.products, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Product>>(buildUrl('/api/v1/inventory/products', filters)),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: () =>
      apiClient<Single<Product>>(`/api/v1/inventory/products/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Product>>('/api/v1/inventory/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products });
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Single<Product>>(`/api/v1/inventory/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products });
      void qc.invalidateQueries({ queryKey: inventoryKeys.product(id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Warehouses
   ═══════════════════════════════════════════════════════════════════════════ */

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses,
    queryFn: () =>
      apiClient<Paginated<Warehouse>>('/api/v1/inventory/warehouses'),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Warehouse>>('/api/v1/inventory/warehouses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.warehouses });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Stock
   ═══════════════════════════════════════════════════════════════════════════ */

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<StockLevel>>('/api/v1/inventory/stock/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sales Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSalesOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...inventoryKeys.salesOrders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<SalesOrder>>(buildUrl('/api/v1/inventory/sales-orders', filters)),
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: inventoryKeys.salesOrder(id),
    queryFn: () =>
      apiClient<Single<SalesOrder>>(`/api/v1/inventory/sales-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useFulfillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<SalesOrder>>(`/api/v1/inventory/sales-orders/${id}/fulfill`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.salesOrders });
      void qc.invalidateQueries({ queryKey: inventoryKeys.salesOrder(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Purchase Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePurchaseOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...inventoryKeys.purchaseOrders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<PurchaseOrder>>(buildUrl('/api/v1/inventory/purchase-orders', filters)),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: inventoryKeys.purchaseOrder(id),
    queryFn: () =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/inventory/purchase-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<PurchaseOrder>>('/api/v1/inventory/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.purchaseOrders });
    },
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/inventory/purchase-orders/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: inventoryKeys.purchaseOrder(vars.id) });
    },
  });
}

export function useReceiveGoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiClient<Single<PurchaseOrder>>(`/api/v1/inventory/purchase-orders/${id}/receive`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.purchaseOrders });
      void qc.invalidateQueries({ queryKey: inventoryKeys.purchaseOrder(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Price Books
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePriceBooks() {
  return useQuery({
    queryKey: inventoryKeys.priceBooks,
    queryFn: () =>
      apiClient<Paginated<PriceBook>>('/api/v1/inventory/price-books'),
  });
}
