import { useState } from 'react';
import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useCancelLeaveRequest,
  useLeaveTypes,
  useEmployees,
} from '../api';
import type { LeaveRequest, LeaveRequestStatus } from '../api';

const STATUS_COLORS: Record<LeaveRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

type Tab = 'requests' | 'calendar';

function CreateLeaveRequestDialog({ onClose }: { onClose: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const createLeaveRequest = useCreateLeaveRequest();
  const { data: employeesData } = useEmployees({ status: 'ACTIVE' });
  const { data: leaveTypesData } = useLeaveTypes();

  const employees = employeesData?.data ?? [];
  const leaveTypes = leaveTypesData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLeaveRequest.mutate(
      {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Leave Request
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Employee *
        </label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select Employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName} ({e.employeeNumber})
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Leave Type *
        </label>
        <select
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select Leave Type</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name} ({lt.maxDaysPerYear} days/year)
            </option>
          ))}
        </select>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

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
            disabled={createLeaveRequest.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createLeaveRequest.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createLeaveRequest.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createLeaveRequest.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function LeavePage() {
  const [tab, setTab] = useState<Tab>('requests');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useLeaveRequests(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();

  const leaveRequests: LeaveRequest[] = data?.data ?? [];

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium ${
      tab === t
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  // Group leaves by month for calendar view
  const leavesByMonth: Record<string, LeaveRequest[]> = {};
  leaveRequests.forEach((lr) => {
    const month = lr.startDate.substring(0, 7);
    if (!leavesByMonth[month]) leavesByMonth[month] = [];
    leavesByMonth[month].push(lr);
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Leave Request
        </button>
      </div>

      {showCreate && (
        <CreateLeaveRequestDialog onClose={() => setShowCreate(false)} />
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('requests')} className={tabClass('requests')}>
          Requests
        </button>
        <button onClick={() => setTab('calendar')} className={tabClass('calendar')}>
          Calendar
        </button>
      </div>

      {/* Requests Tab */}
      {tab === 'requests' && (
        <>
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {isLoading && <p className="text-gray-500">Loading...</p>}
          {isError && <p className="text-red-600">{error.message}</p>}

          {data && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Leave Type</th>
                  <th className="px-3 py-3">Start Date</th>
                  <th className="px-3 py-3">End Date</th>
                  <th className="px-3 py-3">Days</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-gray-400"
                    >
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((lr) => (
                    <tr key={lr.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {lr.employee
                          ? `${lr.employee.firstName} ${lr.employee.lastName}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {lr.leaveType?.name ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(lr.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(lr.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{lr.days}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs ${
                            STATUS_COLORS[lr.status]
                          }`}
                        >
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {lr.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveLeave.mutate(lr.id)}
                              disabled={approveLeave.isPending}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectLeave.mutate({ id: lr.id })}
                              disabled={rejectLeave.isPending}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {lr.status === 'APPROVED' && (
                          <button
                            onClick={() => cancelLeave.mutate(lr.id)}
                            disabled={cancelLeave.isPending}
                            className="text-sm text-gray-600 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div className="space-y-6">
          {Object.keys(leavesByMonth).length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              No leave requests to display.
            </p>
          ) : (
            Object.entries(leavesByMonth)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([month, leaves]) => (
                <div key={month} className="rounded border border-gray-200 bg-white p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    {new Date(month + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <div className="space-y-2">
                    {leaves.map((lr) => (
                      <div
                        key={lr.id}
                        className={`flex items-center justify-between rounded px-3 py-2 ${
                          lr.status === 'APPROVED'
                            ? 'bg-green-50'
                            : lr.status === 'PENDING'
                            ? 'bg-yellow-50'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                            {lr.employee?.firstName?.[0]}
                            {lr.employee?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {lr.employee
                                ? `${lr.employee.firstName} ${lr.employee.lastName}`
                                : 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {lr.leaveType?.name} - {lr.days} days
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(lr.startDate).toLocaleDateString()} -{' '}
                            {new Date(lr.endDate).toLocaleDateString()}
                          </p>
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${
                              STATUS_COLORS[lr.status]
                            }`}
                          >
                            {lr.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
