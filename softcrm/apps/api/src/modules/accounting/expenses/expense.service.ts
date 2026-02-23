import { ValidationError } from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';
import * as repo from '../repository.js';
import * as journalEntryService from '../ledger/journal-entry.service.js';
import * as events from '../events.js';
import type { ExpenseFilters } from '../types.js';
import type { CreateExpenseInput } from '../validators.js';
import type { Pagination } from '../repository.js';

/**
 * Create an expense.
 * Validates that the category exists in ChartOfAccounts and is of type EXPENSE.
 */
export async function createExpense(
  tenantId: string,
  data: CreateExpenseInput,
  actorId: string,
) {
  // Validate category is a valid expense account
  const category = await repo.findChartOfAccount(tenantId, data.categoryId);
  if (category.type !== 'EXPENSE') {
    throw new ValidationError('Expense category must be an EXPENSE type account');
  }

  return repo.createExpense(tenantId, data, actorId);
}

/**
 * Get expenses paginated.
 */
export async function getExpenses(
  tenantId: string,
  filters: ExpenseFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findExpenses(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

/**
 * Get a single expense.
 */
export async function getExpense(tenantId: string, id: string) {
  return repo.findExpense(tenantId, id);
}

/**
 * Approve an expense.
 * 1. Validate status is PENDING
 * 2. Create journal entry: debit Expense category account, credit AP (2000) or Cash (1000)
 * 3. Update status to APPROVED
 * 4. Publish expense.approved event
 */
export async function approveExpense(
  tenantId: string,
  expenseId: string,
  actorId: string,
) {
  const expense = await repo.findExpense(tenantId, expenseId);
  if (expense.status !== 'PENDING') {
    throw new ValidationError('Only pending expenses can be approved');
  }

  // Find AP account
  const accounts = await repo.findChartOfAccounts(tenantId);
  const apAccount = accounts.find((a: { code: string }) => a.code === '2000');

  if (!apAccount) {
    throw new ValidationError('System account not configured: need AP (2000)');
  }

  const amount = Number(expense.amount);

  // Create JE: debit Expense category, credit AP
  const je = await journalEntryService.createJournalEntry(
    tenantId,
    {
      date: new Date(expense.date),
      description: `Expense approved: ${expense.vendorName}`,
      reference: { expenseId: expense.id, type: 'expense_approved' },
      lines: [
        {
          accountId: expense.categoryId,
          debit: amount,
          credit: 0,
          description: `Expense: ${expense.vendorName}`,
        },
        {
          accountId: apAccount.id,
          debit: 0,
          credit: amount,
          description: `AP: ${expense.vendorName}`,
        },
      ],
    },
    actorId,
  );

  await repo.updateExpenseStatus(tenantId, expenseId, 'APPROVED', {
    approvedBy: actorId,
    approvedAt: new Date(),
    journalEntryId: je.id,
  });

  await events.publishExpenseApproved(tenantId, actorId, {
    expenseId: expense.id,
    amount,
    vendorName: expense.vendorName,
  });

  return repo.findExpense(tenantId, expenseId);
}

/**
 * Reject an expense.
 */
export async function rejectExpense(
  tenantId: string,
  expenseId: string,
  reason: string,
  actorId: string,
) {
  const expense = await repo.findExpense(tenantId, expenseId);
  if (expense.status !== 'PENDING') {
    throw new ValidationError('Only pending expenses can be rejected');
  }

  await repo.updateExpenseStatus(tenantId, expenseId, 'REJECTED', {
    rejectedReason: reason,
  });

  return repo.findExpense(tenantId, expenseId);
}
