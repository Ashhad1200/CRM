/**
 * Quality Control module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, generateId } from '@softcrm/shared-kernel';

import type {
  InspectionFilters,
  NcrFilters,
  CorrectiveActionFilters,
  PaginationInput,
  RecordResultInput,
} from './types.js';
import type {
  CreateInspectionTemplateInput,
  UpdateInspectionTemplateInput,
  CreateInspectionInput,
  CreateNcrInput,
  UpdateNcrInput,
  CreateCorrectiveActionInput,
  UpdateCorrectiveActionInput,
} from './validators.js';

// ── Prisma include fragments ───────────────────────────────────────────────────

const inspectionDetailInclude = {
  results: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: PaginationInput): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (pagination.page - 1) * pagination.limit;
  const orderBy = pagination.sortBy
    ? { [pagination.sortBy]: pagination.sortDir ?? 'asc' }
    : undefined;
  return { skip, take: pagination.limit, ...(orderBy ? { orderBy } : {}) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Inspection Templates ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a new inspection template. */
export async function createInspectionTemplate(
  tenantId: string,
  data: CreateInspectionTemplateInput & { createdBy: string },
) {
  const db = getPrismaClient();
  return db.inspectionTemplate.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      type: data.type as never,
      description: data.description ?? null,
      checklistItems: data.checklistItems as never,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
    },
  });
}

/** Find a single inspection template by ID. */
export async function findInspectionTemplate(tenantId: string, id: string) {
  const db = getPrismaClient();
  const template = await db.inspectionTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!template) throw new NotFoundError(`Inspection template ${id} not found`);
  return template;
}

/** Find inspection templates with filters and pagination. */
export async function findInspectionTemplates(
  tenantId: string,
  filters: { type?: string; isActive?: boolean },
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.type) where['type'] = filters.type;
  if (filters.isActive !== undefined) where['isActive'] = filters.isActive;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.inspectionTemplate.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.inspectionTemplate.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update an inspection template by ID (partial update). */
export async function updateInspectionTemplate(
  tenantId: string,
  id: string,
  data: UpdateInspectionTemplateInput,
) {
  const db = getPrismaClient();
  await findInspectionTemplate(tenantId, id);
  return db.inspectionTemplate.update({
    where: { id } as never,
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type as never }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.checklistItems !== undefined && {
        checklistItems: data.checklistItems as never,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    },
  });
}

/** Find an active template for a given type (used for auto-creation). */
export async function findActiveTemplateByType(
  tenantId: string,
  type: string,
): Promise<{ id: string; checklistItems: unknown } | null> {
  const db = getPrismaClient();
  return db.inspectionTemplate.findFirst({
    where: { tenantId, type: type as never, isActive: true },
    select: { id: true, checklistItems: true },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Inspections ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the next inspection number for a tenant (max + 1, formatted as QI-NNN). */
export async function getNextInspectionNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();
  const last = await db.inspection.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { inspectionNumber: true },
  });

  let nextNum = 1;
  if (last?.inspectionNumber) {
    const parts = last.inspectionNumber.split('-');
    const num = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `QI-${String(nextNum).padStart(3, '0')}`;
}

/** Create a new inspection. */
export async function createInspection(
  tenantId: string,
  data: CreateInspectionInput & {
    id: string;
    inspectionNumber: string;
    createdBy: string;
  },
) {
  const db = getPrismaClient();
  return db.inspection.create({
    data: {
      id: data.id,
      tenantId,
      templateId: data.templateId,
      inspectionNumber: data.inspectionNumber,
      type: data.type as never,
      referenceId: data.referenceId ?? null,
      referenceType: data.referenceType ?? null,
      productId: data.productId ?? null,
      lotNumber: data.lotNumber ?? null,
      batchSize: data.batchSize ?? null,
      sampledUnits: data.sampledUnits ?? null,
      status: 'PENDING' as never,
      inspectorId: data.inspectorId,
      scheduledDate: data.scheduledDate,
      conductedDate: null,
      overallResult: null,
      notes: data.notes ?? null,
      createdBy: data.createdBy,
      version: 1,
    },
    include: inspectionDetailInclude,
  });
}

/** Find a single inspection by ID with results. */
export async function findInspection(tenantId: string, id: string) {
  const db = getPrismaClient();
  const inspection = await db.inspection.findFirst({
    where: { id, tenantId },
    include: inspectionDetailInclude,
  });
  if (!inspection) throw new NotFoundError(`Inspection ${id} not found`);
  return inspection;
}

/** Find inspections with filters and pagination. */
export async function findInspections(
  tenantId: string,
  filters: InspectionFilters,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) where['status'] = filters.status;
  if (filters.type) where['type'] = filters.type;
  if (filters.productId) where['productId'] = filters.productId;
  if (filters.inspectorId) where['inspectorId'] = filters.inspectorId;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.inspection.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.inspection.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update an inspection by ID (partial update). */
export async function updateInspection(
  tenantId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const db = getPrismaClient();
  return db.inspection.update({
    where: { id, tenantId } as never,
    data: {
      ...data,
      version: { increment: 1 },
      updatedAt: new Date(),
    } as never,
    include: inspectionDetailInclude,
  });
}

/** Bulk-create inspection result items (replaces existing). */
export async function upsertInspectionResults(
  inspectionId: string,
  results: (RecordResultInput & { id: string; isPassing: boolean })[],
) {
  const db = getPrismaClient();

  // Delete existing results then insert fresh
  await db.inspectionResultItem.deleteMany({ where: { inspectionId } });

  await db.inspectionResultItem.createMany({
    data: results.map((r) => ({
      id: r.id,
      inspectionId,
      checklistItemId: r.checklistItemId,
      question: r.question,
      resultType: r.resultType as never,
      passFail: r.passFail ?? null,
      numericValue: r.numericValue ?? null,
      textValue: r.textValue ?? null,
      isPassing: r.isPassing,
      notes: r.notes ?? null,
    })),
  });

  return db.inspectionResultItem.findMany({ where: { inspectionId } });
}

/** Count inspections by tenant, optional status and date range. */
export async function countInspections(
  tenantId: string,
  filters: { status?: string; productId?: string; supplierId?: string },
) {
  const db = getPrismaClient();
  return db.inspection.count({
    where: {
      tenantId,
      ...(filters.status && { status: filters.status as never }),
      ...(filters.productId && { productId: filters.productId }),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Non-Conformance Reports ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the next NCR number for a tenant (formatted as NCR-NNN). */
export async function getNextNcrNumber(tenantId: string): Promise<string> {
  const db = getPrismaClient();
  const last = await db.nonConformanceReport.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { ncrNumber: true },
  });

  let nextNum = 1;
  if (last?.ncrNumber) {
    const parts = last.ncrNumber.split('-');
    const num = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `NCR-${String(nextNum).padStart(3, '0')}`;
}

/** Create a new NCR. */
export async function createNcr(
  tenantId: string,
  data: CreateNcrInput & {
    id: string;
    ncrNumber: string;
    detectedBy: string;
  },
) {
  const db = getPrismaClient();
  return db.nonConformanceReport.create({
    data: {
      id: data.id,
      tenantId,
      ncrNumber: data.ncrNumber,
      inspectionId: data.inspectionId ?? null,
      title: data.title,
      description: data.description,
      severity: data.severity as never,
      productId: data.productId ?? null,
      supplierId: data.supplierId ?? null,
      status: 'OPEN' as never,
      rootCause: data.rootCause ?? null,
      immediateAction: data.immediateAction ?? null,
      detectedBy: data.detectedBy,
      detectedAt: data.detectedAt ?? new Date(),
      version: 1,
    },
  });
}

/** Find a single NCR by ID. */
export async function findNcr(tenantId: string, id: string) {
  const db = getPrismaClient();
  const ncr = await db.nonConformanceReport.findFirst({
    where: { id, tenantId },
    include: { correctiveActions: true },
  });
  if (!ncr) throw new NotFoundError(`NCR ${id} not found`);
  return ncr;
}

/** Find NCRs with filters and pagination. */
export async function findNcrs(
  tenantId: string,
  filters: NcrFilters,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) where['status'] = filters.status;
  if (filters.severity) where['severity'] = filters.severity;
  if (filters.supplierId) where['supplierId'] = filters.supplierId;
  if (filters.productId) where['productId'] = filters.productId;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.nonConformanceReport.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.nonConformanceReport.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update an NCR by ID (partial update). */
export async function updateNcr(
  tenantId: string,
  id: string,
  data: UpdateNcrInput & Record<string, unknown>,
) {
  const db = getPrismaClient();
  return db.nonConformanceReport.update({
    where: { id, tenantId } as never,
    data: {
      ...data,
      version: { increment: 1 },
      updatedAt: new Date(),
    } as never,
  });
}

/** Count NCRs by tenant, optional filters. */
export async function countNcrs(
  tenantId: string,
  filters: { status?: string; supplierId?: string; severity?: string },
) {
  const db = getPrismaClient();
  return db.nonConformanceReport.count({
    where: {
      tenantId,
      ...(filters.status && { status: filters.status as never }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.severity && { severity: filters.severity as never }),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Corrective Actions ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a new corrective action on an NCR. */
export async function createCorrectiveAction(
  tenantId: string,
  ncrId: string,
  data: CreateCorrectiveActionInput & { createdBy: string },
) {
  const db = getPrismaClient();
  return db.correctiveAction.create({
    data: {
      id: generateId(),
      tenantId,
      ncrId,
      actionType: data.actionType as never,
      description: data.description,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      status: 'OPEN' as never,
      createdBy: data.createdBy,
    },
  });
}

/** Find a single corrective action by ID. */
export async function findCorrectiveAction(tenantId: string, id: string) {
  const db = getPrismaClient();
  const ca = await db.correctiveAction.findFirst({
    where: { id, tenantId },
  });
  if (!ca) throw new NotFoundError(`Corrective action ${id} not found`);
  return ca;
}

/** Find corrective actions for an NCR with filters and pagination. */
export async function findCorrectiveActions(
  tenantId: string,
  filters: CorrectiveActionFilters,
  pagination: PaginationInput,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) where['status'] = filters.status;
  if (filters.ncrId) where['ncrId'] = filters.ncrId;
  if (filters.assignedTo) where['assignedTo'] = filters.assignedTo;

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    db.correctiveAction.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { dueDate: 'asc' },
    }),
    db.correctiveAction.count({ where }),
  ]);

  return { data, total, page: pagination.page };
}

/** Update a corrective action by ID (partial update). */
export async function updateCorrectiveAction(
  tenantId: string,
  id: string,
  data: UpdateCorrectiveActionInput & Record<string, unknown>,
) {
  const db = getPrismaClient();
  return db.correctiveAction.update({
    where: { id, tenantId } as never,
    data: {
      ...data,
      updatedAt: new Date(),
    } as never,
  });
}

/** Count overdue corrective actions (due date past, not completed/verified). */
export async function countOverdueCorrectiveActions(tenantId: string) {
  const db = getPrismaClient();
  return db.correctiveAction.count({
    where: {
      tenantId,
      dueDate: { lt: new Date() },
      status: { notIn: ['COMPLETED', 'VERIFIED'] as never[] },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Supplier Quality Scores ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Upsert a supplier quality score for a given period. */
export async function upsertSupplierQualityScore(
  tenantId: string,
  supplierId: string,
  period: string,
  scoreData: {
    totalInspections: number;
    passedInspections: number;
    qualityScore: number;
    ncrCount: number;
  },
) {
  const db = getPrismaClient();
  return db.supplierQualityScore.upsert({
    where: {
      tenantId_supplierId_period: { tenantId, supplierId, period },
    } as never,
    create: {
      id: generateId(),
      tenantId,
      supplierId,
      period,
      totalInspections: scoreData.totalInspections,
      passedInspections: scoreData.passedInspections,
      qualityScore: scoreData.qualityScore,
      ncrCount: scoreData.ncrCount,
      calculatedAt: new Date(),
    },
    update: {
      totalInspections: scoreData.totalInspections,
      passedInspections: scoreData.passedInspections,
      qualityScore: scoreData.qualityScore,
      ncrCount: scoreData.ncrCount,
      calculatedAt: new Date(),
    },
  });
}

/** Find a supplier quality score record. */
export async function findSupplierQualityScore(
  tenantId: string,
  supplierId: string,
  period?: string,
) {
  const db = getPrismaClient();

  if (period) {
    return db.supplierQualityScore.findFirst({
      where: { tenantId, supplierId, period },
    });
  }

  return db.supplierQualityScore.findMany({
    where: { tenantId, supplierId },
    orderBy: { period: 'desc' },
  });
}

/** Count supplier inspections for a period (for score calculation). */
export async function countSupplierInspections(
  tenantId: string,
  supplierId: string,
  period: string,
): Promise<{ total: number; passed: number }> {
  const db = getPrismaClient();

  // Period is YYYY-MM, compute date range
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 1);

  const [total, passed] = await Promise.all([
    db.inspection.count({
      where: {
        tenantId,
        type: 'SUPPLIER' as never,
        referenceId: supplierId,
        conductedDate: { gte: start, lt: end },
      },
    }),
    db.inspection.count({
      where: {
        tenantId,
        type: 'SUPPLIER' as never,
        referenceId: supplierId,
        overallResult: 'PASS' as never,
        conductedDate: { gte: start, lt: end },
      },
    }),
  ]);

  return { total, passed };
}

/** Count NCRs for a supplier in a period. */
export async function countSupplierNcrs(
  tenantId: string,
  supplierId: string,
  period: string,
): Promise<number> {
  const db = getPrismaClient();

  const [year, month] = period.split('-').map(Number);
  const start = new Date(year!, month! - 1, 1);
  const end = new Date(year!, month!, 1);

  return db.nonConformanceReport.count({
    where: {
      tenantId,
      supplierId,
      detectedAt: { gte: start, lt: end },
    },
  });
}
