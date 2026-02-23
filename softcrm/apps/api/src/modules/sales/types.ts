/**
 * Prisma Decimal-compatible type.
 * At runtime values arrive as Prisma `Decimal` instances; this alias keeps the
 * types file independent of a direct `@prisma/client` import.
 */
export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Hydrated entity types ──────────────────────────────────────────────────────

/** Deal with all related entities eagerly loaded. */
export interface DealWithRelations {
  id: string;
  tenantId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  value: DecimalValue;
  currency: string;
  probability: number;
  weightedValue: DecimalValue;
  expectedCloseDate: Date | null;
  ownerId: string | null;
  accountId: string | null;
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  pipeline: {
    id: string;
    tenantId: string;
    name: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
  };
  stage: {
    id: string;
    pipelineId: string;
    name: string;
    order: number;
    probability: number;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  account: {
    id: string;
    tenantId: string;
    name: string;
    industry: string | null;
    website: string | null;
  } | null;
  contacts: Array<{
    id: string;
    dealId: string;
    contactId: string;
    role: string | null;
    isPrimary: boolean;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      emails: string[];
      company: string | null;
    };
  }>;
  quotes: Array<{
    id: string;
    quoteNumber: number;
    title: string | null;
    total: DecimalValue;
    status: string;
    createdAt: Date;
  }>;
}

/** Pipeline with its stages ordered by position. */
export interface PipelineWithStages {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  stages: Array<{
    id: string;
    pipelineId: string;
    name: string;
    order: number;
    probability: number;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

/** Quote with all line items. */
export interface QuoteWithLines {
  id: string;
  tenantId: string;
  dealId: string;
  quoteNumber: number;
  title: string | null;
  subtotal: DecimalValue;
  taxAmount: DecimalValue;
  discountAmount: DecimalValue;
  total: DecimalValue;
  currency: string;
  status: string;
  approvalStatus: string;
  validUntil: Date | null;
  notes: string | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  lines: Array<{
    id: string;
    quoteId: string;
    productId: string | null;
    description: string;
    quantity: DecimalValue;
    unitPrice: DecimalValue;
    discount: DecimalValue;
    taxRate: DecimalValue;
    lineTotal: DecimalValue;
  }>;
}

// ── Operation result types ─────────────────────────────────────────────────────

/** Returned after successfully converting a lead. */
export interface LeadConversionResult {
  leadId: string;
  contactId: string;
  accountId: string | null;
  dealId: string | null;
}

// ── Filter types ───────────────────────────────────────────────────────────────

export interface ContactFilters {
  tenantId: string;
  search?: string;
  lifecycleStage?: string;
  ownerId?: string;
  accountId?: string;
}

export interface LeadFilters {
  tenantId: string;
  search?: string;
  status?: string;
  source?: string;
  assignedOwnerId?: string;
}

export interface DealFilters {
  tenantId: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  accountId?: string;
  search?: string;
}

// ── Assignment types ───────────────────────────────────────────────────────────

/** Result of round-robin or rule-based owner assignment. */
export interface AssignmentResult {
  ownerId: string;
  teamId?: string;
}
