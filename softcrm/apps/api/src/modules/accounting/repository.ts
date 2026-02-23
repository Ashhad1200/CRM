/**
 * Accounting module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 *
 * Journal entries are APPEND-ONLY: no update or delete methods are exposed.
 * Invoices may only be edited while in DRAFT status.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';

import type {
  InvoiceFilters,
  JournalEntryFilters,
  ExpenseFilters,
} from './types.js';
import type {
  CreateChartOfAccountInput,
  UpdateChartOfAccountInput,
  CreateInvoiceInput,
  UpdateDraftInvoiceInput,
  CreateExpenseInput,
  RecordPaymentInput,
  CreateManualJournalEntryInput,
  InvoiceLineInput,
  JournalLineInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Ownership-based filter applied by the RBAC middleware. */
export interface OwnershipScope {
  scope: 'OWN' | 'TEAM' | 'ALL';
  userId: string;
}

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ── Prisma include fragments ───────────────────────────────────────────────────

const journalEntryWithLinesInclude = {
  lines: {
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
    },
  },
} as const;

const invoiceDetailInclude = {
  lines: true,
  payments: true,
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): {
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

// Month names for auto-generated fiscal period names.
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ── Chart of Accounts ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findChartOfAccounts(
  tenantId: string,
  filters?: { type?: string },
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };
  if (filters?.type) {
    where['type'] = filters.type;
  }

  return db.chartOfAccount.findMany({
    where,
    orderBy: { code: 'asc' },
  });
}

export async function findChartOfAccount(tenantId: string, id: string) {
  const db = getPrismaClient();

  const account = await db.chartOfAccount.findFirst({
    where: { id, tenantId },
  });

  if (!account) {
    throw new NotFoundError('ChartOfAccount', id);
  }
  return account;
}

export async function createChartOfAccount(
  tenantId: string,
  data: CreateChartOfAccountInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.chartOfAccount.create({
    data: {
      id: generateId(),
      tenantId,
      code: data.code,
      name: data.name,
      type: data.type as never,
      parentId: data.parentId,
      isSystem: data.isSystem ?? false,
      createdBy: actorId,
    },
  });
}

export async function updateChartOfAccount(
  tenantId: string,
  id: string,
  data: UpdateChartOfAccountInput,
) {
  const db = getPrismaClient();

  const existing = await db.chartOfAccount.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('ChartOfAccount', id);
  }

  return db.chartOfAccount.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Fiscal Periods ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findFiscalPeriods(tenantId: string) {
  const db = getPrismaClient();

  return db.fiscalPeriod.findMany({
    where: { tenantId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

export async function findFiscalPeriod(tenantId: string, id: string) {
  const db = getPrismaClient();

  const period = await db.fiscalPeriod.findFirst({
    where: { id, tenantId },
  });

  if (!period) {
    throw new NotFoundError('FiscalPeriod', id);
  }
  return period;
}

export async function findFiscalPeriodByYearMonth(
  tenantId: string,
  year: number,
  month: number,
) {
  const db = getPrismaClient();

  return db.fiscalPeriod.findFirst({
    where: { tenantId, year, month },
  });
}

export async function findOrCreateFiscalPeriod(tenantId: string, date: Date) {
  const db = getPrismaClient();

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed → 1-indexed

  const existing = await db.fiscalPeriod.findFirst({
    where: { tenantId, year, month },
  });

  if (existing) {
    return existing;
  }

  const name = `${MONTH_NAMES[month - 1]} ${year}`;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  return db.fiscalPeriod.create({
    data: {
      id: generateId(),
      tenantId,
      year,
      month,
      name,
      startDate,
      endDate,
    },
  });
}

export async function closeFiscalPeriod(
  tenantId: string,
  id: string,
  actorId: string,
) {
  const db = getPrismaClient();

  const existing = await db.fiscalPeriod.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('FiscalPeriod', id);
  }

  return db.fiscalPeriod.update({
    where: { id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: actorId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Journal Entries (APPEND-ONLY) ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createJournalEntry(
  tenantId: string,
  data: {
    date: Date | string;
    description: string;
    reference?: Record<string, unknown>;
    periodId: string;
    isReversing?: boolean;
    reversedEntryId?: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  const entryId = generateId();
  const entryDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

  return db.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        id: entryId,
        tenantId,
        date: entryDate,
        description: data.description,
        reference: (data.reference ?? undefined) as never,
        periodId: data.periodId,
        isReversing: data.isReversing ?? false,
        reversedEntryId: data.reversedEntryId ?? undefined,
        createdBy: actorId,
        lines: {
          create: data.lines.map((line) => ({
            id: generateId(),
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: journalEntryWithLinesInclude,
    });

    return entry;
  });
}

// NO update or delete methods — Journal entries are immutable.

export async function findJournalEntries(
  tenantId: string,
  filters: JournalEntryFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.periodId) {
    where['periodId'] = filters.periodId;
  }
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate) dateFilter['gte'] = new Date(filters.startDate);
    if (filters.endDate) dateFilter['lte'] = new Date(filters.endDate);
    where['date'] = dateFilter;
  }
  if (filters.accountId) {
    where['lines'] = { some: { accountId: filters.accountId } };
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.journalEntry.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { date: 'desc' },
      include: journalEntryWithLinesInclude,
    }),
    db.journalEntry.count({ where }),
  ]);

  return { data, total };
}

export async function findJournalEntry(tenantId: string, id: string) {
  const db = getPrismaClient();

  const entry = await db.journalEntry.findFirst({
    where: { id, tenantId },
    include: journalEntryWithLinesInclude,
  });

  if (!entry) {
    throw new NotFoundError('JournalEntry', id);
  }
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Invoices ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findInvoices(
  tenantId: string,
  filters: InvoiceFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where['status'] = filters.status;
  }
  if (filters.contactId) {
    where['contactId'] = filters.contactId;
  }
  if (filters.search) {
    where['OR'] = [
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate) dateFilter['gte'] = new Date(filters.startDate);
    if (filters.endDate) dateFilter['lte'] = new Date(filters.endDate);
    where['createdAt'] = dateFilter;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.invoice.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: { lines: true },
    }),
    db.invoice.count({ where }),
  ]);

  return { data, total };
}

export async function findInvoice(tenantId: string, id: string) {
  const db = getPrismaClient();

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId },
    include: invoiceDetailInclude,
  });

  if (!invoice) {
    throw new NotFoundError('Invoice', id);
  }
  return invoice;
}

export async function createInvoice(
  tenantId: string,
  data: CreateInvoiceInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Auto-generate invoice number: max existing + 1
    const lastInvoice = await tx.invoice.findFirst({
      where: { tenantId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const invoiceNumber = (lastInvoice?.invoiceNumber ?? 0) + 1;

    // Calculate line totals and invoice totals
    const computedLines = data.lines.map((line) => {
      const lineTotal =
        line.quantity * line.unitPrice * (1 - (line.discount ?? 0) / 100);
      return { ...line, lineTotal };
    });

    const subtotal = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);
    const taxAmount = computedLines.reduce(
      (sum, l) => sum + l.lineTotal * ((l.taxRate ?? 0) / 100),
      0,
    );
    const total = subtotal + taxAmount;

    const invoiceId = generateId();

    const invoice = await tx.invoice.create({
      data: {
        id: invoiceId,
        tenantId,
        invoiceNumber,
        contactId: data.contactId,
        accountId: data.accountId,
        dealId: data.dealId,
        currency: data.currency as never,
        paymentTerms: data.paymentTerms,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        subtotal,
        taxAmount,
        total,
        createdBy: actorId,
        updatedBy: actorId,
        lines: {
          create: computedLines.map((line) => ({
            id: generateId(),
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount ?? 0,
            taxRate: line.taxRate ?? 0,
            lineTotal: line.lineTotal,
            accountId: line.accountId,
          })),
        },
      },
      include: invoiceDetailInclude,
    });

    return invoice;
  });
}

export async function updateDraftInvoice(
  tenantId: string,
  id: string,
  data: UpdateDraftInvoiceInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.$transaction(async (tx) => {
    // Fetch current invoice to verify status and version
    const existing = await tx.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('Invoice', id);
    }

    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Invoice can only be edited while in DRAFT status');
    }

    // Optimistic lock via updateMany with version check
    const result = await tx.invoice.updateMany({
      where: { id, tenantId, version: data.version },
      data: {
        ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
        ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
        ...(data.dealId !== undefined ? { dealId: data.dealId } : {}),
        ...(data.currency !== undefined ? { currency: data.currency as never } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms } : {}),
        ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        version: { increment: 1 },
        updatedBy: actorId,
      } as never,
    });

    if (result.count === 0) {
      throw new ConflictError('Invoice was modified by another user');
    }

    // If lines are provided, replace them (delete old, create new)
    if (data.lines && data.lines.length > 0) {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

      const computedLines = data.lines.map((line) => {
        const lineTotal =
          line.quantity * line.unitPrice * (1 - (line.discount ?? 0) / 100);
        return { ...line, lineTotal };
      });

      const subtotal = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);
      const taxAmount = computedLines.reduce(
        (sum, l) => sum + l.lineTotal * ((l.taxRate ?? 0) / 100),
        0,
      );
      const total = subtotal + taxAmount;

      await tx.invoiceLine.createMany({
        data: computedLines.map((line) => ({
          id: generateId(),
          invoiceId: id,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount ?? 0,
          taxRate: line.taxRate ?? 0,
          lineTotal: line.lineTotal,
          accountId: line.accountId,
        })),
      });

      // Update computed totals on the invoice
      await tx.invoice.update({
        where: { id },
        data: { subtotal, taxAmount, total },
      });
    }

    return tx.invoice.findFirstOrThrow({
      where: { id, tenantId },
      include: invoiceDetailInclude,
    });
  });
}

export async function updateInvoiceStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: { sentAt?: Date; paidAt?: Date; paidAmount?: number },
) {
  const db = getPrismaClient();

  const existing = await db.invoice.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Invoice', id);
  }

  return db.invoice.update({
    where: { id },
    data: {
      status: status as never,
      ...(extra?.sentAt ? { sentAt: extra.sentAt } : {}),
      ...(extra?.paidAt ? { paidAt: extra.paidAt } : {}),
      ...(extra?.paidAmount !== undefined ? { paidAmount: extra.paidAmount } : {}),
    },
  });
}

export async function findOverdueInvoices(tenantId: string) {
  const db = getPrismaClient();

  return db.invoice.findMany({
    where: {
      tenantId,
      status: { in: ['SENT', 'PARTIAL'] },
      dueDate: { lt: new Date() },
    },
    include: { lines: true },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Payments ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPayment(
  tenantId: string,
  data: {
    invoiceId: string;
    amount: number;
    method: string;
    date: Date | string;
    reference?: string;
    journalEntryId?: string;
    notes?: string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  return db.payment.create({
    data: {
      id: generateId(),
      tenantId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.method as never,
      date: typeof data.date === 'string' ? new Date(data.date) : data.date,
      reference: data.reference,
      journalEntryId: data.journalEntryId,
      notes: data.notes,
      createdBy: actorId,
    },
  });
}

export async function findPaymentsByInvoice(
  tenantId: string,
  invoiceId: string,
) {
  const db = getPrismaClient();

  return db.payment.findMany({
    where: { tenantId, invoiceId },
    orderBy: { date: 'desc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Expenses ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findExpenses(
  tenantId: string,
  filters: ExpenseFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where['status'] = filters.status;
  }
  if (filters.categoryId) {
    where['categoryId'] = filters.categoryId;
  }
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate) dateFilter['gte'] = new Date(filters.startDate);
    if (filters.endDate) dateFilter['lte'] = new Date(filters.endDate);
    where['date'] = dateFilter;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await db.$transaction([
    db.expense.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { date: 'desc' },
    }),
    db.expense.count({ where }),
  ]);

  return { data, total };
}

export async function findExpense(tenantId: string, id: string) {
  const db = getPrismaClient();

  const expense = await db.expense.findFirst({
    where: { id, tenantId },
  });

  if (!expense) {
    throw new NotFoundError('Expense', id);
  }
  return expense;
}

export async function createExpense(
  tenantId: string,
  data: CreateExpenseInput,
  actorId: string,
) {
  const db = getPrismaClient();

  return db.expense.create({
    data: {
      id: generateId(),
      tenantId,
      vendorName: data.vendorName,
      description: data.description,
      amount: data.amount,
      currency: data.currency as never,
      categoryId: data.categoryId,
      date: new Date(data.date),
      receiptUrl: data.receiptUrl,
      projectId: data.projectId,
      createdBy: actorId,
    },
  });
}

export async function updateExpenseStatus(
  tenantId: string,
  id: string,
  status: string,
  extra?: {
    approvedBy?: string;
    approvedAt?: Date;
    rejectedReason?: string;
    journalEntryId?: string;
  },
) {
  const db = getPrismaClient();

  const existing = await db.expense.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Expense', id);
  }

  return db.expense.update({
    where: { id },
    data: {
      status: status as never,
      ...(extra?.approvedBy ? { approvedBy: extra.approvedBy } : {}),
      ...(extra?.approvedAt ? { approvedAt: extra.approvedAt } : {}),
      ...(extra?.rejectedReason ? { rejectedReason: extra.rejectedReason } : {}),
      ...(extra?.journalEntryId ? { journalEntryId: extra.journalEntryId } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Recurring Invoices ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findActiveRecurringInvoices(tenantId: string) {
  const db = getPrismaClient();

  return db.recurringInvoice.findMany({
    where: {
      tenantId,
      isActive: true,
      nextRunDate: { lte: new Date() },
    },
  });
}

export async function createRecurringInvoice(
  tenantId: string,
  data: {
    templateInvoiceId: string;
    frequency: string;
    nextRunDate: Date | string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  return db.recurringInvoice.create({
    data: {
      id: generateId(),
      tenantId,
      templateInvoiceId: data.templateInvoiceId,
      frequency: data.frequency as never,
      nextRunDate: typeof data.nextRunDate === 'string'
        ? new Date(data.nextRunDate)
        : data.nextRunDate,
      createdBy: actorId,
    },
  });
}

export async function updateRecurringInvoiceNextRun(
  id: string,
  nextRunDate: Date | string,
  lastRunDate: Date | string,
) {
  const db = getPrismaClient();

  return db.recurringInvoice.update({
    where: { id },
    data: {
      nextRunDate: typeof nextRunDate === 'string' ? new Date(nextRunDate) : nextRunDate,
      lastRunDate: typeof lastRunDate === 'string' ? new Date(lastRunDate) : lastRunDate,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Credit Notes ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createCreditNote(
  tenantId: string,
  data: {
    invoiceId: string;
    amount: number;
    reason: string;
    journalEntryId?: string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  return db.creditNote.create({
    data: {
      id: generateId(),
      tenantId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      reason: data.reason,
      journalEntryId: data.journalEntryId,
      createdBy: actorId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Account Balance Query ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAccountBalance(
  tenantId: string,
  accountId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{ debit: number; credit: number }> {
  const db = getPrismaClient();

  const dateFilter: Record<string, unknown> = {};
  if (startDate) dateFilter['gte'] = startDate;
  if (endDate) dateFilter['lte'] = endDate;

  const result = await db.journalLine.aggregate({
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      accountId,
      journalEntry: {
        tenantId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
    },
  });

  return {
    debit: Number(result._sum.debit ?? 0),
    credit: Number(result._sum.credit ?? 0),
  };
}
