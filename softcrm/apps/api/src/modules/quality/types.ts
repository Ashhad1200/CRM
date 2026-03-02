/**
 * Quality Control module — TypeScript type definitions.
 *
 * Hydrated entity types for inspections, NCRs, corrective actions,
 * and supplier quality scores. These types mirror Prisma models with
 * eagerly-loaded relations.
 */

// ── Checklist item definition (stored as JSON in InspectionTemplate) ──────────

export interface ChecklistItem {
  id: string;
  question: string;
  type: 'PASS_FAIL' | 'NUMERIC' | 'TEXT';
  required: boolean;
  acceptableRange?: {
    min?: number;
    max?: number;
  };
}

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** Inspection template with its checklist items. */
export interface InspectionTemplateItem {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  description: string | null;
  checklistItems: ChecklistItem[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Single result recorded for one checklist item on an inspection. */
export interface InspectionResultItem {
  id: string;
  inspectionId: string;
  checklistItemId: string;
  question: string;
  resultType: string;
  passFail: boolean | null;
  numericValue: number | null;
  textValue: string | null;
  isPassing: boolean;
  notes: string | null;
}

/** Inspection with its result items eagerly loaded. */
export interface InspectionWithResults {
  id: string;
  tenantId: string;
  templateId: string;
  inspectionNumber: string;
  type: string;
  referenceId: string | null;
  referenceType: string | null;
  productId: string | null;
  lotNumber: string | null;
  batchSize: number | null;
  sampledUnits: number | null;
  status: string;
  inspectorId: string;
  scheduledDate: Date;
  conductedDate: Date | null;
  overallResult: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  results: InspectionResultItem[];
}

/** Non-conformance report. */
export interface NcrItem {
  id: string;
  tenantId: string;
  ncrNumber: string;
  inspectionId: string | null;
  title: string;
  description: string;
  severity: string;
  productId: string | null;
  supplierId: string | null;
  status: string;
  rootCause: string | null;
  immediateAction: string | null;
  detectedBy: string;
  detectedAt: Date;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** Corrective action for an NCR. */
export interface CorrectiveActionItem {
  id: string;
  tenantId: string;
  ncrId: string;
  actionType: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate: Date | null;
  status: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Supplier quality score for a given period. */
export interface SupplierQualityScoreItem {
  id: string;
  tenantId: string;
  supplierId: string;
  period: string;
  totalInspections: number;
  passedInspections: number;
  qualityScore: number;
  ncrCount: number;
  calculatedAt: Date;
}

/** Aggregate quality summary for a tenant. */
export interface QualitySummary {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  passRate: number;
  openNcrs: number;
  criticalNcrs: number;
  overdueCapas: number;
}

// ── Filter & pagination types ──────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Filter parameters for inspection listing. */
export interface InspectionFilters {
  status?: string;
  type?: string;
  productId?: string;
  inspectorId?: string;
}

/** Filter parameters for NCR listing. */
export interface NcrFilters {
  status?: string;
  severity?: string;
  supplierId?: string;
  productId?: string;
}

/** Filter parameters for corrective action listing. */
export interface CorrectiveActionFilters {
  status?: string;
  ncrId?: string;
  assignedTo?: string;
}

/** Input shape for recording inspection results. */
export interface RecordResultInput {
  checklistItemId: string;
  question: string;
  resultType: 'PASS_FAIL' | 'NUMERIC' | 'TEXT';
  passFail?: boolean;
  numericValue?: number;
  textValue?: string;
  notes?: string;
}
