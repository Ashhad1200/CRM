import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePickLists, useWarehouses, useCreatePickList } from '../api';
import type { WHPickList, PickListStatus } from '../api';

const STATUS_COLORS: Record<PickListStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function CreatePickListDialog({ onClose }: { onClose: () => void }) {
  const { data: warehousesData } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [sourceOrderId, setSourceOrderId] = useState('');
  const [sourceOrderType, setSourceOrderType] = useState('');

  const createPickList = useCreatePickList();
  const warehouses = warehousesData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPickList.mutate(
      {
        warehouseId,
        sourceOrderId: sourceOrderId || undefined,
        sourceOrderType: sourceOrderType || undefined,
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
          New Pick List
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Warehouse
        </label>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select warehouse...</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Source Order ID (optional)
        </label>
        <input
          value={sourceOrderId}
          onChange={(e) => setSourceOrderId(e.target.value)}
          placeholder="e.g. SO-001"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Order Type (optional)
        </label>
        <select
          value={sourceOrderType}
          onChange={(e) => setSourceOrderType(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select type...</option>
          <option value="SALES_ORDER">Sales Order</option>
          <option value="TRANSFER">Transfer</option>
          <option value="RETURN">Return</option>
        </select>

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
            disabled={createPickList.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createPickList.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createPickList.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createPickList.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function PickListsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = usePickLists(filters);

  const pickLists: WHPickList[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pick Lists</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Pick List
        </button>
      </div>

      {showCreate && (
        <CreatePickListDialog onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Warehouse</th>
              <th className="px-3 py-3">Source Order</th>
              <th className="px-3 py-3">Lines</th>
              <th className="px-3 py-3">Assigned To</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {pickLists.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No pick lists found.
                </td>
              </tr>
            ) : (
              pickLists.map((pl) => (
                <tr
                  key={pl.id}
                  onClick={() => navigate(`/warehouse/pick-lists/${pl.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {pl.id.slice(-8)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {pl.warehouse?.name ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {pl.sourceOrderId ? (
                      <span>
                        {pl.sourceOrderId}
                        {pl.sourceOrderType && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({pl.sourceOrderType})
                          </span>
                        )}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{pl.lines?.length ?? 0}</td>
                  <td className="px-3 py-3 text-gray-600">{pl.assignedTo ?? '-'}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[pl.status]
                      }`}
                    >
                      {pl.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(pl.createdAt).toLocaleDateString()}
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
