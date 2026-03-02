/**
 * HR & Payroll module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) enforced by the
 * Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, ConflictError } from '@softcrm/shared-kernel';

import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateLeaveRequestInput,
  CreatePayrollRunInput,
} from './validators.js';

// ── Pagination helper ──────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

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

// ── HrRepository ───────────────────────────────────────────────────────────────

export class HrRepository {
  // ── Departments ─────────────────────────────────────────────────────────────

  async findDepartments(tenantId: string) {
    const db = getPrismaClient();
    return db.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findDepartmentById(tenantId: string, id: string) {
    const db = getPrismaClient();
    const department = await db.department.findFirst({ where: { id, tenantId } });
    if (!department) {
      throw new NotFoundError('Department', id);
    }
    return department;
  }

  async createDepartment(tenantId: string, data: CreateDepartmentInput) {
    const db = getPrismaClient();
    return db.department.create({
      data: {
        tenantId,
        name: data.name,
        parentDepartmentId: data.parentDepartmentId,
        managerId: data.managerId,
      },
    });
  }

  // ── Employees ───────────────────────────────────────────────────────────────

  async findEmployeeById(tenantId: string, id: string) {
    const db = getPrismaClient();
    const employee = await db.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        position: true,
      },
    });
    if (!employee) {
      throw new NotFoundError('Employee', id);
    }
    return employee;
  }

  async findEmployees(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      departmentId?: string;
      status?: string;
      search?: string;
    },
  ) {
    const db = getPrismaClient();
    const where: Record<string, unknown> = { tenantId };

    if (opts.departmentId) {
      where['departmentId'] = opts.departmentId;
    }
    if (opts.status) {
      where['status'] = opts.status as never;
    }
    if (opts.search) {
      where['OR'] = [
        { firstName: { contains: opts.search, mode: 'insensitive' } },
        { lastName: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
        { employeeNumber: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const { skip, take, orderBy } = paginationArgs({
      page: opts.page,
      limit: opts.limit,
      sortBy: opts.sortBy,
      sortDir: opts.sortDir,
    });

    const [data, total] = await db.$transaction([
      db.employee.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { lastName: 'asc' },
        include: { department: true, position: true },
      }),
      db.employee.count({ where }),
    ]);

    return { data, total };
  }

  async createEmployee(tenantId: string, data: CreateEmployeeInput, actorId: string) {
    const db = getPrismaClient();
    return db.employee.create({
      data: {
        tenantId,
        userId: data.userId,
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        departmentId: data.departmentId,
        positionId: data.positionId,
        managerId: data.managerId,
        employmentType: data.employmentType as never,
        status: data.status as never,
        hireDate: new Date(data.hireDate),
        avatarUrl: data.avatarUrl,
        address: (data.address ?? undefined) as never,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  async updateEmployee(
    tenantId: string,
    id: string,
    data: UpdateEmployeeInput,
    actorId: string,
  ) {
    const db = getPrismaClient();
    const { version, address, terminationDate, employmentType, status, ...rest } = data;

    const updates: Record<string, unknown> = { ...rest };
    if (employmentType !== undefined) {
      updates['employmentType'] = employmentType as never;
    }
    if (status !== undefined) {
      updates['status'] = status as never;
    }
    if (terminationDate !== undefined) {
      updates['terminationDate'] = new Date(terminationDate);
    }
    if (address !== undefined) {
      updates['address'] = address as never;
    }

    const result = await db.employee.updateMany({
      where: { id, tenantId, version },
      data: {
        ...updates,
        version: { increment: 1 },
        updatedBy: actorId,
      } as never,
    });

    if (result.count === 0) {
      throw new ConflictError('Employee was modified by another user');
    }

    return db.employee.findFirstOrThrow({
      where: { id, tenantId },
      include: { department: true, position: true },
    });
  }

  // ── Leave Requests ───────────────────────────────────────────────────────────

  async findLeaveRequests(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      employeeId?: string;
      status?: string;
    },
  ) {
    const db = getPrismaClient();
    const where: Record<string, unknown> = { tenantId };

    if (opts.employeeId) {
      where['employeeId'] = opts.employeeId;
    }
    if (opts.status) {
      where['status'] = opts.status as never;
    }

    const { skip, take, orderBy } = paginationArgs({
      page: opts.page,
      limit: opts.limit,
      sortBy: opts.sortBy,
      sortDir: opts.sortDir,
    });

    const [data, total] = await db.$transaction([
      db.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { employee: true, leaveType: true },
      }),
      db.leaveRequest.count({ where }),
    ]);

    return { data, total };
  }

  async findLeaveRequestById(tenantId: string, id: string) {
    const db = getPrismaClient();
    const request = await db.leaveRequest.findFirst({
      where: { id, tenantId },
      include: { employee: true, leaveType: true },
    });
    if (!request) {
      throw new NotFoundError('LeaveRequest', id);
    }
    return request;
  }

  async findOverlappingLeaveRequests(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const db = getPrismaClient();
    const where: Record<string, unknown> = {
      tenantId,
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      AND: [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ],
    };

    if (excludeId) {
      where['id'] = { not: excludeId };
    }

    return db.leaveRequest.findMany({ where });
  }

  async createLeaveRequest(
    tenantId: string,
    data: CreateLeaveRequestInput,
    actorId: string,
  ) {
    const db = getPrismaClient();
    return db.leaveRequest.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days,
        reason: data.reason,
        createdBy: actorId,
      },
    });
  }

  async updateLeaveRequest(
    tenantId: string,
    id: string,
    data: {
      status: string;
      approvedBy?: string;
      approvedAt?: Date;
    },
  ) {
    const db = getPrismaClient();
    const request = await db.leaveRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      throw new NotFoundError('LeaveRequest', id);
    }

    return db.leaveRequest.update({
      where: { id },
      data: {
        status: data.status as never,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        version: { increment: 1 },
      },
    });
  }

  // ── Payroll Runs ─────────────────────────────────────────────────────────────

  async findPayrollRuns(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      status?: string;
    },
  ) {
    const db = getPrismaClient();
    const where: Record<string, unknown> = { tenantId };

    if (opts.status) {
      where['status'] = opts.status as never;
    }

    const { skip, take, orderBy } = paginationArgs({
      page: opts.page,
      limit: opts.limit,
      sortBy: opts.sortBy,
      sortDir: opts.sortDir,
    });

    const [data, total] = await db.$transaction([
      db.payrollRun.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { period: 'desc' },
      }),
      db.payrollRun.count({ where }),
    ]);

    return { data, total };
  }

  async findPayrollRunById(tenantId: string, id: string) {
    const db = getPrismaClient();
    const run = await db.payrollRun.findFirst({ where: { id, tenantId } });
    if (!run) {
      throw new NotFoundError('PayrollRun', id);
    }
    return run;
  }

  async createPayrollRun(
    tenantId: string,
    data: CreatePayrollRunInput,
    actorId: string,
  ) {
    const db = getPrismaClient();
    return db.payrollRun.create({
      data: {
        tenantId,
        period: data.period,
        payrollStructureId: data.payrollStructureId,
        status: 'DRAFT',
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        createdBy: actorId,
      },
    });
  }

  async updatePayrollRun(
    tenantId: string,
    id: string,
    data: {
      status?: string;
      totalGross?: number;
      totalDeductions?: number;
      totalNet?: number;
      approvedBy?: string;
      approvedAt?: Date;
      paidAt?: Date;
    },
  ) {
    const db = getPrismaClient();
    const run = await db.payrollRun.findFirst({ where: { id, tenantId } });
    if (!run) {
      throw new NotFoundError('PayrollRun', id);
    }

    const updates: Record<string, unknown> = {};
    if (data.status !== undefined) updates['status'] = data.status as never;
    if (data.totalGross !== undefined) updates['totalGross'] = data.totalGross;
    if (data.totalDeductions !== undefined) updates['totalDeductions'] = data.totalDeductions;
    if (data.totalNet !== undefined) updates['totalNet'] = data.totalNet;
    if (data.approvedBy !== undefined) updates['approvedBy'] = data.approvedBy;
    if (data.approvedAt !== undefined) updates['approvedAt'] = data.approvedAt;
    if (data.paidAt !== undefined) updates['paidAt'] = data.paidAt;

    return db.payrollRun.update({
      where: { id },
      data: { ...updates, version: { increment: 1 } } as never,
    });
  }

  // ── Pay Slips ────────────────────────────────────────────────────────────────

  async findPaySlips(tenantId: string, payrollRunId: string) {
    const db = getPrismaClient();
    return db.paySlip.findMany({
      where: { tenantId, payrollRunId },
      include: { employee: true },
      orderBy: { employee: { lastName: 'asc' } },
    });
  }

  async upsertPaySlip(
    tenantId: string,
    payrollRunId: string,
    employeeId: string,
    data: {
      grossPay: number;
      deductions: Record<string, number>;
      netPay: number;
      components: Record<string, number>;
      currency: string;
    },
  ) {
    const db = getPrismaClient();
    return db.paySlip.upsert({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
      create: {
        tenantId,
        payrollRunId,
        employeeId,
        grossPay: data.grossPay,
        deductions: data.deductions as never,
        netPay: data.netPay,
        components: data.components as never,
        currency: data.currency,
        status: 'DRAFT',
      },
      update: {
        grossPay: data.grossPay,
        deductions: data.deductions as never,
        netPay: data.netPay,
        components: data.components as never,
        currency: data.currency,
      },
    });
  }

  // ── Payroll Structure ────────────────────────────────────────────────────────

  async findPayrollStructureById(tenantId: string, id: string) {
    const db = getPrismaClient();
    const structure = await db.payrollStructure.findFirst({ where: { id, tenantId } });
    if (!structure) {
      throw new NotFoundError('PayrollStructure', id);
    }
    return structure;
  }

  // ── Active employees (for payroll calculation) ───────────────────────────────

  async findActiveEmployees(tenantId: string) {
    const db = getPrismaClient();
    return db.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { position: true },
    });
  }
}
