import * as repo from '../repository.js';
import type { TrialBalanceResult, TrialBalanceRow } from '../types.js';

/**
 * Trial-balance service.
 * Generates a period-scoped trial balance from the general ledger.
 */

/**
 * Generate a trial balance for the given year/month.
 *
 * For every account that has activity in the period the report sums all
 * debit and credit journal-line amounts and returns them as rows.
 * The result includes a top-level `isBalanced` flag — when the books are
 * correct total debits will always equal total credits.
 *
 * @param tenantId - Tenant scope.
 * @param year     - Fiscal year (e.g. 2026).
 * @param month    - Fiscal month (1–12).
 * @returns Trial balance rows, totals, and a balance-check flag.
 */
export async function generateTrialBalance(
  tenantId: string,
  year: number,
  month: number,
): Promise<TrialBalanceResult> {
  // 1. Locate the fiscal period — if none exists, return an empty result
  const period = await repo.findFiscalPeriodByYearMonth(tenantId, year, month);

  if (!period) {
    return {
      rows: [],
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: true,
    };
  }

  // 2. Fetch every account in the tenant's chart of accounts
  const accounts = await repo.findChartOfAccounts(tenantId);

  // 3. Accumulate debit/credit totals per account within the period window
  const rows: TrialBalanceRow[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const account of accounts) {
    const { debit, credit } = await repo.getAccountBalance(
      tenantId,
      account.id,
      period.startDate,
      period.endDate,
    );

    // Only include accounts with non-zero activity
    if (debit > 0 || credit > 0) {
      rows.push({
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
      });
      totalDebits += debit;
      totalCredits += credit;
    }
  }

  // 4. Round to cents and check balance
  const roundedDebits = Math.round(totalDebits * 100) / 100;
  const roundedCredits = Math.round(totalCredits * 100) / 100;

  return {
    rows,
    totalDebits: roundedDebits,
    totalCredits: roundedCredits,
    isBalanced: Math.abs(roundedDebits - roundedCredits) < 0.01,
  };
}
