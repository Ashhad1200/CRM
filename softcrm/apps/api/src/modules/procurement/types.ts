/**
 * Procurement module — TypeScript types.
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

export interface SupplierWithProducts {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: unknown;
  paymentTerms: string | null;
  currency: string;
  rating: DecimalValue | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  products: Array<{
    id: string;
    supplierId: string;
    productId: string;
    supplierSku: string | null;
    unitPrice: DecimalValue;
    minOrderQty: DecimalValue;
    leadTimeDays: number;
    isPreferred: boolean;
  }>;
}

export interface PurchaseRequisitionWithLines {
  id: string;
  tenantId: string;
  reqNumber: string;
  requestedBy: string;
  departmentId: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    requisitionId: string;
    productId: string;
    description: string;
    quantity: DecimalValue;
    estimatedUnitPrice: DecimalValue;
    requiredByDate: Date;
  }>;
}

export interface RFQWithSuppliers {
  id: string;
  tenantId: string;
  rfqNumber: string;
  requisitionId: string | null;
  status: string;
  validUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  suppliers: Array<{
    id: string;
    rfqId: string;
    supplierId: string;
    sentAt: Date | null;
    responseReceivedAt: Date | null;
    quotedPrice: DecimalValue | null;
    quotedLeadTimeDays: number | null;
    notes: string | null;
    supplier: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

export interface ProcurementPOWithLines {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  requisitionId: string | null;
  status: string;
  currency: string;
  subtotal: DecimalValue;
  taxAmount: DecimalValue;
  total: DecimalValue;
  expectedDeliveryDate: Date | null;
  approvalStatus: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  lines: Array<{
    id: string;
    poId: string;
    productId: string;
    description: string;
    quantity: DecimalValue;
    unitPrice: DecimalValue;
    taxRate: DecimalValue;
    lineTotal: DecimalValue;
    receivedQty: DecimalValue;
  }>;
}

export interface GoodsReceiptWithLines {
  id: string;
  tenantId: string;
  poId: string;
  receiptNumber: string;
  receivedBy: string;
  receivedAt: Date;
  warehouseId: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    receiptId: string;
    poLineId: string;
    productId: string;
    receivedQty: DecimalValue;
    lotNumber: string | null;
    notes: string | null;
  }>;
}

// ── Filter interfaces ──────────────────────────────────────────────────────────

export interface SupplierFilters {
  search?: string;
  status?: string;
}

export interface POFilters {
  status?: string;
  supplierId?: string;
  search?: string;
}

export interface RequisitionFilters {
  status?: string;
  requestedBy?: string;
}
