import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useEmployees, useCreateEmployee, useDepartments, usePositions } from '../api';
import type { Employee, EmploymentType, EmployeeStatus } from '../api';

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS['ACTIVE'];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CreateEmployeeDialog({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);

  const createEmployee = useCreateEmployee();
  const { data: departmentsData } = useDepartments();
  const { data: positionsData } = usePositions();

  const departments = departmentsData?.data ?? [];
  const positions = positionsData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployee.mutate(
      {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        employeeNumber,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        employmentType,
        hireDate,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Employee
        </h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Employee Number *
            </label>
            <input
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              required
              placeholder="EMP001"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hire Date *
            </label>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select Department</option>
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
              <option value="">Select Position</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Employment Type
          </label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createEmployee.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createEmployee.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createEmployee.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createEmployee.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function EmployeesListPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useEmployees(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const employees: Employee[] = data?.data ?? [];

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const empNum = e.employeeNumber.toLowerCase();
    const email = e.email.toLowerCase();
    return name.includes(q) || empNum.includes(q) || email.includes(q);
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Employee
        </button>
      </div>

      {showCreate && (
        <CreateEmployeeDialog onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search by name, employee number, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Employee #</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Position</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Hire Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/hr/employees/${e.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {e.firstName[0]}{e.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">
                        {e.firstName} {e.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.employeeNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.email}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.department?.name ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.position?.name ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {EMPLOYMENT_TYPE_LABELS[e.employmentType]}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(e.hireDate).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
