import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSessions } from '../api';
import type { POSSession } from '../api';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS['CLOSED'];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status}
    </span>
  );
}

export default function SessionsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = useSessions(
    statusFilter ? { status: statusFilter } : undefined,
  );

  const sessions: POSSession[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
      </div>

      <div className="mb-4 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Register</th>
              <th className="px-3 py-3">Opened</th>
              <th className="px-3 py-3">Closed</th>
              <th className="px-3 py-3">Opening Cash</th>
              <th className="px-3 py-3">Closing Cash</th>
              <th className="px-3 py-3">Variance</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/pos/sessions/${s.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.terminal?.name ?? s.terminalId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(s.openedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">${s.openingCash}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.closingCash ? `$${s.closingCash}` : '-'}
                  </td>
                  <td className="px-3 py-3">
                    {s.variance != null ? (
                      <span
                        className={
                          parseFloat(s.variance) === 0
                            ? 'text-green-600'
                            : parseFloat(s.variance) > 0
                              ? 'text-blue-600'
                              : 'text-red-600'
                        }
                      >
                        ${s.variance}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={s.status} />
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
