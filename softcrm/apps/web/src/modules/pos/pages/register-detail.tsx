import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useTerminal,
  useUpdateTerminal,
  useOpenSession,
  useSessions,
} from '../api';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-700',
  OFFLINE: 'bg-gray-100 text-gray-700',
  CLOSED: 'bg-red-100 text-red-700',
};

export default function RegisterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: terminal, isLoading, isError, error } = useTerminal(id ?? '');
  const { data: sessionsData } = useSessions({ terminalId: id ?? '' });
  const updateTerminal = useUpdateTerminal();
  const openSession = useOpenSession();

  const [name, setName] = useState('');
  const [status, setStatus] = useState<string>('OFFLINE');
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingCash, setOpeningCash] = useState('0.00');

  useEffect(() => {
    if (terminal) {
      setName(terminal.name);
      setStatus(terminal.status);
    }
  }, [terminal]);

  if (!id) return <p className="p-6 text-gray-400">Register not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!terminal) return <p className="p-6 text-gray-400">Register not found.</p>;

  const sessions = sessionsData?.data ?? [];
  const hasActiveSession = !!terminal.currentSessionId;

  const handleSave = () => {
    updateTerminal.mutate({ id, name, status });
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    openSession.mutate(
      { terminalId: id, openingCash },
      { onSuccess: () => setShowOpenSession(false) },
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/pos/registers')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Registers
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{terminal.name}</h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs ${
            STATUS_COLORS[terminal.status] ?? STATUS_COLORS['OFFLINE']
          }`}
        >
          {terminal.status}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-xl font-semibold text-gray-900">{terminal.status}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active Session</p>
          <p className="text-xl font-semibold text-gray-900">
            {hasActiveSession ? 'Yes' : 'No'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Sessions</p>
          <p className="text-xl font-semibold text-gray-900">{sessions.length}</p>
        </div>
      </div>

      {/* Actions */}
      {!hasActiveSession && (
        <div className="mb-6">
          <button
            onClick={() => setShowOpenSession(true)}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Open Session
          </button>
        </div>
      )}

      {showOpenSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleOpenSession}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Open New Session
            </h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Opening Cash
            </label>
            <input
              type="number"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              required
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOpenSession(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={openSession.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {openSession.isPending ? 'Opening...' : 'Open Session'}
              </button>
            </div>
            {openSession.isError && (
              <p className="mt-2 text-sm text-red-600">{openSession.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Edit Form */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Register Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateTerminal.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateTerminal.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
          {updateTerminal.isError && (
            <p className="text-sm text-red-600">{updateTerminal.error.message}</p>
          )}
          {updateTerminal.isSuccess && (
            <p className="text-sm text-green-600">Register updated.</p>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Recent Sessions
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Opened</th>
                <th className="px-3 py-3">Closed</th>
                <th className="px-3 py-3">Opening Cash</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/pos/sessions/${s.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(s.openedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">${s.openingCash}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        s.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
