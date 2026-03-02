import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export type POSTerminalStatus = 'ONLINE' | 'OFFLINE' | 'CLOSED';
export type POSSessionStatus = 'OPEN' | 'CLOSED';
export type POSOrderStatus = 'OPEN' | 'PAID' | 'REFUNDED' | 'VOID';
export type POSPaymentMethod = 'CASH' | 'CARD' | 'MOBILE' | 'LOYALTY_POINTS' | 'SPLIT';
export type POSPaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type RestaurantTableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
export type KitchenOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED';

export interface POSTerminal {
  id: string;
  name: string;
  warehouseId?: string;
  status: POSTerminalStatus;
  currentSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POSSession {
  id: string;
  terminalId: string;
  cashierId: string;
  openedAt: string;
  closedAt?: string;
  openingCash: string;
  closingCash?: string;
  expectedCash?: string;
  variance?: string;
  status: POSSessionStatus;
  createdAt: string;
  updatedAt: string;
  terminal?: POSTerminal;
  orderCount?: number;
  totalSales?: string;
}

export interface POSOrderLine {
  id: string;
  orderId: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  lineTotal: string;
  modifiers: unknown[];
}

export interface POSPayment {
  id: string;
  orderId: string;
  method: POSPaymentMethod;
  amount: string;
  reference?: string;
  processedAt: string;
  status: POSPaymentStatus;
}

export interface POSOrder {
  id: string;
  sessionId: string;
  orderNumber: string;
  status: POSOrderStatus;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  currency: string;
  customerId?: string;
  loyaltyPointsEarned: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  lines?: POSOrderLine[];
  payments?: POSPayment[];
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  section?: string;
  capacity: number;
  status: RestaurantTableStatus;
  currentOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenOrder {
  id: string;
  orderId: string;
  tableId?: string;
  ticketNumber: string;
  status: KitchenOrderStatus;
  priority: number;
  notes?: string;
  printedAt?: string;
  readyAt?: string;
  servedAt?: string;
  createdAt: string;
  updatedAt: string;
  table?: RestaurantTable;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  pointsPerCurrency: string;
  pointsRedemptionRate: string;
  minRedemption: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLoyalty {
  id: string;
  customerId: string;
  points: number;
  lifetimePoints: number;
  updatedAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const posKeys = {
  terminals: ['pos', 'terminals'] as const,
  terminal: (id: string) => ['pos', 'terminals', id] as const,
  sessions: ['pos', 'sessions'] as const,
  session: (id: string) => ['pos', 'sessions', id] as const,
  orders: ['pos', 'orders'] as const,
  order: (id: string) => ['pos', 'orders', id] as const,
  tables: ['pos', 'tables'] as const,
  table: (id: string) => ['pos', 'tables', id] as const,
  kitchenOrders: ['pos', 'kitchen-orders'] as const,
  kitchenOrder: (id: string) => ['pos', 'kitchen-orders', id] as const,
  loyalty: ['pos', 'loyalty'] as const,
  customerLoyalty: (customerId: string) => ['pos', 'loyalty', customerId] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   POS Terminals (Registers/Locations)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useTerminals(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...posKeys.terminals, filters] as const,
    queryFn: () =>
      apiClient<Paginated<POSTerminal>>(buildUrl('/api/v1/pos/terminals', filters)),
  });
}

export function useTerminal(id: string) {
  return useQuery({
    queryKey: posKeys.terminal(id),
    queryFn: () =>
      apiClient<Single<POSTerminal>>(`/api/v1/pos/terminals/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<POSTerminal>>('/api/v1/pos/terminals', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.terminals });
    },
  });
}

export function useUpdateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<POSTerminal>>(`/api/v1/pos/terminals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.terminals });
      void qc.invalidateQueries({ queryKey: posKeys.terminal(vars.id) });
    },
  });
}

export function useDeleteTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/pos/terminals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.terminals });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   POS Sessions
   ═══════════════════════════════════════════════════════════════════════════ */

export function useSessions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...posKeys.sessions, filters] as const,
    queryFn: () =>
      apiClient<Paginated<POSSession>>(buildUrl('/api/v1/pos/sessions', filters)),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: posKeys.session(id),
    queryFn: () =>
      apiClient<Single<POSSession>>(`/api/v1/pos/sessions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { terminalId: string; openingCash: string }) =>
      apiClient<Single<POSSession>>('/api/v1/pos/sessions/open', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.sessions });
      void qc.invalidateQueries({ queryKey: posKeys.terminals });
    },
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closingCash }: { id: string; closingCash: string }) =>
      apiClient<Single<POSSession>>(`/api/v1/pos/sessions/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ closingCash }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.sessions });
      void qc.invalidateQueries({ queryKey: posKeys.session(vars.id) });
      void qc.invalidateQueries({ queryKey: posKeys.terminals });
    },
  });
}

export function useReconcileSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actualCash, notes }: { id: string; actualCash: string; notes?: string }) =>
      apiClient<Single<POSSession>>(`/api/v1/pos/sessions/${id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ actualCash, notes }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.sessions });
      void qc.invalidateQueries({ queryKey: posKeys.session(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   POS Orders (Transactions)
   ═══════════════════════════════════════════════════════════════════════════ */

export function useOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...posKeys.orders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<POSOrder>>(buildUrl('/api/v1/pos/orders', filters)),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: posKeys.order(id),
    queryFn: () =>
      apiClient<Single<POSOrder>>(`/api/v1/pos/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sessionId: string; customerId?: string; notes?: string }) =>
      apiClient<Single<POSOrder>>('/api/v1/pos/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.orders });
    },
  });
}

export function useAddOrderLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      ...data
    }: {
      orderId: string;
      productId: string;
      quantity: string;
      unitPrice: string;
      description: string;
      discount?: string;
      taxRate?: string;
      modifiers?: unknown[];
    }) =>
      apiClient<Single<POSOrderLine>>(`/api/v1/pos/orders/${orderId}/lines`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.order(vars.orderId) });
    },
  });
}

export function useRemoveOrderLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, lineId }: { orderId: string; lineId: string }) =>
      apiClient<void>(`/api/v1/pos/orders/${orderId}/lines/${lineId}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.order(vars.orderId) });
    },
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      ...data
    }: {
      orderId: string;
      method: POSPaymentMethod;
      amount: string;
      reference?: string;
    }) =>
      apiClient<Single<POSPayment>>(`/api/v1/pos/orders/${orderId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.order(vars.orderId) });
      void qc.invalidateQueries({ queryKey: posKeys.orders });
    },
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<POSOrder>>(`/api/v1/pos/orders/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.orders });
      void qc.invalidateQueries({ queryKey: posKeys.order(vars.id) });
    },
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<POSOrder>>(`/api/v1/pos/orders/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.orders });
      void qc.invalidateQueries({ queryKey: posKeys.order(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Restaurant Tables
   ═══════════════════════════════════════════════════════════════════════════ */

export function useTables(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...posKeys.tables, filters] as const,
    queryFn: () =>
      apiClient<Paginated<RestaurantTable>>(buildUrl('/api/v1/pos/tables', filters)),
  });
}

export function useTable(id: string) {
  return useQuery({
    queryKey: posKeys.table(id),
    queryFn: () =>
      apiClient<Single<RestaurantTable>>(`/api/v1/pos/tables/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { tableNumber: string; section?: string; capacity: number }) =>
      apiClient<Single<RestaurantTable>>('/api/v1/pos/tables', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
    },
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<RestaurantTable>>(`/api/v1/pos/tables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
      void qc.invalidateQueries({ queryKey: posKeys.table(vars.id) });
    },
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/pos/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
    },
  });
}

export function useOpenTableSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, guestCount }: { tableId: string; guestCount?: number }) =>
      apiClient<Single<RestaurantTable>>(`/api/v1/pos/tables/${tableId}/open`, {
        method: 'POST',
        body: JSON.stringify({ guestCount }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
      void qc.invalidateQueries({ queryKey: posKeys.table(vars.tableId) });
    },
  });
}

export function useTransferTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromTableId, toTableId }: { fromTableId: string; toTableId: string }) =>
      apiClient<Single<RestaurantTable>>(`/api/v1/pos/tables/${fromTableId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ toTableId }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
      void qc.invalidateQueries({ queryKey: posKeys.table(vars.fromTableId) });
      void qc.invalidateQueries({ queryKey: posKeys.table(vars.toTableId) });
    },
  });
}

export function useCloseTableSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) =>
      apiClient<Single<RestaurantTable>>(`/api/v1/pos/tables/${tableId}/close`, {
        method: 'POST',
      }),
    onSuccess: (_, tableId) => {
      void qc.invalidateQueries({ queryKey: posKeys.tables });
      void qc.invalidateQueries({ queryKey: posKeys.table(tableId) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Kitchen Orders
   ═══════════════════════════════════════════════════════════════════════════ */

export function useKitchenOrders(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...posKeys.kitchenOrders, filters] as const,
    queryFn: () =>
      apiClient<Paginated<KitchenOrder>>(buildUrl('/api/v1/pos/kitchen-orders', filters)),
  });
}

export function useKitchenOrder(id: string) {
  return useQuery({
    queryKey: posKeys.kitchenOrder(id),
    queryFn: () =>
      apiClient<Single<KitchenOrder>>(`/api/v1/pos/kitchen-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateKitchenOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KitchenOrderStatus }) =>
      apiClient<Single<KitchenOrder>>(`/api/v1/pos/kitchen-orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: posKeys.kitchenOrders });
      void qc.invalidateQueries({ queryKey: posKeys.kitchenOrder(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loyalty
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLoyaltyPrograms() {
  return useQuery({
    queryKey: posKeys.loyalty,
    queryFn: () => apiClient<Paginated<LoyaltyProgram>>('/api/v1/pos/loyalty/programs'),
  });
}

export function useCustomerLoyalty(customerId: string) {
  return useQuery({
    queryKey: posKeys.customerLoyalty(customerId),
    queryFn: () =>
      apiClient<Single<CustomerLoyalty>>(`/api/v1/pos/loyalty/customers/${customerId}`).then(
        (r) => r.data,
      ),
    enabled: !!customerId,
  });
}
