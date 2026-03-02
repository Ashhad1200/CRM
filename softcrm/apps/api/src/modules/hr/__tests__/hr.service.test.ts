/**
 * HR & Payroll module — HrService unit tests.
 *
 * The HrRepository and event publisher are both fully mocked so these tests
 * exercise pure service-layer logic without any DB or Redis dependency.
 */

import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// Must be declared before the modules they replace are imported.

vi.mock('../repository.js', () => {
  const HrRepository = vi.fn();
  HrRepository.prototype.findEmployeeById = vi.fn();
  HrRepository.prototype.findEmployees = vi.fn();
  HrRepository.prototype.createEmployee = vi.fn();
  HrRepository.prototype.updateEmployee = vi.fn();
  HrRepository.prototype.findDepartments = vi.fn();
  HrRepository.prototype.createDepartment = vi.fn();
  HrRepository.prototype.findLeaveRequests = vi.fn();
  HrRepository.prototype.findLeaveRequestById = vi.fn();
  HrRepository.prototype.findOverlappingLeaveRequests = vi.fn();
  HrRepository.prototype.createLeaveRequest = vi.fn();
  HrRepository.prototype.updateLeaveRequest = vi.fn();
  HrRepository.prototype.findPayrollRuns = vi.fn();
  HrRepository.prototype.findPayrollRunById = vi.fn();
  HrRepository.prototype.createPayrollRun = vi.fn();
  HrRepository.prototype.updatePayrollRun = vi.fn();
  HrRepository.prototype.findPaySlips = vi.fn();
  HrRepository.prototype.upsertPaySlip = vi.fn();
  HrRepository.prototype.findPayrollStructureById = vi.fn();
  HrRepository.prototype.findActiveEmployees = vi.fn();
  return { HrRepository };
});

vi.mock('../events.js', () => ({
  publishEmployeeCreated: vi.fn().mockResolvedValue(undefined),
  publishEmployeeUpdated: vi.fn().mockResolvedValue(undefined),
  publishLeaveRequestCreated: vi.fn().mockResolvedValue(undefined),
  publishLeaveRequestApproved: vi.fn().mockResolvedValue(undefined),
  publishLeaveRequestRejected: vi.fn().mockResolvedValue(undefined),
  publishPayrollRunApproved: vi.fn().mockResolvedValue(undefined),
  HR_EVENTS: {
    EMPLOYEE_CREATED: 'hr.employee.created',
    EMPLOYEE_UPDATED: 'hr.employee.updated',
    LEAVE_REQUEST_CREATED: 'hr.leave_request.created',
    LEAVE_REQUEST_APPROVED: 'hr.leave_request.approved',
    LEAVE_REQUEST_REJECTED: 'hr.leave_request.rejected',
    PAYROLL_RUN_APPROVED: 'hr.payroll_run.approved',
  },
}));

import { HrRepository } from '../repository.js';
import * as eventsModule from '../events.js';
import * as svc from '../service.js';
import { ValidationError } from '@softcrm/shared-kernel';

// ── Test helpers ───────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMPLOYEE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LEAVE_REQUEST_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PAYROLL_RUN_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: EMPLOYEE_ID,
    tenantId: TENANT_ID,
    employeeNumber: 'EMP-001',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: null,
    departmentId: null,
    positionId: null,
    managerId: null,
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    hireDate: new Date('2024-01-15'),
    terminationDate: null,
    avatarUrl: null,
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    updatedBy: ACTOR_ID,
    version: 1,
    department: null,
    position: null,
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAVE_REQUEST_ID,
    tenantId: TENANT_ID,
    employeeId: EMPLOYEE_ID,
    leaveTypeId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    startDate: new Date('2026-03-10'),
    endDate: new Date('2026-03-12'),
    days: 3,
    reason: 'Personal',
    status: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    version: 1,
    employee: makeEmployee(),
    leaveType: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Annual Leave' },
    ...overrides,
  };
}

function makePayrollRun(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYROLL_RUN_ID,
    tenantId: TENANT_ID,
    period: '2026-02',
    payrollStructureId: null,
    status: 'DRAFT',
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    approvedBy: null,
    approvedAt: null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    version: 1,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

let repoInstance: MockedObject<HrRepository>;

beforeEach(() => {
  vi.clearAllMocks();
  // Each test gets the mocked prototype methods from the constructor mock
  repoInstance = new HrRepository() as MockedObject<HrRepository>;
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createEmployee ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createEmployee', () => {
  it('creates an employee and publishes EMPLOYEE_CREATED event', async () => {
    const newEmployee = makeEmployee();

    // The service uses `new HrRepository()` internally — the mock constructor
    // returns the same prototype-mocked instance every call.
    vi.mocked(HrRepository.prototype.createEmployee).mockResolvedValueOnce(
      newEmployee as never,
    );

    const input = {
      employeeNumber: 'EMP-001',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      employmentType: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      hireDate: '2024-01-15',
    };

    const result = await svc.createEmployee(TENANT_ID, input, ACTOR_ID);

    expect(result.id).toBe(EMPLOYEE_ID);
    expect(HrRepository.prototype.createEmployee).toHaveBeenCalledWith(
      TENANT_ID,
      input,
      ACTOR_ID,
    );
    expect(eventsModule.publishEmployeeCreated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: EMPLOYEE_ID, email: 'jane.doe@example.com' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── approveLeave ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('approveLeave', () => {
  it('approves a PENDING leave request and publishes LEAVE_REQUEST_APPROVED event', async () => {
    const pending = makeLeaveRequest({ status: 'PENDING' });
    const approved = makeLeaveRequest({
      status: 'APPROVED',
      approvedBy: ACTOR_ID,
      approvedAt: new Date(),
    });

    vi.mocked(HrRepository.prototype.findLeaveRequestById).mockResolvedValueOnce(
      pending as never,
    );
    vi.mocked(HrRepository.prototype.updateLeaveRequest).mockResolvedValueOnce(
      approved as never,
    );

    const result = await svc.approveLeave(
      TENANT_ID,
      LEAVE_REQUEST_ID,
      { approverId: ACTOR_ID },
      ACTOR_ID,
    );

    expect(result.status).toBe('APPROVED');
    expect(HrRepository.prototype.updateLeaveRequest).toHaveBeenCalledWith(
      TENANT_ID,
      LEAVE_REQUEST_ID,
      expect.objectContaining({ status: 'APPROVED', approvedBy: ACTOR_ID }),
    );
    expect(eventsModule.publishLeaveRequestApproved).toHaveBeenCalledOnce();
  });

  it('throws ValidationError when trying to approve a non-PENDING request', async () => {
    const alreadyApproved = makeLeaveRequest({ status: 'APPROVED' });

    vi.mocked(HrRepository.prototype.findLeaveRequestById).mockResolvedValueOnce(
      alreadyApproved as never,
    );

    await expect(
      svc.approveLeave(TENANT_ID, LEAVE_REQUEST_ID, { approverId: ACTOR_ID }, ACTOR_ID),
    ).rejects.toThrow(ValidationError);

    expect(HrRepository.prototype.updateLeaveRequest).not.toHaveBeenCalled();
    expect(eventsModule.publishLeaveRequestApproved).not.toHaveBeenCalled();
  });

  it('rejects a PENDING leave request and publishes LEAVE_REQUEST_REJECTED event', async () => {
    const pending = makeLeaveRequest({ status: 'PENDING' });
    const rejected = makeLeaveRequest({
      status: 'REJECTED',
      approvedBy: ACTOR_ID,
      approvedAt: new Date(),
    });

    vi.mocked(HrRepository.prototype.findLeaveRequestById).mockResolvedValueOnce(
      pending as never,
    );
    vi.mocked(HrRepository.prototype.updateLeaveRequest).mockResolvedValueOnce(
      rejected as never,
    );

    const result = await svc.rejectLeave(
      TENANT_ID,
      LEAVE_REQUEST_ID,
      { approverId: ACTOR_ID },
      ACTOR_ID,
    );

    expect(result.status).toBe('REJECTED');
    expect(eventsModule.publishLeaveRequestRejected).toHaveBeenCalledOnce();
  });

  it('throws ValidationError when trying to reject a non-PENDING request', async () => {
    const cancelled = makeLeaveRequest({ status: 'CANCELLED' });

    vi.mocked(HrRepository.prototype.findLeaveRequestById).mockResolvedValueOnce(
      cancelled as never,
    );

    await expect(
      svc.rejectLeave(TENANT_ID, LEAVE_REQUEST_ID, { approverId: ACTOR_ID }, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createLeaveRequest — overlap validation ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createLeaveRequest', () => {
  const leaveInput = {
    employeeId: EMPLOYEE_ID,
    leaveTypeId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    days: 3,
    reason: 'Holiday',
  };

  it('creates a leave request when there are no overlapping requests', async () => {
    const employee = makeEmployee();
    const created = makeLeaveRequest();

    vi.mocked(HrRepository.prototype.findEmployeeById).mockResolvedValueOnce(
      employee as never,
    );
    vi.mocked(HrRepository.prototype.findOverlappingLeaveRequests).mockResolvedValueOnce(
      [] as never,
    );
    vi.mocked(HrRepository.prototype.createLeaveRequest).mockResolvedValueOnce(
      created as never,
    );

    const result = await svc.createLeaveRequest(TENANT_ID, leaveInput, ACTOR_ID);

    expect(result.id).toBe(LEAVE_REQUEST_ID);
    expect(eventsModule.publishLeaveRequestCreated).toHaveBeenCalledOnce();
  });

  it('throws ValidationError when overlapping leave requests exist', async () => {
    const employee = makeEmployee();
    const overlap = makeLeaveRequest({ status: 'APPROVED' });

    vi.mocked(HrRepository.prototype.findEmployeeById).mockResolvedValueOnce(
      employee as never,
    );
    vi.mocked(HrRepository.prototype.findOverlappingLeaveRequests).mockResolvedValueOnce(
      [overlap] as never,
    );

    await expect(
      svc.createLeaveRequest(TENANT_ID, leaveInput, ACTOR_ID),
    ).rejects.toThrow(ValidationError);

    expect(HrRepository.prototype.createLeaveRequest).not.toHaveBeenCalled();
    expect(eventsModule.publishLeaveRequestCreated).not.toHaveBeenCalled();
  });

  it('throws ValidationError when end date is before start date', async () => {
    const employee = makeEmployee();

    vi.mocked(HrRepository.prototype.findEmployeeById).mockResolvedValueOnce(
      employee as never,
    );

    const badInput = {
      ...leaveInput,
      startDate: '2026-03-15',
      endDate: '2026-03-10',
    };

    await expect(
      svc.createLeaveRequest(TENANT_ID, badInput, ACTOR_ID),
    ).rejects.toThrow(ValidationError);

    expect(HrRepository.prototype.findOverlappingLeaveRequests).not.toHaveBeenCalled();
    expect(HrRepository.prototype.createLeaveRequest).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── calculatePayroll ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculatePayroll', () => {
  it('calculates gross, deductions, and net pay per employee and updates the run', async () => {
    const run = makePayrollRun({
      status: 'DRAFT',
      payrollStructureId: '11111111-1111-1111-1111-111111111111',
    });

    const structure = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: TENANT_ID,
      name: 'Standard',
      components: [
        { name: 'Base Salary', type: 'EARNING', calculationType: 'FIXED', value: 5000 },
        { name: 'Bonus', type: 'EARNING', calculationType: 'PERCENTAGE', value: 10 },
        { name: 'Tax', type: 'DEDUCTION', calculationType: 'PERCENTAGE', value: 20 },
        { name: 'Health Insurance', type: 'DEDUCTION', calculationType: 'FIXED', value: 200 },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const employee = makeEmployee({
      position: { minSalary: '0', maxSalary: null },
    });

    // DRAFT run
    vi.mocked(HrRepository.prototype.findPayrollRunById)
      .mockResolvedValueOnce(run as never)           // initial fetch in calculatePayroll
      .mockResolvedValueOnce(                          // final fetch after update
        { ...run, status: 'PENDING_APPROVAL', totalGross: 5500, totalDeductions: 1300, totalNet: 4200 } as never,
      );

    vi.mocked(HrRepository.prototype.updatePayrollRun).mockResolvedValue(run as never);
    vi.mocked(HrRepository.prototype.findPayrollStructureById).mockResolvedValueOnce(
      structure as never,
    );
    vi.mocked(HrRepository.prototype.findActiveEmployees).mockResolvedValueOnce(
      [employee] as never,
    );
    vi.mocked(HrRepository.prototype.upsertPaySlip).mockResolvedValue({} as never);

    await svc.calculatePayroll(TENANT_ID, PAYROLL_RUN_ID, ACTOR_ID);

    // updatePayrollRun called twice: once for CALCULATING, once for PENDING_APPROVAL
    expect(HrRepository.prototype.updatePayrollRun).toHaveBeenCalledTimes(2);

    const calculatingCall = vi.mocked(HrRepository.prototype.updatePayrollRun).mock.calls[0]!;
    expect(calculatingCall[2]).toMatchObject({ status: 'CALCULATING' });

    const finalCall = vi.mocked(HrRepository.prototype.updatePayrollRun).mock.calls[1]!;
    expect(finalCall[2]).toMatchObject({
      status: 'PENDING_APPROVAL',
      totalGross: expect.any(Number),
      totalDeductions: expect.any(Number),
      totalNet: expect.any(Number),
    });

    expect(HrRepository.prototype.upsertPaySlip).toHaveBeenCalledOnce();
  });

  it('throws ValidationError when payroll run is not in DRAFT status', async () => {
    const run = makePayrollRun({ status: 'APPROVED' });

    vi.mocked(HrRepository.prototype.findPayrollRunById).mockResolvedValueOnce(
      run as never,
    );

    await expect(
      svc.calculatePayroll(TENANT_ID, PAYROLL_RUN_ID, ACTOR_ID),
    ).rejects.toThrow(ValidationError);

    expect(HrRepository.prototype.updatePayrollRun).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── approvePayroll ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('approvePayroll', () => {
  it('approves a PENDING_APPROVAL payroll run and publishes event', async () => {
    const run = makePayrollRun({ status: 'PENDING_APPROVAL' });
    const approved = { ...run, status: 'APPROVED', approvedBy: ACTOR_ID, approvedAt: new Date() };

    vi.mocked(HrRepository.prototype.findPayrollRunById).mockResolvedValueOnce(
      run as never,
    );
    vi.mocked(HrRepository.prototype.updatePayrollRun).mockResolvedValueOnce(
      approved as never,
    );

    const result = await svc.approvePayroll(
      TENANT_ID,
      PAYROLL_RUN_ID,
      { approverId: ACTOR_ID },
      ACTOR_ID,
    );

    expect(HrRepository.prototype.updatePayrollRun).toHaveBeenCalledWith(
      TENANT_ID,
      PAYROLL_RUN_ID,
      expect.objectContaining({ status: 'APPROVED', approvedBy: ACTOR_ID }),
    );
    expect(eventsModule.publishPayrollRunApproved).toHaveBeenCalledOnce();
  });

  it('throws ValidationError when run is not PENDING_APPROVAL', async () => {
    const run = makePayrollRun({ status: 'DRAFT' });

    vi.mocked(HrRepository.prototype.findPayrollRunById).mockResolvedValueOnce(
      run as never,
    );

    await expect(
      svc.approvePayroll(TENANT_ID, PAYROLL_RUN_ID, { approverId: ACTOR_ID }, ACTOR_ID),
    ).rejects.toThrow(ValidationError);

    expect(HrRepository.prototype.updatePayrollRun).not.toHaveBeenCalled();
    expect(eventsModule.publishPayrollRunApproved).not.toHaveBeenCalled();
  });
});
