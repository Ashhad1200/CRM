/**
 * Inventory module — TypeScript types.
 *
 * Hydrated entity types for Prisma models with eagerly loaded relations,
 * plus filter interfaces used by the repository and service layers.
 */

/**
 * Prisma Decimal-compatible type.
 * At runtime values arrive as Prisma `Decimal` instances; this alias keeps the
 * types file independent of a direct `@prisma/client` import.
 */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** Product with stock levels and warehouse info eagerly loaded. */
export interface ProductWithStock {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description: string | null;
  unitPrice: DecimalValue;
  cost: DecimalValue;
  taxClass: string;
  categoryId: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  stockLevels: Array<{
    id: string;
    tenantId: string;
    productId: string;
    warehouseId: string;
    quantity: DecimalValue;
    reservedQty: DecimalValue;
    warehouse: {
      id: string;
      tenantId: string;
      name: string;
      address: unknown;
      isActive: boolean;
    };
  }>;
}

/** Sales order with line items and product info eagerly loaded. */
export interface SalesOrderWithLines {
  id: string;
  tenantId: string;
  orderNumber: number;
  dealId: string | null;
  contactId: string | null;
  accountId: string | null;
  status: string;
  notes: string | null;
  subtotal: DecimalValue;
  taxAmount: DecimalValue;
  total: DecimalValue;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    salesOrderId: string;
    productId: string;
    quantity: DecimalValue;
    unitPrice: DecimalValue;
    lineTotal: DecimalValue;
    fulfilled: boolean;
    product: {
      id: string;
      sku: string;
      name: string;
      cost: DecimalValue;
    };
  }>;
}

/** Purchase order with line items and product info eagerly loaded. */
export interface PurchaseOrderWithLines {
  id: string;
  tenantId: string;
  poNumber: number;
  vendorName: string;
  status: string;
  approvalStatus: string;
  notes: string | null;
  subtotal: DecimalValue;
  total: DecimalValue;
  orderedAt: Date | null;
  receivedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    purchaseOrderId: string;
    productId: string;
    quantity: DecimalValue;
    unitCost: DecimalValue;
    lineTotal: DecimalValue;
    receivedQty: DecimalValue;
    product: {
      id: string;
      sku: string;
      name: string;
    };
  }>;
}

// ── Filter interfaces ──────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  isActive?: boolean;
  categoryId?: string;
}

export interface OrderFilters {
  status?: string;
  dealId?: string;
  search?: string;
}

export interface POFilters {
  status?: string;
  vendorName?: string;
  search?: string;
}
