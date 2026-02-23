import { ValidationError } from '@softcrm/shared-kernel';
import * as repo from '../repository.js';

/**
 * Double-entry journal entry service.
 * Immutable — entries cannot be updated or deleted, only reversed.
 */

/**
 * Create a journal entry with balanced debit/credit lines.
 *
 * Validates:
 * 1. `sum(debits) === sum(credits)` — throws {@link ValidationError} if unbalanced.
 * 2. Every referenced account ID exists in ChartOfAccounts — throws if missing.
 * 3. The target fiscal period is **OPEN** — throws {@link ValidationError} if closed.
 * 4. Each line carries either a positive debit **or** a positive credit, never both.
 *
 * @param tenantId - Tenant scope.
 * @param data     - Entry header + line items.
 * @param actorId  - ID of the user creating the entry.
 * @returns The persisted journal entry including its lines.
 */
export async function createJournalEntry(
  tenantId: string,
  data: {
    date: Date;
    description: string;
    reference?: Record<string, unknown>;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  },
  actorId: string,
) {
  for (const line of data.lines) {
    if (line.debit > 0 && line.credit > 0) {
      throw new ValidationError(
        'A journal line must have either a debit or a credit, not both',
      );
    }
    if (line.debit < 0 || line.credit < 0) {
      throw new ValidationError(
        'Debit and credit amounts must be non-negative',
      );
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new ValidationError(
        'A journal line must have a positive debit or credit amount',
      );
    }
  }

  // 1. Validate balanced — use rounding to avoid floating-point drift
  const totalDebits = data.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = data.lines.reduce((sum, l) => sum + l.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new ValidationError(
      'Journal entry must be balanced: total debits must equal total credits',
    );
  }

  // 2. Validate all referenced accounts exist (throws NotFoundError internally)
  for (const line of data.lines) {
    await repo.findChartOfAccount(tenantId, line.accountId);
  }

  // 3. Find-or-create the fiscal period for the entry date, then guard closure
  const period = await repo.findOrCreateFiscalPeriod(tenantId, data.date);
  if (period.status === 'CLOSED') {
    throw new ValidationError(`Fiscal period ${period.name} is closed`);
  }

  // Persist the journal entry (append-only ledger)
  return repo.createJournalEntry(
    tenantId,
    {
      date: data.date,
      description: data.description,
      reference: data.reference,
      periodId: period.id,
      isReversing: false,
      lines: data.lines,
    },
    actorId,
  );
}

/**
 * Create a reversing entry that mirrors the original with debits and credits
 * swapped.  The new entry references the original via `reversedEntryId`.
 *
 * @param tenantId        - Tenant scope.
 * @param originalEntryId - ID of the entry to reverse.
 * @param actorId         - ID of the user performing the reversal.
 * @returns The newly created reversing journal entry with lines.
 */
export async function createReversingEntry(
  tenantId: string,
  originalEntryId: string,
  actorId: string,
) {
  const original = await repo.findJournalEntry(tenantId, originalEntryId);

  const reversedLines = original.lines.map((line: any) => ({
    accountId: line.accountId,
    debit: Number(line.credit), // swap credit → debit
    credit: Number(line.debit), // swap debit → credit
    description: `Reversal: ${line.description ?? ''}`.trim(),
  }));

  const now = new Date();
  const period = await repo.findOrCreateFiscalPeriod(tenantId, now);
  if (period.status === 'CLOSED') {
    throw new ValidationError(`Fiscal period ${period.name} is closed`);
  }

  return repo.createJournalEntry(
    tenantId,
    {
      date: now,
      description: `Reversal of: ${original.description}`,
      reference: { reversedEntryId: originalEntryId },
      periodId: period.id,
      isReversing: true,
      reversedEntryId: originalEntryId,
      lines: reversedLines,
    },
    actorId,
  );
}

/**
 * Retrieve journal entries filtered by fiscal period and/or account.
 *
 * @param tenantId  - Tenant scope.
 * @param filters   - Optional filtering criteria.
 * @param pagination - Page and limit for result set.
 * @returns A paginated list of journal entries with their lines.
 */
export async function getEntriesByPeriod(
  tenantId: string,
  filters: {
    periodId?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  pagination: { page?: number; limit?: number } = {},
) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 50;

  return repo.findJournalEntries(tenantId, {
    periodId: filters.periodId,
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }, {
    page,
    limit,
  });
}
