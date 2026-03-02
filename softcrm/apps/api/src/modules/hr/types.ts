/**
 * HR & Payroll module — TypeScript interfaces and domain types.
 *
 * Prisma Decimal values arrive as Decimal instances at runtime; the
 * DecimalValue alias keeps this file independent of a direct @prisma/client import.
 */

export type DecimalValue = string | number | { toFixed(dp?: number): string };

// ── Enums ──────────────────────────────────────────────────────────────────────

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY';
export type PayrollRunStatus = 'DRAFT' | 'CALCULATING' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
export type PaySlipStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export type BenefitType = 'HEALTH' | 'DENTAL' | 'VISION' | 'RETIREMENT' | 'OTHER';
export type PayrollComponentType = 'EARNING' | 'DEDUCTION';
export type PayrollCalculationType = 'FIXED' | 'PERCENTAGE';

// ── Payroll component definition stored in PayrollStructure.components JSON ────

export interface PayrollComponent {
  name: string;
  type: PayrollComponentType;
  calculationType: PayrollCalculationType;
  value: number;
}

// ── Entity types ───────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  parentDepartmentId: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  tenantId: string;
  name: string;
  departmentId: string | null;
  minSalary: DecimalValue | null;
  maxSalary: DecimalValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  tenantId: string;
  userId: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  hireDate: Date;
  terminationDate: Date | null;
  avatarUrl: string | null;
  address: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface LeaveType {
  id: string;
  tenantId: string;
  name: string;
  maxDaysPerYear: number;
  carryOver: boolean;
  paidLeave: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: DecimalValue;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
}

export interface Attendance {
  id: string;
  tenantId: string;
  employeeId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  hoursWorked: DecimalValue | null;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollStructure {
  id: string;
  tenantId: string;
  name: string;
  components: PayrollComponent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  period: string;
  payrollStructureId: string | null;
  status: PayrollRunStatus;
  totalGross: DecimalValue;
  totalDeductions: DecimalValue;
  totalNet: DecimalValue;
  approvedBy: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
}

export interface PaySlip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: DecimalValue;
  deductions: Record<string, DecimalValue>;
  netPay: DecimalValue;
  components: Record<string, DecimalValue>;
  currency: string;
  status: PaySlipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Benefit {
  id: string;
  tenantId: string;
  name: string;
  type: BenefitType;
  employerContribution: DecimalValue;
  employeeContribution: DecimalValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxBracket {
  id: string;
  tenantId: string;
  name: string;
  minIncome: DecimalValue;
  maxIncome: DecimalValue | null;
  rate: DecimalValue;
  createdAt: Date;
  updatedAt: Date;
}

// ── DTO types ──────────────────────────────────────────────────────────────────

export interface CreateDepartmentDto {
  name: string;
  parentDepartmentId?: string;
  managerId?: string;
}

export interface CreateEmployeeDto {
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
  hireDate: string;
  avatarUrl?: string;
  address?: Record<string, unknown>;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
  terminationDate?: string;
  avatarUrl?: string;
  address?: Record<string, unknown>;
  version: number;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

export interface ApproveLeaveDto {
  approverId: string;
}

export interface CreatePayrollRunDto {
  period: string;
  payrollStructureId?: string;
}

export interface ApprovePayrollRunDto {
  approverId: string;
}

// ── List query types ───────────────────────────────────────────────────────────

export interface ListQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListEmployeesQuery extends ListQuery {
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
}

export interface ListLeaveRequestsQuery extends ListQuery {
  employeeId?: string;
  status?: LeaveRequestStatus;
}

export interface ListPayrollRunsQuery extends ListQuery {
  status?: PayrollRunStatus;
}
