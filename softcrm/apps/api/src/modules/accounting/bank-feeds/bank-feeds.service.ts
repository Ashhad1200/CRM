import { getPrismaClient } from '@softcrm/db';
import { generateId, NotFoundError, ValidationError } from '@softcrm/shared-kernel';

/**
 * Bulk import bank transactions (upsert by externalId).
 */
export async function importTransactions(
  tenantId: string,
  companyId: string,
  bankAccountId: string,
  transactions: Array<{
    externalId: string;
    date: Date | string;
    description: string;
    amount: number;
    currency?: string;
    category?: string;
  }>,
) {
  const db = getPrismaClient();

  const results = await db.$transaction(
    transactions.map((txn) =>
      db.bankTransaction.upsert({
        where: {
          tenantId_externalId: {
            tenantId,
            externalId: txn.externalId,
          },
        },
        create: {
          id: generateId(),
          tenantId,
          companyId,
          bankAccountId,
          externalId: txn.externalId,
          date: typeof txn.date === 'string' ? new Date(txn.date) : txn.date,
          description: txn.description,
          amount: txn.amount,
          ...(txn.currency ? { currency: txn.currency as never } : {}),
          ...(txn.category ? { category: txn.category } : {}),
        },
        update: {
          date: typeof txn.date === 'string' ? new Date(txn.date) : txn.date,
          description: txn.description,
          amount: txn.amount,
          ...(txn.currency ? { currency: txn.currency as never } : {}),
          ...(txn.category !== undefined ? { category: txn.category } : {}),
        },
      }),
    ),
  );

  return { imported: results.length };
}

/**
 * List bank transactions with optional filters and pagination.
 */
export async function getTransactions(
  tenantId: string,
  companyId: string,
  filters?: {
    status?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    page?: number;
    limit?: number;
  },
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId, companyId };

  if (filters?.status) {
    where['status'] = filters.status;
  }
  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters?.startDate) dateFilter['gte'] = new Date(filters.startDate as string);
    if (filters?.endDate) dateFilter['lte'] = new Date(filters.endDate as string);
    where['date'] = dateFilter;
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const skip = (page - 1) * limit;

  const [data, total] = await db.$transaction([
    db.bankTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    db.bankTransaction.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Match a bank transaction to a chart-of-account, setting status to MATCHED.
 */
export async function matchTransaction(
  tenantId: string,
  txnId: string,
  accountId: string,
) {
  const db = getPrismaClient();

  const txn = await db.bankTransaction.findFirst({
    where: { id: txnId, tenantId },
  });

  if (!txn) {
    throw new NotFoundError('BankTransaction', txnId);
  }

  if (txn.status !== 'PENDING') {
    throw new ValidationError('Only PENDING transactions can be matched');
  }

  return db.bankTransaction.update({
    where: { id: txnId },
    data: {
      matchedAccountId: accountId,
      status: 'MATCHED',
    },
  });
}

/**
 * Reconcile a matched bank transaction by creating a journal entry.
 * Positive amount: debit bank account, credit matched account.
 * Negative amount: debit matched account, credit bank account.
 */
export async function reconcileTransaction(
  tenantId: string,
  txnId: string,
  actorId: string,
) {
  const db = getPrismaClient();

  const txn = await db.bankTransaction.findFirst({
    where: { id: txnId, tenantId },
  });

  if (!txn) {
    throw new NotFoundError('BankTransaction', txnId);
  }

  if (txn.status !== 'MATCHED') {
    throw new ValidationError('Only MATCHED transactions can be reconciled');
  }

  if (!txn.matchedAccountId) {
    throw new ValidationError('Transaction must have a matched account');
  }

  return db.$transaction(async (tx) => {
    // Find or create fiscal period for the transaction date
    const txnDate = new Date(txn.date);
    const year = txnDate.getFullYear();
    const month = txnDate.getMonth() + 1;

    let period = await tx.fiscalPeriod.findFirst({
      where: { tenantId, year, month },
    });

    if (!period) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      period = await tx.fiscalPeriod.create({
        data: {
          id: generateId(),
          tenantId,
          year,
          month,
          name: `${monthNames[month - 1]} ${year}`,
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
        },
      });
    }

    const amount = Math.abs(Number(txn.amount));
    const isPositive = Number(txn.amount) >= 0;

    const entryId = generateId();
    const journalEntry = await tx.journalEntry.create({
      data: {
        id: entryId,
        tenantId,
        date: txn.date,
        description: `Bank reconciliation: ${txn.description}`,
        reference: { bankTransactionId: txn.id, type: 'bank_reconciliation' } as never,
        periodId: period.id,
        createdBy: actorId,
        lines: {
          create: [
            {
              id: generateId(),
              accountId: txn.bankAccountId,
              debit: isPositive ? amount : 0,
              credit: isPositive ? 0 : amount,
              description: `Bank: ${txn.description}`,
            },
            {
              id: generateId(),
              accountId: txn.matchedAccountId!,
              debit: isPositive ? 0 : amount,
              credit: isPositive ? amount : 0,
              description: `Matched: ${txn.description}`,
            },
          ],
        },
      },
    });

    await tx.bankTransaction.update({
      where: { id: txnId },
      data: {
        status: 'RECONCILED',
        journalEntryId: journalEntry.id,
      },
    });

    return journalEntry;
  });
}

/**
 * Mark a bank transaction as EXCLUDED.
 */
export async function excludeTransaction(tenantId: string, txnId: string) {
  const db = getPrismaClient();

  const txn = await db.bankTransaction.findFirst({
    where: { id: txnId, tenantId },
  });

  if (!txn) {
    throw new NotFoundError('BankTransaction', txnId);
  }

  return db.bankTransaction.update({
    where: { id: txnId },
    data: { status: 'EXCLUDED' },
  });
}

/**
 * Get reconciliation summary: counts by status + total unreconciled amount.
 */
export async function getReconciliationSummary(
  tenantId: string,
  companyId: string,
) {
  const db = getPrismaClient();

  const [pending, matched, reconciled, excluded] = await db.$transaction([
    db.bankTransaction.count({ where: { tenantId, companyId, status: 'PENDING' } }),
    db.bankTransaction.count({ where: { tenantId, companyId, status: 'MATCHED' } }),
    db.bankTransaction.count({ where: { tenantId, companyId, status: 'RECONCILED' } }),
    db.bankTransaction.count({ where: { tenantId, companyId, status: 'EXCLUDED' } }),
  ]);

  const unreconciledAgg = await db.bankTransaction.aggregate({
    _sum: { amount: true },
    where: {
      tenantId,
      companyId,
      status: { in: ['PENDING', 'MATCHED'] },
    },
  });

  return {
    counts: { pending, matched, reconciled, excluded },
    totalUnreconciled: Number(unreconciledAgg._sum.amount ?? 0),
  };
}
