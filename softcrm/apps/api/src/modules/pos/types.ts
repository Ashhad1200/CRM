/**
 * POS module — domain types and hydrated entity interfaces.
 *
 * DecimalValue mirrors the type alias used across other modules so that
 * Prisma Decimal fields can be consumed without a direct @prisma/client import.
 */

export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Hydrated entity types ──────────────────────────────────────────────────────

export interface POSTerminalRow {
  id: string;
  tenantId: string;
  name: string;
  warehouseId: string | null;
  status: string;
  currentSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface POSSessionRow {
  id: string;
  tenantId: string;
  terminalId: string;
  cashierId: string;
  openedAt: Date;
  closedAt: Date | null;
  openingCash: DecimalValue;
  closingCash: DecimalValue | null;
  expectedCash: DecimalValue | null;
  variance: DecimalValue | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POSOrderLineRow {
  id: string;
  orderId: string;
  productId: string;
  description: string;
  quantity: DecimalValue;
  unitPrice: DecimalValue;
  discount: DecimalValue;
  taxRate: DecimalValue;
  lineTotal: DecimalValue;
  modifiers: unknown;
}

export interface POSPaymentRow {
  id: string;
  orderId: string;
  method: string;
  amount: DecimalValue;
  reference: string | null;
  processedAt: Date;
  status: string;
}

export interface POSOrderWithLines {
  id: string;
  tenantId: string;
  sessionId: string;
  orderNumber: string;
  status: string;
  subtotal: DecimalValue;
  taxAmount: DecimalValue;
  discountAmount: DecimalValue;
  total: DecimalValue;
  currency: string;
  customerId: string | null;
  loyaltyPointsEarned: number;
  notes: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
  lines: POSOrderLineRow[];
  payments: POSPaymentRow[];
}

export interface KitchenOrderItemRow {
  id: string;
  kitchenOrderId: string;
  orderLineId: string;
  productName: string;
  quantity: DecimalValue;
  course: string | null;
  modifiers: unknown;
  status: string;
  doneAt: Date | null;
}

export interface KitchenOrderWithItems {
  id: string;
  tenantId: string;
  orderId: string;
  tableId: string | null;
  ticketNumber: string;
  status: string;
  priority: number;
  notes: string | null;
  printedAt: Date | null;
  readyAt: Date | null;
  servedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: KitchenOrderItemRow[];
}

export interface RestaurantTableRow {
  id: string;
  tenantId: string;
  tableNumber: string;
  section: string | null;
  capacity: number;
  status: string;
  currentOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyProgramRow {
  id: string;
  tenantId: string;
  name: string;
  pointsPerCurrency: DecimalValue;
  pointsRedemptionRate: DecimalValue;
  minRedemption: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerLoyaltyRow {
  id: string;
  tenantId: string;
  customerId: string;
  points: number;
  lifetimePoints: number;
  updatedAt: Date;
}

// ── Session summary ────────────────────────────────────────────────────────────

export interface PaymentMethodBreakdown {
  method: string;
  total: number;
  count: number;
}

export interface SessionSummary {
  sessionId: string;
  terminalId: string;
  cashierId: string;
  openedAt: Date;
  closedAt: Date | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  totalSales: number;
  ordersCount: number;
  paidOrdersCount: number;
  refundedOrdersCount: number;
  paymentsByMethod: PaymentMethodBreakdown[];
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface POSOrderFilters {
  sessionId?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface KitchenOrderFilters {
  status?: string;
  tableId?: string;
  startDate?: string;
  endDate?: string;
}

export interface POSTerminalFilters {
  status?: string;
}

export interface RestaurantTableFilters {
  status?: string;
  section?: string;
}
