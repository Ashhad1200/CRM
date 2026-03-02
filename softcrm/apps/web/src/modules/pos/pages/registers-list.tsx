import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTerminals, useCreateTerminal } from '../api';
import type { POSTerminal } from '../api';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-700',
  OFFLINE: 'bg-gray-100 text-gray-700',
  CLOSED: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS['OFFLINE'];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status}
    </span>
  );
}

function CreateTerminalDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const createTerminal = useCreateTerminal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTerminal.mutate(
      {
        name,
        warehouseId: warehouseId || undefined,
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
          New Register
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Register Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Front Counter 1"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Warehouse / Location (optional)
        </label>
        <input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder="Warehouse UUID"
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
            disabled={createTerminal.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createTerminal.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createTerminal.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createTerminal.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function RegistersListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useTerminals();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const terminals: POSTerminal[] = data?.data ?? [];

  const filtered = terminals.filter((t) => {
    if (!search) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registers</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Register
        </button>
      </div>

      {showCreate && (
        <CreateTerminalDialog onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search registers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center text-gray-400 py-8">
              No registers found.
            </p>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/pos/registers/${t.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {t.currentSessionId ? 'Session active' : 'No active session'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
