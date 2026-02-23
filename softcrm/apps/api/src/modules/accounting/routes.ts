/**
 * Accounting module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/accounting/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import * as repo from './repository.js';
import * as events from './events.js';
import {
  uuidParamSchema,
  paginationSchema,
  createChartOfAccountSchema,
  updateChartOfAccountSchema,
  createInvoiceSchema,
  updateDraftInvoiceSchema,
  sendInvoiceSchema,
  voidInvoiceSchema,
  recordPaymentSchema,
  createManualJournalEntrySchema,
  createExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  closeFiscalPeriodSchema,
  listInvoicesQuerySchema,
  listJournalEntriesQuerySchema,
  listExpensesQuerySchema,
  dateRangeQuerySchema,
  asOfDateQuerySchema,
  periodQuerySchema,
  accountTypeSchema,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Safely extract a single string param from Express 5's `string | string[]`. */
function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
}

/** Wrap an async route handler so rejected promises forward to Express error middleware. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/** Build an OwnershipScope from the value set by rbac middleware (if any). */
function ownershipScope(req: Request): repo.OwnershipScope | undefined {
  const raw = req.ownershipScope;
  if (!raw) return undefined;
  return { scope: raw as repo.OwnershipScope['scope'], userId: req.user!.sub };
}

// ── Inline schemas ─────────────────────────────────────────────────────────────

const listChartOfAccountsQuerySchema = z.object({
  type: accountTypeSchema.optional(),
});

const accountBalanceQuerySchema = z.object({
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const accountingRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Chart of Accounts ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/chart-of-accounts',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: listChartOfAccountsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { type } = req.query as unknown as z.infer<typeof listChartOfAccountsQuerySchema>;
    const data = await svc.chartOfAccountsService.getAccounts(tenantId, { type });
    res.json({ data });
  }),
);

accountingRouter.post(
  '/chart-of-accounts',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({ body: createChartOfAccountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const account = await svc.chartOfAccountsService.createAccount(tenantId, req.body, actorId);
    res.status(201).json({ data: account });
  }),
);

accountingRouter.patch(
  '/chart-of-accounts/:id',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateChartOfAccountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const account = await svc.chartOfAccountsService.updateAccount(tenantId, id, req.body);
    res.json({ data: account });
  }),
);

accountingRouter.get(
  '/chart-of-accounts/:id/balance',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema, query: accountBalanceQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { startDate, endDate } = req.query as unknown as z.infer<typeof accountBalanceQuerySchema>;
    const balance = await svc.chartOfAccountsService.getAccountBalance(tenantId, id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    res.json({ data: balance });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Invoices ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Overdue route BEFORE :id to avoid route conflict
accountingRouter.get(
  '/invoices/overdue',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const data = await svc.invoiceService.getOverdueInvoices(tenantId);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/invoices',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: listInvoicesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listInvoicesQuerySchema
    >;
    const result = await svc.invoiceService.getInvoices(tenantId, filters, {
      page,
      limit,
      sortBy,
      sortDir,
    });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

accountingRouter.post(
  '/invoices',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({ body: createInvoiceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const invoice = await svc.invoiceService.createInvoice(tenantId, req.body, actorId);
    res.status(201).json({ data: invoice });
  }),
);

accountingRouter.get(
  '/invoices/:id',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const invoice = await svc.invoiceService.getInvoice(tenantId, id);
    res.json({ data: invoice });
  }),
);

accountingRouter.patch(
  '/invoices/:id',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateDraftInvoiceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const invoice = await svc.invoiceService.updateDraftInvoice(tenantId, id, req.body, actorId);
    res.json({ data: invoice });
  }),
);

accountingRouter.post(
  '/invoices/:id/send',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: sendInvoiceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const invoice = await svc.invoiceService.sendInvoice(tenantId, id, actorId);
    res.json({ data: invoice });
  }),
);

accountingRouter.post(
  '/invoices/:id/void',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: voidInvoiceSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { reason } = req.body as z.infer<typeof voidInvoiceSchema>;
    const invoice = await svc.invoiceService.voidInvoice(tenantId, id, reason, actorId);
    res.json({ data: invoice });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Payments ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.post(
  '/invoices/:id/payments',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({ params: uuidParamSchema, body: recordPaymentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const payment = await svc.paymentService.recordPayment(tenantId, id, req.body, actorId);
    res.status(201).json({ data: payment });
  }),
);

accountingRouter.get(
  '/invoices/:id/payments',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const payments = await svc.paymentService.getPaymentsByInvoice(tenantId, id);
    res.json({ data: payments });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Journal Entries ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/journal-entries',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: listJournalEntriesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy: _sb, sortDir: _sd, ...filters } = req.query as unknown as z.infer<
      typeof listJournalEntriesQuerySchema
    >;
    const result = await svc.journalEntryService.getEntriesByPeriod(tenantId, filters, {
      page,
      limit,
    });
    res.json({
      data: result.data,
      meta: { total: result.total, page, limit },
    });
  }),
);

accountingRouter.post(
  '/journal-entries',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({ body: createManualJournalEntrySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const entry = await svc.journalEntryService.createJournalEntry(tenantId, req.body, actorId);
    res.status(201).json({ data: entry });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Expenses ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/expenses',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: listExpensesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, sortBy, sortDir, ...filters } = req.query as unknown as z.infer<
      typeof listExpensesQuerySchema
    >;
    const result = await svc.expenseService.getExpenses(tenantId, filters, {
      page,
      limit,
      sortBy,
      sortDir,
    });
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit },
    });
  }),
);

accountingRouter.post(
  '/expenses',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({ body: createExpenseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const expense = await svc.expenseService.createExpense(tenantId, req.body, actorId);
    res.status(201).json({ data: expense });
  }),
);

accountingRouter.get(
  '/expenses/:id',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const expense = await svc.expenseService.getExpense(tenantId, id);
    res.json({ data: expense });
  }),
);

accountingRouter.post(
  '/expenses/:id/approve',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: approveExpenseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const expense = await svc.expenseService.approveExpense(tenantId, id, actorId);
    res.json({ data: expense });
  }),
);

accountingRouter.post(
  '/expenses/:id/reject',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: rejectExpenseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { reason } = req.body as z.infer<typeof rejectExpenseSchema>;
    const expense = await svc.expenseService.rejectExpense(tenantId, id, reason, actorId);
    res.json({ data: expense });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Reports ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/reports/profit-loss',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: dateRangeQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { startDate, endDate } = req.query as unknown as z.infer<typeof dateRangeQuerySchema>;
    const report = await svc.generateProfitAndLoss(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
    res.json({ data: report });
  }),
);

accountingRouter.get(
  '/reports/balance-sheet',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: asOfDateQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { asOfDate } = req.query as unknown as z.infer<typeof asOfDateQuerySchema>;
    const report = await svc.generateBalanceSheet(tenantId, new Date(asOfDate));
    res.json({ data: report });
  }),
);

accountingRouter.get(
  '/reports/trial-balance',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: periodQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { year, month } = req.query as unknown as z.infer<typeof periodQuerySchema>;
    const report = await svc.trialBalanceService.generateTrialBalance(tenantId, year, month);
    res.json({ data: report });
  }),
);

accountingRouter.get(
  '/reports/ar-aging',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const report = await svc.generateARAgingReport(tenantId);
    res.json({ data: report });
  }),
);

accountingRouter.get(
  '/reports/ap-aging',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const report = await svc.generateAPAgingReport(tenantId);
    res.json({ data: report });
  }),
);

accountingRouter.get(
  '/reports/cash-flow',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ query: dateRangeQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { startDate, endDate } = req.query as unknown as z.infer<typeof dateRangeQuerySchema>;
    const report = await svc.generateCashFlowStatement(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
    res.json({ data: report });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Fiscal Periods ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.post(
  '/fiscal-periods/:id/close',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema, body: closeFiscalPeriodSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const period = await repo.closeFiscalPeriod(tenantId, id, actorId);
    await events.publishPeriodClosed(tenantId, actorId, {
      id: period.id,
      year: period.year,
      month: period.month,
      name: period.name,
    });
    res.json({ data: period });
  }),
);
