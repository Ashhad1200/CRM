import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useEmployee,
  useUpdateEmployee,
  useTerminateEmployee,
  useDepartments,
  usePositions,
  usePayslips,
  useLeaveRequests,
} from '../api';
import type { EmploymentType, EmployeeStatus } from '../api';

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

type Tab = 'details' | 'payslips' | 'leave';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading, isError, error } = useEmployee(id ?? '');
  const updateEmployee = useUpdateEmployee();
  const terminateEmployee = useTerminateEmployee();
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();
  const { data: payslipsData } = usePayslips(id ? { employeeId: id } : undefined);
  const { data: leaveData } = useLeaveRequests(id ? { employeeId: id } : undefined);

  const departments = departmentsData?.data ?? [];
  const positions = positionsData?.data ?? [];
  const payslips = payslipsData?.data ?? [];
  const leaveRequests = leaveData?.data ?? [];

  const [tab, setTab] = useState<Tab>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]!);

  useEffect(() => {
    if (employee) {
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmail(employee.email);
      setPhone(employee.phone ?? '');
      setDepartmentId(employee.departmentId ?? '');
      setPositionId(employee.positionId ?? '');
      setEmploymentType(employee.employmentType);
    }
  }, [employee]);

  if (!id) return <p className="p-6 text-gray-400">Employee not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!employee) return <p className="p-6 text-gray-400">Employee not found.</p>;

  const handleSave = () => {
    updateEmployee.mutate({
      id,
      version: employee.version,
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      departmentId: departmentId || undefined,
      positionId: positionId || undefined,
      employmentType,
    });
  };

  const handleTerminate = () => {
    terminateEmployee.mutate(
      { id: id!, terminationDate },
      { onSuccess: () => setShowTerminate(false) }
    );
  };

  const statusColors = STATUS_COLORS[employee.status] ?? STATUS_COLORS['ACTIVE'];

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t ${
      tab === t
        ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/hr/employees')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Employees
        </button>
        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600">
          {employee.firstName[0]}{employee.lastName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-gray-500">{employee.employeeNumber}</p>
        </div>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}>
          {employee.status.replace('_', ' ')}
        </span>
      </div>

      {/* Sub-header info */}
      <div className="mb-6 flex gap-6 text-sm text-gray-600">
        {employee.department && <span>Department: {employee.department.name}</span>}
        {employee.position && <span>Position: {employee.position.name}</span>}
        <span>Hired: {new Date(employee.hireDate).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      {employee.status !== 'TERMINATED' && (
        <div className="mb-6">
          <button
            onClick={() => setShowTerminate(true)}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Terminate Employee
          </button>
        </div>
      )}

      {/* Terminate dialog */}
      {showTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Terminate Employee
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to terminate {employee.firstName} {employee.lastName}?
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Termination Date
            </label>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTerminate(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminateEmployee.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {terminateEmployee.isPending ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('payslips')} className={tabClass('payslips')}>
          Payslips
        </button>
        <button onClick={() => setTab('leave')} className={tabClass('leave')}>
          Leave
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Position
                </label>
                <select
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Position</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateEmployee.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateEmployee.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>

            {updateEmployee.isError && (
              <p className="text-sm text-red-600">
                {updateEmployee.error.message}
              </p>
            )}
            {updateEmployee.isSuccess && (
              <p className="text-sm text-green-600">Employee updated.</p>
            )}
          </div>
        )}

        {/* Payslips tab */}
        {tab === 'payslips' && (
          <div>
            {payslips.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                No payslips found for this employee.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Period</th>
                    <th className="px-3 py-3">Gross Pay</th>
                    <th className="px-3 py-3">Net Pay</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((ps) => (
                    <tr key={ps.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {ps.payrollRun?.period ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {ps.currency} {parseFloat(ps.grossPay).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {ps.currency} {parseFloat(ps.netPay).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          ps.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          ps.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ps.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {new Date(ps.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Leave tab */}
        {tab === 'leave' && (
          <div>
            {leaveRequests.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                No leave requests found for this employee.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Start Date</th>
                    <th className="px-3 py-3">End Date</th>
                    <th className="px-3 py-3">Days</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((lr) => (
                    <tr key={lr.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {lr.leaveType?.name ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(lr.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(lr.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {lr.days}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          lr.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          lr.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          lr.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {lr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
