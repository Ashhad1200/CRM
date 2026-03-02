/**
 * HR & Payroll module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows and publishes them to the event bus (BullMQ).
 * This guarantees at-least-once delivery even if the process crashes
 * between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── HR event type constants ────────────────────────────────────────────────────

export const HR_EVENTS = {
  EMPLOYEE_CREATED: 'hr.employee.created',
  EMPLOYEE_UPDATED: 'hr.employee.updated',
  LEAVE_REQUEST_CREATED: 'hr.leave_request.created',
  LEAVE_REQUEST_APPROVED: 'hr.leave_request.approved',
  LEAVE_REQUEST_REJECTED: 'hr.leave_request.rejected',
  PAYROLL_RUN_APPROVED: 'hr.payroll_run.approved',
} as const;

export type HrEventType = (typeof HR_EVENTS)[keyof typeof HR_EVENTS];

// ── Outbox helper ──────────────────────────────────────────────────────────────

interface OutboxPayload {
  tenantId: string;
  actorId: string;
  aggregateType: string;
  correlationId: string;
  data: unknown;
}

async function writeToOutbox(
  eventType: string,
  aggregateId: string,
  payload: OutboxPayload,
): Promise<void> {
  const db = getPrismaClient();
  await db.outbox.create({
    data: {
      id: generateId(),
      eventType,
      aggregateId,
      payload: payload as never,
      publishedAt: null,
    },
  });
}

// ── Employee events ────────────────────────────────────────────────────────────

export async function publishEmployeeCreated(
  tenantId: string,
  actorId: string,
  employee: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string | null;
  },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.EMPLOYEE_CREATED, employee.id, {
    tenantId,
    actorId,
    aggregateType: 'Employee',
    correlationId: generateId(),
    data: {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.departmentId,
    },
  });
}

export async function publishEmployeeUpdated(
  tenantId: string,
  actorId: string,
  employee: { id: string; status: string },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.EMPLOYEE_UPDATED, employee.id, {
    tenantId,
    actorId,
    aggregateType: 'Employee',
    correlationId: generateId(),
    data: {
      employeeId: employee.id,
      status: employee.status,
    },
  });
}

// ── Leave request events ───────────────────────────────────────────────────────

export async function publishLeaveRequestCreated(
  tenantId: string,
  actorId: string,
  leaveRequest: {
    id: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    days: unknown;
  },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.LEAVE_REQUEST_CREATED, leaveRequest.id, {
    tenantId,
    actorId,
    aggregateType: 'LeaveRequest',
    correlationId: generateId(),
    data: {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      days: String(leaveRequest.days),
    },
  });
}

export async function publishLeaveRequestApproved(
  tenantId: string,
  actorId: string,
  leaveRequest: { id: string; employeeId: string; approvedBy: string | null },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.LEAVE_REQUEST_APPROVED, leaveRequest.id, {
    tenantId,
    actorId,
    aggregateType: 'LeaveRequest',
    correlationId: generateId(),
    data: {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      approvedBy: leaveRequest.approvedBy,
    },
  });
}

export async function publishLeaveRequestRejected(
  tenantId: string,
  actorId: string,
  leaveRequest: { id: string; employeeId: string; approvedBy: string | null },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.LEAVE_REQUEST_REJECTED, leaveRequest.id, {
    tenantId,
    actorId,
    aggregateType: 'LeaveRequest',
    correlationId: generateId(),
    data: {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      rejectedBy: leaveRequest.approvedBy,
    },
  });
}

// ── Payroll run events ─────────────────────────────────────────────────────────

export async function publishPayrollRunApproved(
  tenantId: string,
  actorId: string,
  payrollRun: {
    id: string;
    period: string;
    totalNet: unknown;
    approvedBy: string | null;
  },
): Promise<void> {
  await writeToOutbox(HR_EVENTS.PAYROLL_RUN_APPROVED, payrollRun.id, {
    tenantId,
    actorId,
    aggregateType: 'PayrollRun',
    correlationId: generateId(),
    data: {
      payrollRunId: payrollRun.id,
      period: payrollRun.period,
      totalNet: String(payrollRun.totalNet),
      approvedBy: payrollRun.approvedBy,
    },
  });
}
