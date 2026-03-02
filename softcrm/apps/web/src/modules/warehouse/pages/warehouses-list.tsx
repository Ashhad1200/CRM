import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWarehouses, useCreateWarehouse } from '../api';
import type { Warehouse, WarehouseStatus } from '../api';

function CreateWarehouseDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<WarehouseStatus>('ACTIVE');
  const [isDefault, setIsDefault] = useState(false);
  const createWarehouse = useCreateWarehouse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWarehouse.mutate(
      { name, code, status, isDefault, address: {} },
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
          New Warehouse
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          placeholder="e.g. WH-001"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as WarehouseStatus)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Set as default warehouse
        </label>

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
            disabled={createWarehouse.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createWarehouse.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createWarehouse.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createWarehouse.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function WarehousesListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useWarehouses();
  const [showCreate, setShowCreate] = useState(false);

  const warehouses: Warehouse[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Warehouse
        </button>
      </div>

      {showCreate && (
        <CreateWarehouseDialog onClose={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Default</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No warehouses found.
                </td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => navigate(`/warehouse/warehouses/${w.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {w.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{w.code}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        w.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {w.isDefault ? 'Yes' : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(w.createdAt).toLocaleDateString()}
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
