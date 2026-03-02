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

// ─────────────────────────────────────────────────────────────────────────────
// ── Companies (Multi-Entity) ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/companies',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { getCompanies } = await import('./multi-company/company.service.js');
    const data = await getCompanies(tenantId);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/companies',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({
    body: z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      baseCurrency: z.string().min(1),
      fiscalYearEnd: z.string().optional(),
      address: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { createCompany } = await import('./multi-company/company.service.js');
    const data = await createCompany(tenantId, req.body, actorId);
    res.status(201).json({ data });
  }),
);

accountingRouter.patch(
  '/companies/:id',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { updateCompany } = await import('./multi-company/company.service.js');
    const data = await updateCompany(tenantId, id, req.body);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/companies/:id/set-default',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { setDefaultCompany } = await import('./multi-company/company.service.js');
    const data = await setDefaultCompany(tenantId, id);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/companies/:id',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getCompany } = await import('./multi-company/company.service.js');
    const data = await getCompany(tenantId, id);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Budgets ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/budgets',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string | undefined;
    const { getBudgets } = await import('./budgets/budget.service.js');
    const data = await getBudgets(tenantId, companyId);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/budgets',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({
    body: z.object({
      name: z.string().min(1),
      year: z.number().int(),
      period: z.string().min(1),
      companyId: z.string().uuid(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { createBudget } = await import('./budgets/budget.service.js');
    const data = await createBudget(tenantId, req.body, actorId);
    res.status(201).json({ data });
  }),
);

accountingRouter.get(
  '/budgets/:id',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { getBudget } = await import('./budgets/budget.service.js');
    const data = await getBudget(tenantId, id);
    res.json({ data });
  }),
);

accountingRouter.put(
  '/budgets/:id/lines',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({
    params: uuidParamSchema,
    body: z.object({
      lines: z.array(
        z.object({
          accountId: z.string().uuid(),
          month: z.number().int().min(1).max(12),
          amount: z.number(),
        }),
      ),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { updateBudgetLines } = await import('./budgets/budget.service.js');
    const data = await updateBudgetLines(tenantId, id, req.body.lines);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/budgets/:id/variance',
  requirePermission({ module: 'accounting', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const month = req.query['month'] ? Number(req.query['month']) : undefined;
    const { getBudgetVariance } = await import('./budgets/budget.service.js');
    const data = await getBudgetVariance(tenantId, id, month);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Cost Centers ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/cost-centers',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string | undefined;
    const { getCostCenters } = await import('./cost-centers/cost-center.service.js');
    const data = await getCostCenters(tenantId, companyId);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/cost-centers',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({
    body: z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      companyId: z.string().uuid(),
      parentId: z.string().uuid().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { createCostCenter } = await import('./cost-centers/cost-center.service.js');
    const data = await createCostCenter(tenantId, req.body);
    res.status(201).json({ data });
  }),
);

accountingRouter.patch(
  '/cost-centers/:id',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({
    params: uuidParamSchema,
    body: z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { updateCostCenter } = await import('./cost-centers/cost-center.service.js');
    const data = await updateCostCenter(tenantId, id, req.body);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/cost-centers/report',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string;
    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const { getCostCenterReport } = await import('./cost-centers/cost-center.service.js');
    const data = await getCostCenterReport(tenantId, companyId, startDate, endDate);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Bank Feeds ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.post(
  '/bank-feeds/import',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({
    body: z.object({
      companyId: z.string().uuid(),
      bankAccountId: z.string().uuid(),
      transactions: z.array(z.object({}).passthrough()),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { companyId, bankAccountId, transactions } = req.body;
    const { importTransactions } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await importTransactions(tenantId, companyId, bankAccountId, transactions);
    res.status(201).json({ data });
  }),
);

accountingRouter.get(
  '/bank-feeds',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string;
    const status = req.query['status'] as string | undefined;
    const startDate = req.query['startDate'] as string | undefined;
    const endDate = req.query['endDate'] as string | undefined;
    const { getTransactions } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await getTransactions(tenantId, companyId, { status, startDate, endDate });
    res.json({ data });
  }),
);

accountingRouter.post(
  '/bank-feeds/:id/match',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({
    params: uuidParamSchema,
    body: z.object({
      accountId: z.string().uuid(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { matchTransaction } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await matchTransaction(tenantId, id, req.body.accountId);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/bank-feeds/:id/reconcile',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const { reconcileTransaction } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await reconcileTransaction(tenantId, id, actorId);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/bank-feeds/:id/exclude',
  requirePermission({ module: 'accounting', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { excludeTransaction } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await excludeTransaction(tenantId, id);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/bank-feeds/summary',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string;
    const { getReconciliationSummary } = await import('./bank-feeds/bank-feeds.service.js');
    const data = await getReconciliationSummary(tenantId, companyId);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Exchange Rates ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/fx-rates',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string;
    const fromCurrency = req.query['fromCurrency'] as string | undefined;
    const toCurrency = req.query['toCurrency'] as string | undefined;
    const { getExchangeRates } = await import('./fx/fx.service.js');
    const data = await getExchangeRates(tenantId, companyId, fromCurrency, toCurrency);
    res.json({ data });
  }),
);

accountingRouter.post(
  '/fx-rates',
  requirePermission({ module: 'accounting', action: 'create' }),
  validate({
    body: z.object({
      companyId: z.string().uuid(),
      fromCurrency: z.string().min(1),
      toCurrency: z.string().min(1),
      rate: z.number().positive(),
      effectiveDate: z.string().min(1),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { companyId, ...rateData } = req.body;
    const { setExchangeRate } = await import('./fx/fx.service.js');
    const data = await setExchangeRate(tenantId, companyId, rateData, actorId);
    res.status(201).json({ data });
  }),
);

accountingRouter.get(
  '/fx-rates/latest',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyId = req.query['companyId'] as string;
    const fromCurrency = req.query['fromCurrency'] as string;
    const toCurrency = req.query['toCurrency'] as string;
    const { getLatestRate } = await import('./fx/fx.service.js');
    const data = await getLatestRate(tenantId, companyId, fromCurrency, toCurrency);
    res.json({ data });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Consolidation ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/consolidation/profit-loss',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyIds = (req.query['companyIds'] as string)?.split(',') || [];
    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const { consolidateProfitAndLoss } = await import('./multi-company/consolidation.service.js');
    const data = await consolidateProfitAndLoss(tenantId, companyIds, startDate, endDate);
    res.json({ data });
  }),
);

accountingRouter.get(
  '/consolidation/balance-sheet',
  requirePermission({ module: 'accounting', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const companyIds = (req.query['companyIds'] as string)?.split(',') || [];
    const asOfDate = req.query['asOfDate'] as string;
    const { consolidateBalanceSheet } = await import('./multi-company/consolidation.service.js');
    const data = await consolidateBalanceSheet(tenantId, companyIds, asOfDate);
    res.json({ data });
  }),
);
