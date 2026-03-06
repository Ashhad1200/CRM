import { useState } from 'react';
import { Button, Badge, StatCard } from '@softcrm/ui';
import {
  useSessions,
  useTerminals,
  useOpenSession,
  useCloseSession,
  useReconcileSession,
  type POSSession,
  type POSTerminal,
} from '../api';

const fmt = (v: string | number | undefined) =>
  v != null ? `$${Number(v).toFixed(2)}` : '-';

const STATUS_BADGE: Record<string, 'success' | 'default'> = {
  OPEN: 'success',
  CLOSED: 'default',
};

/* ── Open Session Dialog ───────────────────────────────────────────────── */

function OpenSessionDialog({
  terminals,
  onClose,
}: {
  terminals: POSTerminal[];
  onClose: () => void;
}) {
  const [terminalId, setTerminalId] = useState(terminals[0]?.id ?? '');
  const [openingCash, setOpeningCash] = useState('0.00');
  const openSession = useOpenSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openSession.mutate({ terminalId, openingCash }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="backdrop-blur-xl bg-white/90 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4">Open New Session</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Register</label>
          <select
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            {terminals.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Starting Cash</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-mono"
            required
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={openSession.isPending}>
            {openSession.isPending ? 'Opening…' : 'Open Session'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ── Close Session Dialog ──────────────────────────────────────────────── */

function CloseSessionDialog({
  session,
  onClose,
}: {
  session: POSSession;
  onClose: () => void;
}) {
  const [closingCash, setClosingCash] = useState('');
  const closeSession = useCloseSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeSession.mutate({ id: session.id, closingCash }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="backdrop-blur-xl bg-white/90 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4">Close Session</h2>

        <div className="mb-3 text-sm text-gray-600">
          <p>Register: <span className="font-medium">{session.terminal?.name ?? session.terminalId.slice(0, 8)}</span></p>
          <p>Opened: <span className="font-medium">{new Date(session.openedAt).toLocaleString()}</span></p>
          <p>Opening Cash: <span className="font-medium">{fmt(session.openingCash)}</span></p>
          {session.totalSales && <p>Total Sales: <span className="font-medium">{fmt(session.totalSales)}</span></p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ending Cash Count</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-mono"
            required
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" className="flex-1" disabled={closeSession.isPending}>
            {closeSession.isPending ? 'Closing…' : 'Close Session'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ── Session Management Page ───────────────────────────────────────────── */

export default function SessionManagementPage() {
  const [showOpen, setShowOpen] = useState(false);
  const [closingSession, setClosingSession] = useState<POSSession | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: sessionsData, isLoading } = useSessions(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const { data: terminalsData } = useTerminals();

  const sessions: POSSession[] = sessionsData?.data ?? [];
  const terminals: POSTerminal[] = terminalsData?.data ?? [];
  const onlineTerminals = terminals.filter((t) => t.status !== 'CLOSED');

  const openSessions = sessions.filter((s) => s.status === 'OPEN');
  const totalSales = sessions.reduce((sum, s) => sum + Number(s.totalSales ?? 0), 0);
  const totalVariance = sessions
    .filter((s) => s.variance != null)
    .reduce((sum, s) => sum + Math.abs(Number(s.variance)), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
        <Button onClick={() => setShowOpen(true)} disabled={onlineTerminals.length === 0}>
          Open Session
        </Button>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Active Sessions" value={openSessions.length} change={0} trend="flat" />
        <StatCard label="Total Sales" value={`$${totalSales.toFixed(2)}`} change={0} trend="flat" />
        <StatCard label="Sessions Today" value={sessions.length} change={0} trend="flat" />
        <StatCard
          label="Cash Variance"
          value={`$${totalVariance.toFixed(2)}`}
          change={totalVariance === 0 ? 0 : -1}
          trend={totalVariance === 0 ? 'flat' : 'down'}
        />
      </div>

      {/* ── Filter ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Sessions</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* ── Sessions Table ─────────────────────────────────────────── */}
      {isLoading && <p className="text-gray-500">Loading…</p>}

      {sessionsData && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">Register</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Closed</th>
                <th className="px-4 py-3">Opening Cash</th>
                <th className="px-4 py-3">Closing Cash</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{s.terminal?.name ?? s.terminalId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(s.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 font-mono">{fmt(s.openingCash)}</td>
                    <td className="px-4 py-3 font-mono">{s.closingCash ? fmt(s.closingCash) : '-'}</td>
                    <td className="px-4 py-3 font-mono">{s.totalSales ? fmt(s.totalSales) : '-'}</td>
                    <td className="px-4 py-3">
                      {s.variance != null ? (
                        <span
                          className={`font-mono ${
                            parseFloat(s.variance) === 0
                              ? 'text-green-600'
                              : parseFloat(s.variance) > 0
                                ? 'text-blue-600'
                                : 'text-red-600'
                          }`}
                        >
                          {fmt(s.variance)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[s.status] ?? 'default'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'OPEN' && (
                        <Button size="sm" variant="ghost" onClick={() => setClosingSession(s)}>
                          Close
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────── */}
      {showOpen && (
        <OpenSessionDialog terminals={onlineTerminals} onClose={() => setShowOpen(false)} />
      )}
      {closingSession && (
        <CloseSessionDialog session={closingSession} onClose={() => setClosingSession(null)} />
      )}
    </div>
  );
}
