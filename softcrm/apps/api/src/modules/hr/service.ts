/**
 * HR & Payroll module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { NotFoundError, ValidationError, paginatedResult } from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { HrRepository } from './repository.js';
import * as events from './events.js';

import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateDepartmentInput,
  CreateLeaveRequestInput,
  ApproveLeaveInput,
  CreatePayrollRunInput,
  ApprovePayrollRunInput,
  ListEmployeesQuery,
  ListLeaveRequestsQuery,
  ListPayrollRunsQuery,
} from './validators.js';

import type { PayrollComponent } from './types.js';

const repo = new HrRepository();

// ═══════════════════════════════════════════════════════════════════════════════
// ── Departments ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createDepartment(
  tenantId: string,
  data: CreateDepartmentInput,
) {
  return repo.createDepartment(tenantId, data);
}

export async function listDepartments(tenantId: string) {
  return repo.findDepartments(tenantId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Employees ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createEmployee(
  tenantId: string,
  data: CreateEmployeeInput,
  actorId: string,
) {
  const employee = await repo.createEmployee(tenantId, data, actorId);

  await events.publishEmployeeCreated(tenantId, actorId, {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    departmentId: employee.departmentId,
  });

  return employee;
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  data: UpdateEmployeeInput,
  actorId: string,
) {
  const employee = await repo.updateEmployee(tenantId, id, data, actorId);

  await events.publishEmployeeUpdated(tenantId, actorId, {
    id: employee.id,
    status: String(employee.status),
  });

  return employee;
}

export async function getEmployee(tenantId: string, id: string) {
  return repo.findEmployeeById(tenantId, id);
}

export async function listEmployees(
  tenantId: string,
  query: ListEmployeesQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit, sortBy, sortDir, ...filters } = query;
  const { data, total } = await repo.findEmployees(tenantId, {
    page,
    limit,
    sortBy,
    sortDir,
    ...filters,
  });
  return {
    data,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Leave Requests ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createLeaveRequest(
  tenantId: string,
  data: CreateLeaveRequestInput,
  actorId: string,
) {
  // Validate employee exists
  await repo.findEmployeeById(tenantId, data.employeeId);

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  // Date range validation
  if (endDate < startDate) {
    throw new ValidationError('End date must be on or after start date');
  }

  // Check for overlapping approved/pending requests
  const overlapping = await repo.findOverlappingLeaveRequests(
    tenantId,
    data.employeeId,
    startDate,
    endDate,
  );

  if (overlapping.length > 0) {
    throw new ValidationError(
      'Employee already has a pending or approved leave request overlapping these dates',
    );
  }

  const leaveRequest = await repo.createLeaveRequest(tenantId, data, actorId);

  await events.publishLeaveRequestCreated(tenantId, actorId, {
    id: leaveRequest.id,
    employeeId: leaveRequest.employeeId,
    leaveTypeId: leaveRequest.leaveTypeId,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    days: leaveRequest.days,
  });

  return leaveRequest;
}

export async function approveLeave(
  tenantId: string,
  id: string,
  data: ApproveLeaveInput,
  actorId: string,
) {
  const request = await repo.findLeaveRequestById(tenantId, id);

  if (request.status !== 'PENDING') {
    throw new ValidationError(
      `Leave request cannot be approved — current status is ${request.status}`,
    );
  }

  const updated = await repo.updateLeaveRequest(tenantId, id, {
    status: 'APPROVED',
    approvedBy: data.approverId,
    approvedAt: new Date(),
  });

  await events.publishLeaveRequestApproved(tenantId, actorId, {
    id: updated.id,
    employeeId: updated.employeeId,
    approvedBy: updated.approvedBy,
  });

  return updated;
}

export async function rejectLeave(
  tenantId: string,
  id: string,
  data: ApproveLeaveInput,
  actorId: string,
) {
  const request = await repo.findLeaveRequestById(tenantId, id);

  if (request.status !== 'PENDING') {
    throw new ValidationError(
      `Leave request cannot be rejected — current status is ${request.status}`,
    );
  }

  const updated = await repo.updateLeaveRequest(tenantId, id, {
    status: 'REJECTED',
    approvedBy: data.approverId,
    approvedAt: new Date(),
  });

  await events.publishLeaveRequestRejected(tenantId, actorId, {
    id: updated.id,
    employeeId: updated.employeeId,
    approvedBy: updated.approvedBy,
  });

  return updated;
}

export async function listLeaveRequests(
  tenantId: string,
  query: ListLeaveRequestsQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit, sortBy, sortDir, ...filters } = query;
  const { data, total } = await repo.findLeaveRequests(tenantId, {
    page,
    limit,
    sortBy,
    sortDir,
    ...filters,
  });
  return {
    data,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Payroll ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPayrollRun(
  tenantId: string,
  data: CreatePayrollRunInput,
  actorId: string,
) {
  return repo.createPayrollRun(tenantId, data, actorId);
}

/**
 * Calculate payroll for all active employees.
 *
 * For each employee the calculation applies each component from the
 * PayrollStructure in order:
 *  - EARNING FIXED      → add the fixed value to gross
 *  - EARNING PERCENTAGE → add gross * (value / 100) (e.g. bonus)
 *  - DEDUCTION FIXED    → add the fixed value to totalDeductions
 *  - DEDUCTION PERCENTAGE → add gross * (value / 100) to totalDeductions
 *
 * The position.minSalary is used as the base salary when present.
 */
export async function calculatePayroll(
  tenantId: string,
  payrollRunId: string,
  actorId: string,
) {
  const run = await repo.findPayrollRunById(tenantId, payrollRunId);

  if (run.status !== 'DRAFT') {
    throw new ValidationError(
      `Payroll run cannot be calculated — current status is ${run.status}`,
    );
  }

  // Mark as calculating
  await repo.updatePayrollRun(tenantId, payrollRunId, { status: 'CALCULATING' });

  let payrollStructure: { components: unknown } | null = null;
  if (run.payrollStructureId) {
    payrollStructure = await repo.findPayrollStructureById(tenantId, run.payrollStructureId);
  }

  const components: PayrollComponent[] = payrollStructure
    ? (payrollStructure.components as PayrollComponent[])
    : [];

  const employees = await repo.findActiveEmployees(tenantId);

  let runTotalGross = 0;
  let runTotalDeductions = 0;

  for (const employee of employees) {
    const baseSalary = employee.position?.minSalary
      ? Number(String(employee.position.minSalary))
      : 0;

    let grossPay = baseSalary;
    const earningsBreakdown: Record<string, number> = { baseSalary };
    const deductionsBreakdown: Record<string, number> = {};

    // Apply earnings components first (gross-up)
    for (const component of components) {
      if (component.type !== 'EARNING') continue;
      const amount =
        component.calculationType === 'FIXED'
          ? component.value
          : Math.round(grossPay * (component.value / 100) * 100) / 100;
      grossPay = Math.round((grossPay + amount) * 100) / 100;
      earningsBreakdown[component.name] = amount;
    }

    // Apply deduction components (after gross is finalised)
    let totalDeductions = 0;
    for (const component of components) {
      if (component.type !== 'DEDUCTION') continue;
      const amount =
        component.calculationType === 'FIXED'
          ? component.value
          : Math.round(grossPay * (component.value / 100) * 100) / 100;
      totalDeductions = Math.round((totalDeductions + amount) * 100) / 100;
      deductionsBreakdown[component.name] = amount;
    }

    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    await repo.upsertPaySlip(tenantId, payrollRunId, employee.id, {
      grossPay,
      deductions: deductionsBreakdown,
      netPay,
      components: earningsBreakdown,
      currency: 'USD',
    });

    runTotalGross = Math.round((runTotalGross + grossPay) * 100) / 100;
    runTotalDeductions = Math.round((runTotalDeductions + totalDeductions) * 100) / 100;
  }

  const runTotalNet = Math.round((runTotalGross - runTotalDeductions) * 100) / 100;

  await repo.updatePayrollRun(tenantId, payrollRunId, {
    status: 'PENDING_APPROVAL',
    totalGross: runTotalGross,
    totalDeductions: runTotalDeductions,
    totalNet: runTotalNet,
  });

  return repo.findPayrollRunById(tenantId, payrollRunId);
}

export async function approvePayroll(
  tenantId: string,
  payrollRunId: string,
  data: ApprovePayrollRunInput,
  actorId: string,
) {
  const run = await repo.findPayrollRunById(tenantId, payrollRunId);

  if (run.status !== 'PENDING_APPROVAL') {
    throw new ValidationError(
      `Payroll run cannot be approved — current status is ${run.status}`,
    );
  }

  const updated = await repo.updatePayrollRun(tenantId, payrollRunId, {
    status: 'APPROVED',
    approvedBy: data.approverId,
    approvedAt: new Date(),
  });

  await events.publishPayrollRunApproved(tenantId, actorId, {
    id: payrollRunId,
    period: run.period,
    totalNet: run.totalNet,
    approvedBy: data.approverId,
  });

  return updated;
}

export async function listPayrollRuns(
  tenantId: string,
  query: ListPayrollRunsQuery,
): Promise<PaginatedResult<unknown>> {
  const { page, limit, sortBy, sortDir, ...filters } = query;
  const { data, total } = await repo.findPayrollRuns(tenantId, {
    page,
    limit,
    sortBy,
    sortDir,
    ...filters,
  });
  return {
    data,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPaySlips(tenantId: string, payrollRunId: string) {
  // Verify the payroll run exists under this tenant first
  await repo.findPayrollRunById(tenantId, payrollRunId);
  return repo.findPaySlips(tenantId, payrollRunId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── E056 — Employee & Department enhancements ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function terminateEmployee(
  tenantId: string,
  employeeId: string,
  data: { terminationDate: string; reason?: string },
) {
  const employee = await repo.findEmployeeById(tenantId, employeeId);

  if (employee.status === 'TERMINATED') {
    throw new ValidationError('Employee is already terminated');
  }

  const db = (await import('@softcrm/db')).getPrismaClient();
  return db.employee.update({
    where: { id: employeeId },
    data: {
      status: 'TERMINATED' as never,
      terminationDate: new Date(data.terminationDate),
      version: { increment: 1 },
    },
    include: { department: true, position: true },
  });
}

export async function getEmployeesByDepartment(tenantId: string, departmentId: string) {
  // Verify department exists
  await repo.findDepartmentById(tenantId, departmentId);

  const db = (await import('@softcrm/db')).getPrismaClient();
  return db.employee.findMany({
    where: { tenantId, departmentId },
    include: { department: true, position: true },
    orderBy: { lastName: 'asc' },
  });
}

export async function getDepartment(tenantId: string, id: string) {
  return repo.findDepartmentById(tenantId, id);
}

export async function updateDepartment(
  tenantId: string,
  id: string,
  data: { name?: string; parentDepartmentId?: string | null; managerId?: string | null },
) {
  await repo.findDepartmentById(tenantId, id);

  const db = (await import('@softcrm/db')).getPrismaClient();
  return db.department.update({
    where: { id },
    data,
  });
}

export async function deleteDepartment(tenantId: string, id: string) {
  await repo.findDepartmentById(tenantId, id);

  const db = (await import('@softcrm/db')).getPrismaClient();
  const employeeCount = await db.employee.count({ where: { tenantId, departmentId: id } });
  if (employeeCount > 0) {
    throw new ValidationError('Cannot delete department that still has employees assigned');
  }

  return db.department.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── E057 — Leave Management Enhancement ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLeaveBalance(tenantId: string, employeeId: string) {
  await repo.findEmployeeById(tenantId, employeeId);

  const db = (await import('@softcrm/db')).getPrismaClient();
  const leaveTypes = await db.leaveType.findMany({ where: { tenantId } });

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

  const approvedRequests = await db.leaveRequest.findMany({
    where: {
      tenantId,
      employeeId,
      status: 'APPROVED',
      startDate: { gte: yearStart, lte: yearEnd },
    },
    include: { leaveType: true },
  });

  return leaveTypes.map((lt) => {
    const usedDays = approvedRequests
      .filter((r) => r.leaveTypeId === lt.id)
      .reduce((sum, r) => sum + Number(r.days), 0);
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      maxDays: lt.maxDaysPerYear,
      usedDays,
      remainingDays: lt.maxDaysPerYear - usedDays,
    };
  });
}

export async function getLeaveCalendar(tenantId: string, month: number, year: number) {
  const db = (await import('@softcrm/db')).getPrismaClient();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  return db.leaveRequest.findMany({
    where: {
      tenantId,
      status: 'APPROVED',
      OR: [
        { startDate: { gte: start, lte: end } },
        { endDate: { gte: start, lte: end } },
        { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
      ],
    },
    include: { employee: true, leaveType: true },
    orderBy: { startDate: 'asc' },
  });
}
