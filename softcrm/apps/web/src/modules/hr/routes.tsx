import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const EmployeesList = lazy(() => import('./pages/employees-list'));
const EmployeeDetail = lazy(() => import('./pages/employee-detail'));
const DepartmentsList = lazy(() => import('./pages/departments-list'));
const LeavePage = lazy(() => import('./pages/leave'));
const PayrollPage = lazy(() => import('./pages/payroll'));
const PayrollRunDetail = lazy(() => import('./pages/payroll-run-detail'));
const RecruitmentPage = lazy(() => import('./pages/recruitment'));
const JobPostingDetail = lazy(() => import('./pages/job-posting-detail'));
const ApplicantDetail = lazy(() => import('./pages/applicant-detail'));
const AttendancePage = lazy(() => import('./pages/attendance'));
const OrgChartPage = lazy(() => import('./pages/org-chart'));

const tabs: ModuleTab[] = [
  { label: 'Employees', to: 'employees' },
  { label: 'Departments', to: 'departments' },
  { label: 'Attendance', to: 'attendance' },
  { label: 'Leave', to: 'leave' },
  { label: 'Payroll', to: 'payroll' },
  { label: 'Recruitment', to: 'recruitment' },
  { label: 'Org Chart', to: 'org-chart' },
];

export function HRRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="employees" replace />} />
      <Route element={<ModuleLayout title="HR" tabs={tabs} />}>
        <Route path="employees" element={<EmployeesList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="departments" element={<DepartmentsList />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/:id" element={<PayrollRunDetail />} />
        <Route path="recruitment" element={<RecruitmentPage />} />
        <Route path="recruitment/postings/:id" element={<JobPostingDetail />} />
        <Route path="recruitment/applicants/:id" element={<ApplicantDetail />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="org-chart" element={<OrgChartPage />} />
      </Route>
    </Routes>
  );
}
