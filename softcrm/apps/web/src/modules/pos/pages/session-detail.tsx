import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSession, useCloseSession, useReconcileSession, useOrders } from '../api';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  VOID: 'bg-red-100 text-red-700',
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError, error } = useSession(id ?? '');
  const { data: ordersData } = useOrders({ sessionId: id ?? '' });
  const closeSession = useCloseSession();
  const reconcileSession = useReconcileSession();

  const [showClose, setShowClose] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [showReconcile, setShowReconcile] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');

  if (!id) return <p className="p-6 text-gray-400">Session not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!session) return <p className="p-6 text-gray-400">Session not found.</p>;

  const orders = ordersData?.data ?? [];
  const isOpen = session.status === 'OPEN';

  const totalSales = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    closeSession.mutate(
      { id, closingCash },
      { onSuccess: () => setShowClose(false) },
    );
  };

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    reconcileSession.mutate(
      { id, actualCash, notes: reconcileNotes || undefined },
      { onSuccess: () => setShowReconcile(false) },
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/pos/sessions')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Sessions
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Session {id?.slice(0, 8)}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs ${
            STATUS_COLORS[session.status] ?? STATUS_COLORS['CLOSED']
          }`}
        >
          {session.status}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Opening Cash</p>
          <p className="text-xl font-semibold text-gray-900">${session.openingCash}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-xl font-semibold text-green-600">${totalSales.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Expected Cash</p>
          <p className="text-xl font-semibold text-gray-900">
            {session.expectedCash ? `$${session.expectedCash}` : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Variance</p>
          <p
            className={`text-xl font-semibold ${
              session.variance == null
                ? 'text-gray-400'
                : parseFloat(session.variance) === 0
                  ? 'text-green-600'
                  : parseFloat(session.variance) > 0
                    ? 'text-blue-600'
                    : 'text-red-600'
            }`}
          >
            {session.variance != null ? `$${session.variance}` : '-'}
          </p>
        </div>
      </div>

      {/* Actions */}
      {isOpen && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowClose(true)}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Close Session
          </button>
        </div>
      )}

      {!isOpen && session.variance == null && (
        <div className="mb-6">
          <button
            onClick={() => setShowReconcile(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reconcile
          </button>
        </div>
      )}

      {/* Close Session Modal */}
      {showClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleClose}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Close Session
            </h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Closing Cash Count
            </label>
            <input
              type="number"
              step="0.01"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              required
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClose(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={closeSession.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {closeSession.isPending ? 'Closing...' : 'Close Session'}
              </button>
            </div>
            {closeSession.isError && (
              <p className="mt-2 text-sm text-red-600">{closeSession.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Reconcile Modal */}
      {showReconcile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleReconcile}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Reconcile Session
            </h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Actual Cash Count
            </label>
            <input
              type="number"
              step="0.01"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              value={reconcileNotes}
              onChange={(e) => setReconcileNotes(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReconcile(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reconcileSession.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {reconcileSession.isPending ? 'Saving...' : 'Reconcile'}
              </button>
            </div>
            {reconcileSession.isError && (
              <p className="mt-2 text-sm text-red-600">{reconcileSession.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Session Details */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Opened At</p>
            <p className="font-medium text-gray-900">
              {new Date(session.openedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Closed At</p>
            <p className="font-medium text-gray-900">
              {session.closedAt ? new Date(session.closedAt).toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Register</p>
            <p className="font-medium text-gray-900">
              {session.terminal?.name ?? session.terminalId.slice(0, 8)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Orders</p>
            <p className="font-medium text-gray-900">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Transactions</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Order #</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/pos/transactions/${o.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {o.orderNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    ${o.total}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        ORDER_STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status}
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
