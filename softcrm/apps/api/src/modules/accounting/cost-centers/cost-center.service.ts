import { getPrismaClient } from '@softcrm/db';
import { generateId, NotFoundError } from '@softcrm/shared-kernel';

/**
 * List cost centers, optionally filtered by company.
 */
export async function getCostCenters(tenantId: string, companyId?: string) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (companyId) {
    where['companyId'] = companyId;
  }

  return db.costCenter.findMany({
    where,
    orderBy: { code: 'asc' },
    include: { children: true },
  });
}

/**
 * Create a new cost center.
 */
export async function createCostCenter(
  tenantId: string,
  data: {
    code: string;
    name: string;
    companyId: string;
    parentId?: string;
  },
) {
  const db = getPrismaClient();

  return db.costCenter.create({
    data: {
      id: generateId(),
      tenantId,
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      parentId: data.parentId ?? null,
    },
  });
}

/**
 * Update cost center name and/or active status.
 */
export async function updateCostCenter(
  tenantId: string,
  id: string,
  data: { name?: string; isActive?: boolean },
) {
  const db = getPrismaClient();

  const existing = await db.costCenter.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('CostCenter', id);
  }

  return db.costCenter.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

/**
 * Cost center report: aggregate expense-type accounts within a date range.
 * Groups by cost center codes matched via journal line descriptions.
 * Falls back to a summary of all expense accounts when no cost center match is found.
 */
export async function getCostCenterReport(
  tenantId: string,
  companyId: string,
  startDate: Date | string,
  endDate: Date | string,
) {
  const db = getPrismaClient();

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const costCenters = await db.costCenter.findMany({
    where: { tenantId, companyId },
    select: { id: true, code: true, name: true },
  });

  const expenseAccounts = await db.chartOfAccount.findMany({
    where: { tenantId, type: 'EXPENSE' },
    select: { id: true },
  });

  const expenseAccountIds = expenseAccounts.map((a) => a.id);

  const journalLines = await db.journalLine.findMany({
    where: {
      accountId: { in: expenseAccountIds },
      journalEntry: {
        tenantId,
        date: { gte: start, lte: end },
      },
    },
    select: {
      debit: true,
      credit: true,
      description: true,
    },
  });

  // Build cost center code lookup
  const costCenterMap = new Map(costCenters.map((cc) => [cc.code.toLowerCase(), cc]));

  // Aggregate by cost center (matching code in description)
  const totals = new Map<
    string,
    { totalDebit: number; totalCredit: number }
  >();

  // Initialize totals for each cost center
  for (const cc of costCenters) {
    totals.set(cc.id, { totalDebit: 0, totalCredit: 0 });
  }

  for (const line of journalLines) {
    const desc = (line.description ?? '').toLowerCase();
    let matched = false;

    for (const [code, cc] of costCenterMap) {
      if (desc.includes(code)) {
        const current = totals.get(cc.id)!;
        current.totalDebit += Number(line.debit);
        current.totalCredit += Number(line.credit);
        matched = true;
        break;
      }
    }

    // Unmatched lines go to an "Unassigned" bucket
    if (!matched) {
      const unassigned = totals.get('unassigned') ?? { totalDebit: 0, totalCredit: 0 };
      unassigned.totalDebit += Number(line.debit);
      unassigned.totalCredit += Number(line.credit);
      totals.set('unassigned', unassigned);
    }
  }

  const report = costCenters.map((cc) => {
    const t = totals.get(cc.id) ?? { totalDebit: 0, totalCredit: 0 };
    return {
      costCenterId: cc.id,
      name: cc.name,
      code: cc.code,
      totalDebit: t.totalDebit,
      totalCredit: t.totalCredit,
      netAmount: t.totalDebit - t.totalCredit,
    };
  });

  const unassigned = totals.get('unassigned');
  if (unassigned && (unassigned.totalDebit > 0 || unassigned.totalCredit > 0)) {
    report.push({
      costCenterId: 'unassigned',
      name: 'Unassigned',
      code: 'N/A',
      totalDebit: unassigned.totalDebit,
      totalCredit: unassigned.totalCredit,
      netAmount: unassigned.totalDebit - unassigned.totalCredit,
    });
  }

  return report;
}
