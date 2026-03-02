import { getPrismaClient } from '@softcrm/db';
import { generateId, NotFoundError } from '@softcrm/shared-kernel';

/**
 * List budgets, optionally filtered by company.
 */
export async function getBudgets(tenantId: string, companyId?: string) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (companyId) {
    where['companyId'] = companyId;
  }

  return db.budget.findMany({
    where,
    orderBy: [{ year: 'desc' }, { name: 'asc' }],
  });
}

/**
 * Get a single budget with its lines.
 */
export async function getBudget(tenantId: string, budgetId: string) {
  const db = getPrismaClient();

  const budget = await db.budget.findFirst({
    where: { id: budgetId, tenantId },
    include: { lines: true },
  });

  if (!budget) {
    throw new NotFoundError('Budget', budgetId);
  }
  return budget;
}

/**
 * Create a new budget.
 */
export async function createBudget(
  tenantId: string,
  data: {
    name: string;
    year: number;
    period?: string;
    companyId: string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  const id = generateId();

  return db.budget.create({
    data: {
      id,
      tenantId,
      companyId: data.companyId,
      name: data.name,
      year: data.year,
      ...(data.period ? { period: data.period as never } : {}),
      createdBy: actorId,
    },
  });
}

/**
 * Upsert budget lines using deleteMany + createMany pattern.
 */
export async function updateBudgetLines(
  tenantId: string,
  budgetId: string,
  lines: Array<{ accountId: string; month: number; amount: number }>,
) {
  const db = getPrismaClient();

  const budget = await db.budget.findFirst({
    where: { id: budgetId, tenantId },
  });

  if (!budget) {
    throw new NotFoundError('Budget', budgetId);
  }

  return db.$transaction(async (tx) => {
    await tx.budgetLine.deleteMany({
      where: { budgetId },
    });

    await tx.budgetLine.createMany({
      data: lines.map((line) => ({
        id: generateId(),
        budgetId,
        accountId: line.accountId,
        month: line.month,
        amount: line.amount,
      })),
    });

    return tx.budget.findFirstOrThrow({
      where: { id: budgetId },
      include: { lines: true },
    });
  });
}

/**
 * Compare budget lines vs actual journal entries for the same accounts/period.
 * Returns variance report per account.
 */
export async function getBudgetVariance(
  tenantId: string,
  budgetId: string,
  month?: number,
) {
  const db = getPrismaClient();

  const budget = await db.budget.findFirst({
    where: { id: budgetId, tenantId },
    include: { lines: true },
  });

  if (!budget) {
    throw new NotFoundError('Budget', budgetId);
  }

  const filteredLines = month
    ? budget.lines.filter((l) => l.month === month)
    : budget.lines;

  // Group budget amounts by accountId
  const budgetByAccount = new Map<string, number>();
  for (const line of filteredLines) {
    const current = budgetByAccount.get(line.accountId) ?? 0;
    budgetByAccount.set(line.accountId, current + Number(line.amount));
  }

  const accountIds = Array.from(budgetByAccount.keys());

  // Fetch account details
  const accounts = await db.chartOfAccount.findMany({
    where: { tenantId, id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Determine date range from budget year and months
  const months = month
    ? [month]
    : [...new Set(filteredLines.map((l) => l.month))].sort((a, b) => a - b);

  const startMonth = Math.min(...months);
  const endMonth = Math.max(...months);
  const startDate = new Date(budget.year, startMonth - 1, 1);
  const endDate = new Date(budget.year, endMonth, 0); // last day of end month

  // Aggregate actual journal lines for these accounts
  const journalLines = await db.journalLine.findMany({
    where: {
      accountId: { in: accountIds },
      journalEntry: {
        tenantId,
        date: { gte: startDate, lte: endDate },
      },
    },
    select: { accountId: true, debit: true, credit: true },
  });

  const actualByAccount = new Map<string, number>();
  for (const line of journalLines) {
    const current = actualByAccount.get(line.accountId) ?? 0;
    const account = accountMap.get(line.accountId);
    let amount: number;
    if (account?.type === 'ASSET' || account?.type === 'EXPENSE') {
      amount = Number(line.debit) - Number(line.credit);
    } else {
      amount = Number(line.credit) - Number(line.debit);
    }
    actualByAccount.set(line.accountId, current + amount);
  }

  return accountIds.map((accountId) => {
    const account = accountMap.get(accountId);
    const budgeted = budgetByAccount.get(accountId) ?? 0;
    const actual = actualByAccount.get(accountId) ?? 0;
    const variance = actual - budgeted;
    const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

    return {
      accountId,
      accountName: account?.name ?? '',
      budgeted,
      actual,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
    };
  });
}
