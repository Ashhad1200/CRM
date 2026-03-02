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
