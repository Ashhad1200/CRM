/**
 * Manufacturing module — shared TypeScript types.
 *
 * Hydrated entity types returned from the repository and service layers.
 * These are independent of direct Prisma client imports.
 */

/** Prisma Decimal-compatible type alias. */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** BOM with all line items eagerly loaded. */
export interface BOMWithLines {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  bomVersion: string;
  isActive: boolean;
  totalCost: DecimalValue;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
  lines: Array<{
    id: string;
    bomId: string;
    componentProductId: string;
    description: string | null;
    quantity: DecimalValue;
    unit: string;
    unitCost: DecimalValue;
    lineTotal: DecimalValue;
  }>;
}

/** WorkOrder with related operations, consumptions and outputs. */
export interface WorkOrderWithRelations {
  id: string;
  tenantId: string;
  workOrderNumber: string;
  bomId: string;
  productId: string;
  plannedQuantity: DecimalValue;
  producedQuantity: DecimalValue;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  bom: {
    id: string;
    name: string;
    bomVersion: string;
  };
  operations: Array<{
    id: string;
    workOrderId: string;
    workCenterId: string;
    name: string;
    sequence: number;
    plannedHours: DecimalValue;
    actualHours: DecimalValue;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
  }>;
  materialConsumptions: Array<{
    id: string;
    workOrderId: string;
    componentProductId: string;
    plannedQty: DecimalValue;
    consumedQty: DecimalValue;
    unit: string;
    consumedAt: Date | null;
    consumedBy: string | null;
  }>;
  productionOutputs: Array<{
    id: string;
    workOrderId: string;
    productId: string;
    quantity: DecimalValue;
    unit: string;
    lotNumber: string | null;
    receivedAt: Date;
    receivedBy: string | null;
    warehouseLocationId: string | null;
  }>;
}

/** WorkCenter. */
export interface WorkCenterRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  capacity: DecimalValue;
  capacityUnit: string;
  costPerHour: DecimalValue;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** MRPRun. */
export interface MRPRunRecord {
  id: string;
  tenantId: string;
  runDate: Date;
  horizon: number;
  status: string;
  recommendations: unknown;
  createdAt: Date;
  createdBy: string | null;
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface BOMFilters {
  tenantId: string;
  productId?: string;
  isActive?: boolean;
  search?: string;
}

export interface WorkOrderFilters {
  tenantId: string;
  status?: string;
  productId?: string;
  bomId?: string;
}

// ── DTO types (service/route input) ───────────────────────────────────────────

export interface CreateBOMDto {
  productId: string;
  name: string;
  bomVersion?: string;
  isActive?: boolean;
  lines: Array<{
    componentProductId: string;
    description?: string;
    quantity: number;
    unit: string;
    unitCost?: number;
  }>;
}

export interface UpdateBOMDto {
  name?: string;
  bomVersion?: string;
  isActive?: boolean;
  totalCost?: number;
  version: number;
}

export interface CreateWorkCenterDto {
  name: string;
  description?: string;
  capacity?: number;
  capacityUnit?: string;
  costPerHour?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateWorkOrderDto {
  bomId: string;
  productId: string;
  plannedQuantity: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
}

export interface UpdateWorkOrderDto {
  plannedQuantity?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
  version: number;
}

export interface StartOperationDto {
  workCenterId: string;
  name: string;
  sequence: number;
  plannedHours: number;
}

export interface RecordMaterialConsumptionDto {
  componentProductId: string;
  plannedQty: number;
  consumedQty: number;
  unit: string;
}

export interface RecordProductionOutputDto {
  quantity: number;
  unit: string;
  lotNumber?: string;
  warehouseLocationId?: string;
}

export interface RunMRPDto {
  horizon?: number;
}

export interface ListQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}
