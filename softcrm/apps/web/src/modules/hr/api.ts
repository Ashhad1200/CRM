import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

/* ───────── Types ───────── */

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollRunStatus = 'DRAFT' | 'CALCULATING' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
export type PaySlipStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export type ApplicantStatus = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
export type JobPostingStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';

export interface Department {
  id: string;
  name: string;
  parentDepartmentId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
  parentDepartment?: Department;
  childDepartments?: Department[];
  employeeCount?: number;
}

export interface Position {
  id: string;
  name: string;
  departmentId?: string;
  minSalary?: string;
  maxSalary?: string;
  createdAt: string;
  updatedAt: string;
  department?: Department;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  hireDate: string;
  terminationDate?: string;
  avatarUrl?: string;
  address?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
  department?: Department;
  position?: Position;
  manager?: Employee;
}

export interface LeaveType {
  id: string;
  name: string;
  maxDaysPerYear: number;
  carryOver: boolean;
  paidLeave: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string;
  reason?: string;
  status: LeaveRequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  employee?: Employee;
  leaveType?: LeaveType;
}

export interface PayrollRun {
  id: string;
  period: string;
  payrollStructureId?: string;
  status: PayrollRunStatus;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  paySlipCount?: number;
}

export interface PaySlip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: string;
  deductions: Record<string, unknown>;
  netPay: string;
  components: Record<string, unknown>;
  currency: string;
  status: PaySlipStatus;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  payrollRun?: PayrollRun;
}

export interface JobPosting {
  id: string;
  title: string;
  description?: string;
  positionId?: string;
  departmentId?: string;
  location?: string;
  employmentType: EmploymentType;
  salaryMin?: string;
  salaryMax?: string;
  status: JobPostingStatus;
  postedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  position?: Position;
  department?: Department;
  applicantCount?: number;
}

export interface Applicant {
  id: string;
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: ApplicantStatus;
  rating?: number;
  notes?: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  jobPosting?: JobPosting;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface Single<T> {
  data: T;
}

/* ───────── Query keys ───────── */

export const hrKeys = {
  employees: ['hr', 'employees'] as const,
  employee: (id: string) => ['hr', 'employees', id] as const,
  departments: ['hr', 'departments'] as const,
  department: (id: string) => ['hr', 'departments', id] as const,
  positions: ['hr', 'positions'] as const,
  position: (id: string) => ['hr', 'positions', id] as const,
  leaveTypes: ['hr', 'leaveTypes'] as const,
  leaveRequests: ['hr', 'leaveRequests'] as const,
  leaveRequest: (id: string) => ['hr', 'leaveRequests', id] as const,
  payrollRuns: ['hr', 'payrollRuns'] as const,
  payrollRun: (id: string) => ['hr', 'payrollRuns', id] as const,
  payslips: (employeeId?: string) => ['hr', 'payslips', employeeId] as const,
  payslip: (id: string) => ['hr', 'payslip', id] as const,
  jobPostings: ['hr', 'jobPostings'] as const,
  jobPosting: (id: string) => ['hr', 'jobPostings', id] as const,
  applicants: (jobPostingId?: string) => ['hr', 'applicants', jobPostingId] as const,
  applicant: (id: string) => ['hr', 'applicant', id] as const,
};

/* ───────── Helpers ───────── */

function buildUrl(base: string, filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams(filters);
  return `${base}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Employees
   ═══════════════════════════════════════════════════════════════════════════ */

export function useEmployees(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.employees, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Employee>>(buildUrl('/api/v1/hr/employees', filters)),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () =>
      apiClient<Single<Employee>>(`/api/v1/hr/employees/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Employee>>('/api/v1/hr/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.employees });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Employee>>(`/api/v1/hr/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employees });
      void qc.invalidateQueries({ queryKey: hrKeys.employee(vars.id) });
    },
  });
}

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, terminationDate }: { id: string; terminationDate: string }) =>
      apiClient<Single<Employee>>(`/api/v1/hr/employees/${id}/terminate`, {
        method: 'POST',
        body: JSON.stringify({ terminationDate }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employees });
      void qc.invalidateQueries({ queryKey: hrKeys.employee(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Departments
   ═══════════════════════════════════════════════════════════════════════════ */

export function useDepartments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.departments, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Department>>(buildUrl('/api/v1/hr/departments', filters)),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: hrKeys.department(id),
    queryFn: () =>
      apiClient<Single<Department>>(`/api/v1/hr/departments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Department>>('/api/v1/hr/departments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Department>>(`/api/v1/hr/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments });
      void qc.invalidateQueries({ queryKey: hrKeys.department(vars.id) });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/hr/departments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Positions
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePositions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.positions, filters] as const,
    queryFn: () =>
      apiClient<Paginated<Position>>(buildUrl('/api/v1/hr/positions', filters)),
  });
}

export function usePosition(id: string) {
  return useQuery({
    queryKey: hrKeys.position(id),
    queryFn: () =>
      apiClient<Single<Position>>(`/api/v1/hr/positions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Position>>('/api/v1/hr/positions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.positions });
    },
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Position>>(`/api/v1/hr/positions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.positions });
      void qc.invalidateQueries({ queryKey: hrKeys.position(vars.id) });
    },
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/hr/positions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.positions });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Leave Types
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLeaveTypes() {
  return useQuery({
    queryKey: hrKeys.leaveTypes,
    queryFn: () =>
      apiClient<Paginated<LeaveType>>('/api/v1/hr/leave-types'),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Leave Requests
   ═══════════════════════════════════════════════════════════════════════════ */

export function useLeaveRequests(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.leaveRequests, filters] as const,
    queryFn: () =>
      apiClient<Paginated<LeaveRequest>>(buildUrl('/api/v1/hr/leave-requests', filters)),
  });
}

export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: hrKeys.leaveRequest(id),
    queryFn: () =>
      apiClient<Single<LeaveRequest>>(`/api/v1/hr/leave-requests/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<LeaveRequest>>('/api/v1/hr/leave-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequests });
    },
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<LeaveRequest>>(`/api/v1/hr/leave-requests/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequests });
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequest(id) });
    },
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<Single<LeaveRequest>>(`/api/v1/hr/leave-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequests });
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequest(vars.id) });
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<LeaveRequest>>(`/api/v1/hr/leave-requests/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequests });
      void qc.invalidateQueries({ queryKey: hrKeys.leaveRequest(id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Runs
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePayrollRuns(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.payrollRuns, filters] as const,
    queryFn: () =>
      apiClient<Paginated<PayrollRun>>(buildUrl('/api/v1/hr/payroll-runs', filters)),
  });
}

export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: hrKeys.payrollRun(id),
    queryFn: () =>
      apiClient<Single<PayrollRun>>(`/api/v1/hr/payroll-runs/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<PayrollRun>>('/api/v1/hr/payroll-runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.payrollRuns });
    },
  });
}

export function useApprovePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<PayrollRun>>(`/api/v1/hr/payroll-runs/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payrollRuns });
      void qc.invalidateQueries({ queryKey: hrKeys.payrollRun(id) });
    },
  });
}

export function useMarkPayrollRunPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<PayrollRun>>(`/api/v1/hr/payroll-runs/${id}/pay`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payrollRuns });
      void qc.invalidateQueries({ queryKey: hrKeys.payrollRun(id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Payslips
   ═══════════════════════════════════════════════════════════════════════════ */

export function usePayslips(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.payslips(filters?.['employeeId']), filters] as const,
    queryFn: () =>
      apiClient<Paginated<PaySlip>>(buildUrl('/api/v1/hr/payslips', filters)),
  });
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: hrKeys.payslip(id),
    queryFn: () =>
      apiClient<Single<PaySlip>>(`/api/v1/hr/payslips/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function usePayslipsByPayrollRun(payrollRunId: string) {
  return useQuery({
    queryKey: ['hr', 'payrollRuns', payrollRunId, 'payslips'] as const,
    queryFn: () =>
      apiClient<Paginated<PaySlip>>(`/api/v1/hr/payroll-runs/${payrollRunId}/payslips`),
    enabled: !!payrollRunId,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Job Postings
   ═══════════════════════════════════════════════════════════════════════════ */

export function useJobPostings(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.jobPostings, filters] as const,
    queryFn: () =>
      apiClient<Paginated<JobPosting>>(buildUrl('/api/v1/hr/job-postings', filters)),
  });
}

export function useJobPosting(id: string) {
  return useQuery({
    queryKey: hrKeys.jobPosting(id),
    queryFn: () =>
      apiClient<Single<JobPosting>>(`/api/v1/hr/job-postings/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<JobPosting>>('/api/v1/hr/job-postings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
    },
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<JobPosting>>(`/api/v1/hr/job-postings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
      void qc.invalidateQueries({ queryKey: hrKeys.jobPosting(vars.id) });
    },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/hr/job-postings/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
    },
  });
}

export function usePublishJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<JobPosting>>(`/api/v1/hr/job-postings/${id}/publish`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
      void qc.invalidateQueries({ queryKey: hrKeys.jobPosting(id) });
    },
  });
}

export function useCloseJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Single<JobPosting>>(`/api/v1/hr/job-postings/${id}/close`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
      void qc.invalidateQueries({ queryKey: hrKeys.jobPosting(id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Applicants
   ═══════════════════════════════════════════════════════════════════════════ */

export function useApplicants(filters?: Record<string, string>) {
  return useQuery({
    queryKey: [...hrKeys.applicants(filters?.['jobPostingId']), filters] as const,
    queryFn: () =>
      apiClient<Paginated<Applicant>>(buildUrl('/api/v1/hr/applicants', filters)),
  });
}

export function useApplicant(id: string) {
  return useQuery({
    queryKey: hrKeys.applicant(id),
    queryFn: () =>
      apiClient<Single<Applicant>>(`/api/v1/hr/applicants/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<Single<Applicant>>('/api/v1/hr/applicants', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.applicants() });
      void qc.invalidateQueries({ queryKey: hrKeys.jobPostings });
    },
  });
}

export function useUpdateApplicantStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ApplicantStatus; notes?: string }) =>
      apiClient<Single<Applicant>>(`/api/v1/hr/applicants/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.applicants() });
      void qc.invalidateQueries({ queryKey: hrKeys.applicant(vars.id) });
    },
  });
}

export function useUpdateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient<Single<Applicant>>(`/api/v1/hr/applicants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.applicants() });
      void qc.invalidateQueries({ queryKey: hrKeys.applicant(vars.id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Attendance
   ═══════════════════════════════════════════════════════════════════════════ */

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient('/api/v1/hr/attendance/check-in', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient('/api/v1/hr/attendance/check-out', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    },
  });
}

export function useTimesheet(employeeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['hr', 'attendance', 'timesheet', employeeId, startDate, endDate],
    queryFn: () =>
      apiClient<{ data: any[] }>(
        `/api/v1/hr/attendance/timesheet?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
      ).then((r) => r.data),
    enabled: !!employeeId && !!startDate && !!endDate,
  });
}

export function useAttendanceSummary(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['hr', 'attendance', 'summary', employeeId, month, year],
    queryFn: () =>
      apiClient<{ data: any }>(
        `/api/v1/hr/attendance/summary?employeeId=${employeeId}&month=${month}&year=${year}`,
      ).then((r) => r.data),
    enabled: !!employeeId,
  });
}

export function useLeaveBalance(employeeId: string) {
  return useQuery({
    queryKey: ['hr', 'leave-balance', employeeId],
    queryFn: () =>
      apiClient<{ data: any }>(
        `/api/v1/hr/employees/${employeeId}/leave-balance`,
      ).then((r) => r.data),
    enabled: !!employeeId,
  });
}

export function useLeaveCalendar(month: number, year: number) {
  return useQuery({
    queryKey: ['hr', 'leave-calendar', month, year],
    queryFn: () =>
      apiClient<{ data: any[] }>(
        `/api/v1/hr/leave-calendar?month=${month}&year=${year}`,
      ).then((r) => r.data),
  });
}
