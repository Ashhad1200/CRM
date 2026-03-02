/**
 * Warehouse / WMS module — TypeScript types.
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

// ── Enum string literals ───────────────────────────────────────────────────────

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';
export type LocationType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'SHIPPING' | 'QUARANTINE';
export type StockLotStatus = 'AVAILABLE' | 'RESERVED' | 'QUARANTINE' | 'EXPIRED';
export type StockMoveType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT' | 'RETURN';
export type StockMoveStatus = 'DRAFT' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
export type PickListStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PickListLineStatus = 'PENDING' | 'PARTIAL' | 'DONE';
export type ShipmentStatus = 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
export type CycleCountStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

// ── Hydrated entity types ──────────────────────────────────────────────────────

export interface WarehouseRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: unknown;
  isDefault: boolean;
  status: WarehouseStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface LocationRecord {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  code: string;
  type: LocationType;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  bin: string | null;
  maxCapacity: DecimalValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockLotRecord {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  locationId: string | null;
  lotNumber: string;
  serialNumber: string | null;
  quantity: DecimalValue;
  reservedQty: DecimalValue;
  expiryDate: Date | null;
  receivedAt: Date;
  status: StockLotStatus;
}

export interface StockMoveRecord {
  id: string;
  tenantId: string;
  reference: string;
  moveType: StockMoveType;
  productId: string;
  warehouseId: string;
  lotId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  plannedQty: DecimalValue;
  doneQty: DecimalValue;
  status: StockMoveStatus;
  sourceDocument: string | null;
  scheduledDate: Date;
  doneDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
}

export interface PickListWithLines {
  id: string;
  tenantId: string;
  warehouseId: string;
  sourceOrderId: string | null;
  sourceOrderType: string | null;
  status: PickListStatus;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
  lines: Array<{
    id: string;
    pickListId: string;
    productId: string;
    locationId: string;
    lotId: string | null;
    requestedQty: DecimalValue;
    pickedQty: DecimalValue;
    status: PickListLineStatus;
  }>;
}

export interface ShipmentRecord {
  id: string;
  tenantId: string;
  warehouseId: string;
  pickListId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  estimatedDelivery: Date | null;
  status: ShipmentStatus;
  recipientName: string;
  recipientAddress: unknown;
  weight: DecimalValue | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CycleCountRecord {
  id: string;
  tenantId: string;
  warehouseId: string;
  locationId: string | null;
  status: CycleCountStatus;
  countedBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  discrepancies: unknown;
  createdAt: Date;
  createdBy: string | null;
}

// ── Aggregated stock level type ────────────────────────────────────────────────

export interface StockLevelSummary {
  productId: string;
  warehouseId: string;
  locationId: string | null;
  availableQty: number;
  reservedQty: number;
  totalQty: number;
}

// ── Filter interfaces ──────────────────────────────────────────────────────────

export interface WarehouseFilters {
  status?: WarehouseStatus;
  search?: string;
}

export interface LocationFilters {
  type?: LocationType;
  zone?: string;
}

export interface StockLotFilters {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  status?: StockLotStatus;
}

export interface StockLevelFilters {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
}

export interface StockMoveFilters {
  moveType?: StockMoveType;
  status?: StockMoveStatus;
  productId?: string;
}

export interface PickListFilters {
  status?: PickListStatus;
  warehouseId?: string;
  assignedTo?: string;
}

export interface ShipmentFilters {
  status?: ShipmentStatus;
  warehouseId?: string;
}

export interface CycleCountFilters {
  status?: CycleCountStatus;
  warehouseId?: string;
}

// ── Cycle count discrepancy ────────────────────────────────────────────────────

export interface CycleCountDiscrepancy {
  productId: string;
  lotId: string | null;
  systemQty: number;
  countedQty: number;
  difference: number;
}
