import * as repo from '../repository.js';
import type { AccountWithBalance } from '../types.js';

import type { CreateChartOfAccountInput } from '../validators.js';

/**
 * Chart-of-accounts service.
 * Manages account CRUD and balance calculations using normal-balance rules.
 */

/**
 * List all accounts for a tenant, optionally filtered by account type.
 *
 * @param tenantId - Tenant scope.
 * @param type     - Optional account type filter (e.g. ASSET, LIABILITY).
 * @returns Array of chart-of-account records.
 */
export async function getAccounts(
  tenantId: string,
  filters?: { type?: string },
) {
  return repo.findChartOfAccounts(tenantId, filters);
}

/**
 * Retrieve a single account by ID.
 *
 * @param tenantId - Tenant scope.
 * @param id       - Account ID.
 * @returns The chart-of-account record (throws NotFoundError if missing).
 */
export async function getAccount(
  tenantId: string,
  id: string,
) {
  return repo.findChartOfAccount(tenantId, id);
}

/**
 * Create a new account in the chart of accounts.
 *
 * @param tenantId - Tenant scope.
 * @param data     - Account details (code, name, type, parentId, etc.).
 * @param actorId  - ID of the user creating the account.
 * @returns The newly created account record.
 */
export async function createAccount(
  tenantId: string,
  data: CreateChartOfAccountInput,
  actorId: string,
) {
  return repo.createChartOfAccount(tenantId, data, actorId);
}

/**
 * Update an existing account.  Only `name` and `isActive` are mutable;
 * code and type are immutable after creation.
 *
 * @param tenantId - Tenant scope.
 * @param id       - Account ID.
 * @param data     - Fields to update.
 * @returns The updated account record.
 */
export async function updateAccount(
  tenantId: string,
  id: string,
  data: { name?: string; isActive?: boolean },
) {
  return repo.updateChartOfAccount(tenantId, id, data);
}

/**
 * Get the computed balance for a single account over an optional date range.
 *
 * Normal-balance rules:
 * - **Asset / Expense** accounts: `balance = debits − credits`
 * - **Liability / Equity / Revenue** accounts: `balance = credits − debits`
 *
 * @param tenantId  - Tenant scope.
 * @param accountId - Account ID.
 * @param dateRange - Optional start/end dates to scope the balance calculation.
 * @returns The account record augmented with a computed `balance` field.
 */
export async function getAccountBalance(
  tenantId: string,
  accountId: string,
  dateRange?: { startDate?: Date; endDate?: Date },
): Promise<AccountWithBalance> {
  const account = await repo.findChartOfAccount(tenantId, accountId);

  const { debit, credit } = await repo.getAccountBalance(
    tenantId,
    accountId,
    dateRange?.startDate,
    dateRange?.endDate,
  );

  let balance: number;
  if (account.type === 'ASSET' || account.type === 'EXPENSE') {
    balance = debit - credit;
  } else {
    // LIABILITY, EQUITY, REVENUE
    balance = credit - debit;
  }

  return { ...account, balance };
}
