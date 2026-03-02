/**
 * Quality Control module — service (business-logic layer).
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import {
  NotFoundError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';
import { logger } from '../../logger.js';

import type {
  InspectionFilters,
  NcrFilters,
  CorrectiveActionFilters,
  PaginationInput,
  RecordResultInput,
  QualitySummary,
} from './types.js';
import type {
  CreateInspectionTemplateInput,
  UpdateInspectionTemplateInput,
  CreateInspectionInput,
  CreateNcrInput,
  UpdateNcrInput,
  ResolveNcrInput,
  CreateCorrectiveActionInput,
  UpdateCorrectiveActionInput,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Inspection Templates ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new inspection template.
 */
export async function createInspectionTemplate(
  tenantId: string,
  data: CreateInspectionTemplateInput,
  actorId: string,
) {
  return repo.createInspectionTemplate(tenantId, {
    ...data,
    createdBy: actorId,
  });
}

/**
 * Update an inspection template.
 *
 * - Validates template exists and belongs to tenant.
 */
export async function updateInspectionTemplate(
  tenantId: string,
  id: string,
  data: UpdateInspectionTemplateInput,
) {
  return repo.updateInspectionTemplate(tenantId, id, data);
}

/**
 * List inspection templates with filters and pagination.
 */
export async function listInspectionTemplates(
  tenantId: string,
  filters: { type?: string; isActive?: boolean },
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findInspectionTemplates(
    tenantId,
    filters,
    pagination,
  );
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Inspections ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new inspection.
 *
 * - Validates the referenced template exists and belongs to tenant.
 * - Auto-assigns a sequential inspection number (QI-NNN).
 */
export async function createInspection(
  tenantId: string,
  data: CreateInspectionInput,
  actorId: string,
) {
  // Validate template exists and belongs to tenant
  await repo.findInspectionTemplate(tenantId, data.templateId);

  const inspectionId = generateId();
  const inspectionNumber = await repo.getNextInspectionNumber(tenantId);

  return repo.createInspection(tenantId, {
    ...data,
    id: inspectionId,
    inspectionNumber,
    createdBy: actorId,
  });
}

/**
 * Start an inspection (transitions PENDING → IN_PROGRESS).
 *
 * - Validates inspection is in PENDING status.
 */
export async function startInspection(
  tenantId: string,
  id: string,
  _actorId: string,
) {
  const inspection = await repo.findInspection(tenantId, id);

  if (inspection.status !== 'PENDING') {
    throw new ValidationError(
      `Inspection can only be started when PENDING; current status: ${inspection.status}`,
    );
  }

  return repo.updateInspection(tenantId, id, {
    status: 'IN_PROGRESS',
  });
}

/**
 * Record inspection results and determine overall pass/fail.
 *
 * - Validates inspection is IN_PROGRESS.
 * - Calculates isPassing for each result based on type and acceptable range.
 * - Determines overall pass/fail: all required items must pass.
 * - Updates inspection status to PASSED or FAILED.
 * - Emits INSPECTION_PASSED or INSPECTION_FAILED event.
 */
export async function recordResults(
  tenantId: string,
  inspectionId: string,
  results: RecordResultInput[],
  actorId: string,
  options?: { conductedDate?: Date; notes?: string },
) {
  const inspection = await repo.findInspection(tenantId, inspectionId);

  if (inspection.status !== 'IN_PROGRESS') {
    throw new ValidationError(
      `Results can only be recorded when IN_PROGRESS; current status: ${inspection.status}`,
    );
  }

  // Retrieve the template to get checklist item definitions
  const template = await repo.findInspectionTemplate(
    tenantId,
    inspection.templateId,
  );

  const checklistItems = template.checklistItems as Array<{
    id: string;
    required: boolean;
    acceptableRange?: { min?: number; max?: number };
  }>;

  // Build a lookup map for acceptable ranges
  const checklistMap = new Map(
    checklistItems.map((item) => [item.id, item]),
  );

  // Compute isPassing for each result
  const processedResults = results.map((r) => {
    const definition = checklistMap.get(r.checklistItemId);
    let isPassing = false;

    if (r.resultType === 'PASS_FAIL') {
      isPassing = r.passFail === true;
    } else if (r.resultType === 'NUMERIC') {
      const value = r.numericValue;
      const range = definition?.acceptableRange;

      if (value === undefined) {
        isPassing = false;
      } else if (range) {
        const aboveMin = range.min === undefined || value >= range.min;
        const belowMax = range.max === undefined || value <= range.max;
        isPassing = aboveMin && belowMax;
      } else {
        // No range defined — numeric result is always passing
        isPassing = true;
      }
    } else if (r.resultType === 'TEXT') {
      // Text results are always considered passing (informational)
      isPassing = true;
    }

    return { ...r, id: generateId(), isPassing };
  });

  // Persist the results
  await repo.upsertInspectionResults(inspectionId, processedResults);

  // Determine overall pass/fail
  // All required checklist items that have results must pass
  const requiredItemIds = new Set(
    checklistItems.filter((i) => i.required).map((i) => i.id),
  );

  let allRequiredPass = true;
  for (const result of processedResults) {
    if (requiredItemIds.has(result.checklistItemId) && !result.isPassing) {
      allRequiredPass = false;
      break;
    }
  }

  // Check coverage: all required items must have results
  const recordedIds = new Set(processedResults.map((r) => r.checklistItemId));
  for (const reqId of requiredItemIds) {
    if (!recordedIds.has(reqId)) {
      allRequiredPass = false;
      break;
    }
  }

  const overallResult: 'PASS' | 'FAIL' = allRequiredPass ? 'PASS' : 'FAIL';
  const newStatus = overallResult === 'PASS' ? 'PASSED' : 'FAILED';

  const updated = await repo.updateInspection(tenantId, inspectionId, {
    status: newStatus,
    overallResult,
    conductedDate: options?.conductedDate ?? new Date(),
    ...(options?.notes !== undefined && { notes: options.notes }),
  });

  // Emit domain event
  try {
    if (overallResult === 'PASS') {
      await events.publishInspectionPassed(tenantId, actorId, {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        type: inspection.type as string,
        productId: inspection.productId,
        referenceId: inspection.referenceId,
      });
    } else {
      await events.publishInspectionFailed(tenantId, actorId, {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        type: inspection.type as string,
        productId: inspection.productId,
        referenceId: inspection.referenceId,
      });
    }
  } catch (err) {
    logger.warn(
      { err, inspectionId },
      'Failed to publish inspection result event',
    );
  }

  return updated;
}

/**
 * Get a single inspection with its results.
 */
export async function getInspection(tenantId: string, id: string) {
  return repo.findInspection(tenantId, id);
}

/**
 * List inspections with filters and pagination.
 */
export async function listInspections(
  tenantId: string,
  filters: InspectionFilters,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findInspections(
    tenantId,
    filters,
    pagination,
  );
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Non-Conformance Reports ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new NCR.
 *
 * - Can be created from a failed inspection or manually.
 * - If inspectionId is provided, validates it exists and belongs to tenant.
 * - Auto-assigns a sequential NCR number (NCR-NNN).
 * - Emits NCR_CREATED event.
 */
export async function createNCR(
  tenantId: string,
  data: CreateNcrInput,
  actorId: string,
) {
  // Validate linked inspection exists if provided
  if (data.inspectionId) {
    const inspection = await repo.findInspection(tenantId, data.inspectionId);
    if (inspection.status !== 'FAILED') {
      throw new ValidationError(
        'An NCR can only be linked to a FAILED inspection',
      );
    }
  }

  const ncrId = generateId();
  const ncrNumber = await repo.getNextNcrNumber(tenantId);

  const ncr = await repo.createNcr(tenantId, {
    ...data,
    id: ncrId,
    ncrNumber,
    detectedBy: actorId,
  });

  // Emit event
  try {
    await events.publishNcrCreated(tenantId, actorId, {
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      severity: ncr.severity as string,
      title: ncr.title,
      inspectionId: ncr.inspectionId,
      supplierId: ncr.supplierId,
    });
  } catch (err) {
    logger.warn({ err, ncrId }, 'Failed to publish NCR created event');
  }

  return ncr;
}

/**
 * Update an NCR (title, description, severity, status).
 */
export async function updateNCR(
  tenantId: string,
  id: string,
  data: UpdateNcrInput,
) {
  // Validate exists
  await repo.findNcr(tenantId, id);
  return repo.updateNcr(tenantId, id, data);
}

/**
 * Resolve an NCR.
 *
 * - Validates NCR is OPEN or UNDER_REVIEW.
 * - Sets status to RESOLVED, records rootCause and immediateAction.
 * - Emits NCR_RESOLVED event.
 */
export async function resolveNCR(
  tenantId: string,
  id: string,
  data: ResolveNcrInput,
  actorId: string,
) {
  const ncr = await repo.findNcr(tenantId, id);

  if (ncr.status !== 'OPEN' && ncr.status !== 'UNDER_REVIEW') {
    throw new ValidationError(
      `NCR can only be resolved when OPEN or UNDER_REVIEW; current status: ${ncr.status}`,
    );
  }

  const updated = await repo.updateNcr(tenantId, id, {
    status: 'RESOLVED',
    rootCause: data.rootCause,
    immediateAction: data.immediateAction,
  });

  try {
    await events.publishNcrResolved(tenantId, actorId, {
      id: updated.id,
      ncrNumber: updated.ncrNumber,
      severity: updated.severity as string,
      title: updated.title,
    });
  } catch (err) {
    logger.warn({ err, ncrId: id }, 'Failed to publish NCR resolved event');
  }

  return updated;
}

/**
 * Close an NCR.
 *
 * - Validates NCR is RESOLVED.
 * - Sets status to CLOSED and records closedAt / closedBy.
 */
export async function closeNCR(
  tenantId: string,
  id: string,
  actorId: string,
) {
  const ncr = await repo.findNcr(tenantId, id);

  if (ncr.status !== 'RESOLVED') {
    throw new ValidationError(
      'NCR must be RESOLVED before it can be closed',
    );
  }

  return repo.updateNcr(tenantId, id, {
    status: 'CLOSED',
    closedAt: new Date(),
    closedBy: actorId,
  });
}

/**
 * List NCRs with filters and pagination.
 */
export async function listNCRs(
  tenantId: string,
  filters: NcrFilters,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findNcrs(
    tenantId,
    filters,
    pagination,
  );
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Corrective Actions ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a corrective action on an NCR.
 *
 * - Validates NCR exists and belongs to tenant.
 * - NCR must not be CLOSED.
 */
export async function createCorrectiveAction(
  tenantId: string,
  ncrId: string,
  data: CreateCorrectiveActionInput,
  actorId: string,
) {
  const ncr = await repo.findNcr(tenantId, ncrId);

  if (ncr.status === 'CLOSED') {
    throw new ValidationError(
      'Cannot add corrective actions to a CLOSED NCR',
    );
  }

  return repo.createCorrectiveAction(tenantId, ncrId, {
    ...data,
    createdBy: actorId,
  });
}

/**
 * Update a corrective action.
 */
export async function updateCorrectiveAction(
  tenantId: string,
  id: string,
  data: UpdateCorrectiveActionInput,
) {
  await repo.findCorrectiveAction(tenantId, id);
  return repo.updateCorrectiveAction(tenantId, id, data);
}

/**
 * Mark a corrective action as COMPLETED.
 *
 * - Validates CA is OPEN or IN_PROGRESS.
 */
export async function completeCorrectiveAction(
  tenantId: string,
  id: string,
  completedDate?: Date,
) {
  const ca = await repo.findCorrectiveAction(tenantId, id);

  if (ca.status !== 'OPEN' && ca.status !== 'IN_PROGRESS') {
    throw new ValidationError(
      `Corrective action can only be completed when OPEN or IN_PROGRESS; current status: ${ca.status}`,
    );
  }

  return repo.updateCorrectiveAction(tenantId, id, {
    status: 'COMPLETED',
    completedDate: completedDate ?? new Date(),
  });
}

/**
 * List corrective actions with filters and pagination.
 */
export async function listCorrectiveActions(
  tenantId: string,
  filters: CorrectiveActionFilters,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findCorrectiveActions(
    tenantId,
    filters,
    pagination,
  );
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Supplier Quality Scores ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate and store a supplier quality score for a given period.
 *
 * Score formula:
 *   qualityScore = (passedInspections / max(totalInspections, 1)) * 100
 *                 - (ncrCount * 5)
 *   Clamped to [0, 100].
 */
export async function calculateSupplierQualityScore(
  tenantId: string,
  supplierId: string,
  period: string,
) {
  const [inspectionCounts, ncrCount] = await Promise.all([
    repo.countSupplierInspections(tenantId, supplierId, period),
    repo.countSupplierNcrs(tenantId, supplierId, period),
  ]);

  const { total: totalInspections, passed: passedInspections } =
    inspectionCounts;

  const rawScore =
    (passedInspections / Math.max(totalInspections, 1)) * 100 -
    ncrCount * 5;

  const qualityScore = Math.min(100, Math.max(0, rawScore));

  return repo.upsertSupplierQualityScore(tenantId, supplierId, period, {
    totalInspections,
    passedInspections,
    qualityScore,
    ncrCount,
  });
}

/**
 * Get a supplier's quality score(s).
 *
 * - If period is provided, returns the score for that period.
 * - Otherwise returns all periods for the supplier, ordered by period desc.
 */
export async function getSupplierQualityScore(
  tenantId: string,
  supplierId: string,
  period?: string,
) {
  const result = await repo.findSupplierQualityScore(
    tenantId,
    supplierId,
    period,
  );
  if (!result) {
    throw new NotFoundError(
      `No quality score found for supplier ${supplierId}${period ? ` in period ${period}` : ''}`,
    );
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Quality Summary ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get an aggregate quality summary for a tenant.
 *
 * Returns:
 * - Total inspections (all statuses)
 * - Passed / failed counts and pass rate
 * - Open NCR count
 * - Critical NCR count
 * - Overdue CAPA count
 */
export async function getQualitySummary(
  tenantId: string,
): Promise<QualitySummary> {
  const [
    totalInspections,
    passedInspections,
    failedInspections,
    openNcrs,
    criticalNcrs,
    overdueCapas,
  ] = await Promise.all([
    repo.countInspections(tenantId, {}),
    repo.countInspections(tenantId, { status: 'PASSED' }),
    repo.countInspections(tenantId, { status: 'FAILED' }),
    repo.countNcrs(tenantId, { status: 'OPEN' }),
    repo.countNcrs(tenantId, { status: 'OPEN', severity: 'CRITICAL' }),
    repo.countOverdueCorrectiveActions(tenantId),
  ]);

  const passRate =
    totalInspections > 0 ? passedInspections / totalInspections : 0;

  return {
    totalInspections,
    passedInspections,
    failedInspections,
    passRate,
    openNcrs,
    criticalNcrs,
    overdueCapas,
  };
}
