import { useState } from 'react';
import {
  useCheckIn,
  useCheckOut,
  useTimesheet,
  useAttendanceSummary,
  useEmployees,
} from '../api';

const now = new Date();

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  const { data: employeesData } = useEmployees({ status: 'ACTIVE' });
  const employees = employeesData?.data ?? [];

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const { data: timesheet, isLoading: tsLoading } = useTimesheet(
    employeeId,
    startDate,
    endDate,
  );
  const { data: summary } = useAttendanceSummary(employeeId, month, year);

  const timesheetRows: any[] = timesheet ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex gap-2">
          <button
            onClick={() => checkIn.mutate()}
            disabled={checkIn.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {checkIn.isPending ? 'Checking in...' : '🕐 Check In'}
          </button>
          <button
            onClick={() => checkOut.mutate()}
            disabled={checkOut.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {checkOut.isPending ? 'Checking out...' : '🕐 Check Out'}
          </button>
        </div>
      </div>

      {(checkIn.isSuccess || checkOut.isSuccess) && (
        <div className="mb-4 rounded bg-green-50 px-4 py-2 text-sm text-green-700">
          {checkIn.isSuccess ? 'Checked in successfully!' : 'Checked out successfully!'}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Employee
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Month
          </label>
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-');
              setYear(parseInt(y ?? '2025', 10));
              setMonth(parseInt(m ?? '1', 10));
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Days Present</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.daysPresent ?? 0}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Days Absent</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.daysAbsent ?? 0}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Late Arrivals</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.lateArrivals ?? 0}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalHours ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      {!employeeId && (
        <p className="py-8 text-center text-gray-400">
          Select an employee to view their timesheet.
        </p>
      )}

      {employeeId && tsLoading && (
        <p className="text-gray-500">Loading timesheet...</p>
      )}

      {employeeId && !tsLoading && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Check In</th>
              <th className="px-3 py-3">Check Out</th>
              <th className="px-3 py-3">Hours</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {timesheetRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No timesheet entries for this period.
                </td>
              </tr>
            ) : (
              timesheetRows.map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {row.date
                      ? new Date(row.date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {row.checkIn ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {row.checkOut ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {row.hours ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        row.status === 'PRESENT'
                          ? 'bg-green-100 text-green-700'
                          : row.status === 'LATE'
                          ? 'bg-yellow-100 text-yellow-700'
                          : row.status === 'ABSENT'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.status ?? 'N/A'}
                    </span>
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
