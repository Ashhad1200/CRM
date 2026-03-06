/**
 * HR & Payroll module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/hr/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import {
  uuidParamSchema,
  createDepartmentSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
  createLeaveRequestSchema,
  approveLeaveSchema,
  listLeaveRequestsQuerySchema,
  createPayrollRunSchema,
  approvePayrollRunSchema,
  listPayrollRunsQuerySchema,
} from './validators.js';
import type {
  ListEmployeesQuery,
  ListLeaveRequestsQuery,
  ListPayrollRunsQuery,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateDepartmentInput,
  CreateLeaveRequestInput,
  ApproveLeaveInput,
  CreatePayrollRunInput,
  ApprovePayrollRunInput,
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const hrRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Employees ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/employees',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ query: listEmployeesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const query = req.query as unknown as ListEmployeesQuery;
    const result = await svc.listEmployees(tenantId, query);
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.pageSize },
    });
  }),
);

hrRouter.post(
  '/employees',
  requirePermission({ module: 'hr', entity: 'employee', action: 'create' }),
  validate({ body: createEmployeeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const employee = await svc.createEmployee(
      tenantId,
      req.body as CreateEmployeeInput,
      actorId,
    );
    res.status(201).json({ data: employee });
  }),
);

hrRouter.get(
  '/employees/:id',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const employee = await svc.getEmployee(tenantId, id);
    res.json({ data: employee });
  }),
);

hrRouter.put(
  '/employees/:id',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateEmployeeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const employee = await svc.updateEmployee(
      tenantId,
      id,
      req.body as UpdateEmployeeInput,
      actorId,
    );
    res.json({ data: employee });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Departments ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/departments',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const departments = await svc.listDepartments(tenantId);
    res.json({ data: departments });
  }),
);

hrRouter.post(
  '/departments',
  requirePermission({ module: 'hr', entity: 'employee', action: 'create' }),
  validate({ body: createDepartmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const department = await svc.createDepartment(
      tenantId,
      req.body as CreateDepartmentInput,
    );
    res.status(201).json({ data: department });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Leave Requests ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/leave-requests',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ query: listLeaveRequestsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const query = req.query as unknown as ListLeaveRequestsQuery;
    const result = await svc.listLeaveRequests(tenantId, query);
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.pageSize },
    });
  }),
);

hrRouter.post(
  '/leave-requests',
  requirePermission({ module: 'hr', entity: 'employee', action: 'create' }),
  validate({ body: createLeaveRequestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const leaveRequest = await svc.createLeaveRequest(
      tenantId,
      req.body as CreateLeaveRequestInput,
      actorId,
    );
    res.status(201).json({ data: leaveRequest });
  }),
);

hrRouter.patch(
  '/leave-requests/:id/approve',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema, body: approveLeaveSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const leaveRequest = await svc.approveLeave(
      tenantId,
      id,
      req.body as ApproveLeaveInput,
      actorId,
    );
    res.json({ data: leaveRequest });
  }),
);

hrRouter.patch(
  '/leave-requests/:id/reject',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema, body: approveLeaveSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const leaveRequest = await svc.rejectLeave(
      tenantId,
      id,
      req.body as ApproveLeaveInput,
      actorId,
    );
    res.json({ data: leaveRequest });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Payroll Runs ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/payroll-runs',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ query: listPayrollRunsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const query = req.query as unknown as ListPayrollRunsQuery;
    const result = await svc.listPayrollRuns(tenantId, query);
    res.json({
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.pageSize },
    });
  }),
);

hrRouter.post(
  '/payroll-runs',
  requirePermission({ module: 'hr', entity: 'employee', action: 'create' }),
  validate({ body: createPayrollRunSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const payrollRun = await svc.createPayrollRun(
      tenantId,
      req.body as CreatePayrollRunInput,
      actorId,
    );
    res.status(201).json({ data: payrollRun });
  }),
);

hrRouter.post(
  '/payroll-runs/:id/calculate',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const payrollRun = await svc.calculatePayroll(tenantId, id, actorId);
    res.json({ data: payrollRun });
  }),
);

hrRouter.patch(
  '/payroll-runs/:id/approve',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema, body: approvePayrollRunSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const payrollRun = await svc.approvePayroll(
      tenantId,
      id,
      req.body as ApprovePayrollRunInput,
      actorId,
    );
    res.json({ data: payrollRun });
  }),
);

hrRouter.get(
  '/payroll-runs/:id/payslips',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const paySlips = await svc.getPaySlips(tenantId, id);
    res.json({ data: paySlips });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── E056 — Employee termination & Department CRUD ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.post(
  '/employees/:id/terminate',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const employee = await svc.terminateEmployee(tenantId, id, req.body);
    res.json({ data: employee });
  }),
);

hrRouter.get(
  '/departments/:id',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const department = await svc.getDepartment(tenantId, id);
    res.json({ data: department });
  }),
);

hrRouter.patch(
  '/departments/:id',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const department = await svc.updateDepartment(tenantId, id, req.body);
    res.json({ data: department });
  }),
);

hrRouter.delete(
  '/departments/:id',
  requirePermission({ module: 'hr', entity: 'employee', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    await svc.deleteDepartment(tenantId, id);
    res.status(204).end();
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── E057 — Leave Management Enhancement ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/employees/:id/leave-balance',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const balance = await svc.getLeaveBalance(tenantId, id);
    res.json({ data: balance });
  }),
);

hrRouter.get(
  '/leave-calendar',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const calendar = await svc.getLeaveCalendar(tenantId, month, year);
    res.json({ data: calendar });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── E058 — Attendance ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.post(
  '/attendance/check-in',
  requirePermission({ module: 'hr', entity: 'employee', action: 'create' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const employeeId = req.body.employeeId as string;
    const { checkIn } = await import('./attendance.service.js');
    const record = await checkIn(tenantId, employeeId);
    res.status(201).json({ data: record });
  }),
);

hrRouter.post(
  '/attendance/check-out',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const employeeId = req.body.employeeId as string;
    const { checkOut } = await import('./attendance.service.js');
    const record = await checkOut(tenantId, employeeId);
    res.json({ data: record });
  }),
);

hrRouter.get(
  '/attendance/timesheet',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const employeeId = req.query.employeeId as string;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const { getTimesheet } = await import('./attendance.service.js');
    const records = await getTimesheet(tenantId, employeeId, startDate, endDate);
    res.json({ data: records });
  }),
);

hrRouter.get(
  '/attendance/summary',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const employeeId = req.query.employeeId as string;
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const { getAttendanceSummary } = await import('./attendance.service.js');
    const summary = await getAttendanceSummary(tenantId, employeeId, month, year);
    res.json({ data: summary });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── E059 — Payroll Engine Enhancement ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.post(
  '/payroll-runs/:id/generate-payslips',
  requirePermission({ module: 'hr', entity: 'employee', action: 'update' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const { generatePaySlips } = await import('./payroll/payroll-engine.service.js');
    const paySlips = await generatePaySlips(tenantId, id);
    res.json({ data: paySlips });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── E060 — Pay Slip PDF (HTML stub) ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

hrRouter.get(
  '/payroll-runs/:runId/payslips/:payslipId/pdf',
  requirePermission({ module: 'hr', entity: 'employee', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const runId = param(req, 'runId');
    const payslipId = param(req, 'payslipId');

    const db = (await import('@softcrm/db')).getPrismaClient();
    const paySlip = await db.paySlip.findFirst({
      where: { id: payslipId, payrollRunId: runId, tenantId },
      include: { employee: true },
    });
    if (!paySlip) {
      res.status(404).json({ error: 'Pay slip not found' });
      return;
    }

    const { generatePaySlipHtml } = await import('./payroll/payslip-pdf.service.js');
    const html = await generatePaySlipHtml({
      period: runId,
      employeeName: `${paySlip.employee.firstName} ${paySlip.employee.lastName}`,
      employeeNumber: paySlip.employee.employeeNumber,
      basicSalary: (paySlip.components as any)?.baseSalary ?? 0,
      allowances: 0,
      grossPay: paySlip.grossPay,
      tax: (paySlip.deductions as any)?.tax ?? 0,
      benefits: (paySlip.deductions as any)?.benefits ?? 0,
      totalDeductions: Object.values(paySlip.deductions as Record<string, number>).reduce(
        (a, b) => a + Number(b),
        0,
      ),
      netPay: paySlip.netPay,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }),
);
