import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Enum schemas (mirror Prisma enums) ─────────────────────────────────────────

export const employmentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
]);

export const employeeStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'TERMINATED',
]);

export const leaveRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const payrollRunStatusSchema = z.enum([
  'DRAFT',
  'CALCULATING',
  'PENDING_APPROVAL',
  'APPROVED',
  'PAID',
]);

// ── Department schemas ─────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(200),
  parentDepartmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
});

// ── Employee schemas ───────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  userId: z.string().uuid().optional(),
  employeeNumber: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  employmentType: employmentTypeSchema.default('FULL_TIME'),
  status: employeeStatusSchema.default('ACTIVE'),
  hireDate: z.coerce.string().min(1),
  avatarUrl: z.string().url().optional(),
  address: z.record(z.unknown()).optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  employmentType: employmentTypeSchema.optional(),
  status: employeeStatusSchema.optional(),
  terminationDate: z.coerce.string().optional(),
  avatarUrl: z.string().url().optional(),
  address: z.record(z.unknown()).optional(),
  version: z.number().int().positive(),
});

export const listEmployeesQuerySchema = paginationSchema.extend({
  departmentId: z.string().uuid().optional(),
  status: employeeStatusSchema.optional(),
  search: z.string().optional(),
});

// ── Leave request schemas ──────────────────────────────────────────────────────

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.coerce.string().min(1),
  endDate: z.coerce.string().min(1),
  days: z.number().positive().max(365),
  reason: z.string().max(1000).optional(),
});

export const approveLeaveSchema = z.object({
  approverId: z.string().uuid(),
});

export const listLeaveRequestsQuerySchema = paginationSchema.extend({
  employeeId: z.string().uuid().optional(),
  status: leaveRequestStatusSchema.optional(),
});

// ── Payroll run schemas ────────────────────────────────────────────────────────

export const createPayrollRunSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
  payrollStructureId: z.string().uuid().optional(),
});

export const approvePayrollRunSchema = z.object({
  approverId: z.string().uuid(),
});

export const listPayrollRunsQuerySchema = paginationSchema.extend({
  status: payrollRunStatusSchema.optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type ListLeaveRequestsQuery = z.infer<typeof listLeaveRequestsQuerySchema>;
export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
export type ApprovePayrollRunInput = z.infer<typeof approvePayrollRunSchema>;
export type ListPayrollRunsQuery = z.infer<typeof listPayrollRunsQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
