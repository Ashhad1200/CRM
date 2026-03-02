import { getPrismaClient } from '@softcrm/db';

/**
 * Consolidate Profit & Loss across multiple companies.
 * Aggregates journal lines by account type (REVENUE/EXPENSE) per company.
 */
export async function consolidateProfitAndLoss(
  tenantId: string,
  companyIds: string[],
  startDate: Date | string,
  endDate: Date | string,
) {
  const db = getPrismaClient();

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const companies = await db.company.findMany({
    where: { tenantId, id: { in: companyIds } },
    select: { id: true, name: true, code: true },
  });

  const revenueAccounts = await db.chartOfAccount.findMany({
    where: { tenantId, type: 'REVENUE' },
    select: { id: true, code: true, name: true },
  });

  const expenseAccounts = await db.chartOfAccount.findMany({
    where: { tenantId, type: 'EXPENSE' },
    select: { id: true, code: true, name: true },
  });

  const revenueAccountIds = revenueAccounts.map((a) => a.id);
  const expenseAccountIds = expenseAccounts.map((a) => a.id);

  const companyBreakdown = await Promise.all(
    companies.map(async (company) => {
      const journalLines = await db.journalLine.findMany({
        where: {
          accountId: { in: [...revenueAccountIds, ...expenseAccountIds] },
          journalEntry: {
            tenantId,
            date: { gte: start, lte: end },
          },
        },
        include: {
          account: { select: { id: true, type: true } },
        },
      });

      let totalRevenue = 0;
      let totalExpense = 0;

      for (const line of journalLines) {
        const amount = Number(line.credit) - Number(line.debit);
        if (line.account.type === 'REVENUE') {
          totalRevenue += amount;
        } else if (line.account.type === 'EXPENSE') {
          totalExpense += Number(line.debit) - Number(line.credit);
        }
      }

      return {
        companyId: company.id,
        companyName: company.name,
        companyCode: company.code,
        revenue: totalRevenue,
        expenses: totalExpense,
        netIncome: totalRevenue - totalExpense,
      };
    }),
  );

  const consolidated = {
    totalRevenue: companyBreakdown.reduce((sum, c) => sum + c.revenue, 0),
    totalExpenses: companyBreakdown.reduce((sum, c) => sum + c.expenses, 0),
    totalNetIncome: companyBreakdown.reduce((sum, c) => sum + c.netIncome, 0),
  };

  return {
    startDate: start,
    endDate: end,
    consolidated,
    companies: companyBreakdown,
  };
}

/**
 * Consolidate Balance Sheet across multiple companies.
 * Aggregates journal lines by account type (ASSET/LIABILITY/EQUITY) per company.
 */
export async function consolidateBalanceSheet(
  tenantId: string,
  companyIds: string[],
  asOfDate: Date | string,
) {
  const db = getPrismaClient();

  const asOf = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;

  const companies = await db.company.findMany({
    where: { tenantId, id: { in: companyIds } },
    select: { id: true, name: true, code: true },
  });

  const bsAccounts = await db.chartOfAccount.findMany({
    where: { tenantId, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
    select: { id: true, code: true, name: true, type: true },
  });

  const companyBreakdown = await Promise.all(
    companies.map(async (company) => {
      const journalLines = await db.journalLine.findMany({
        where: {
          accountId: { in: bsAccounts.map((a) => a.id) },
          journalEntry: {
            tenantId,
            date: { lte: asOf },
          },
        },
        include: {
          account: { select: { id: true, type: true } },
        },
      });

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      for (const line of journalLines) {
        const debit = Number(line.debit);
        const credit = Number(line.credit);

        if (line.account.type === 'ASSET') {
          totalAssets += debit - credit;
        } else if (line.account.type === 'LIABILITY') {
          totalLiabilities += credit - debit;
        } else if (line.account.type === 'EQUITY') {
          totalEquity += credit - debit;
        }
      }

      return {
        companyId: company.id,
        companyName: company.name,
        companyCode: company.code,
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
      };
    }),
  );

  const consolidated = {
    totalAssets: companyBreakdown.reduce((sum, c) => sum + c.assets, 0),
    totalLiabilities: companyBreakdown.reduce((sum, c) => sum + c.liabilities, 0),
    totalEquity: companyBreakdown.reduce((sum, c) => sum + c.equity, 0),
  };

  return {
    asOfDate: asOf,
    consolidated,
    companies: companyBreakdown,
  };
}
