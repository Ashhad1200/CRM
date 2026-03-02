import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCycleCounts, useWarehouses, useLocations, useCreateCycleCount } from '../api';
import type { WHCycleCount, CycleCountStatus } from '../api';

const STATUS_COLORS: Record<CycleCountStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

function CreateCycleCountDialog({ onClose }: { onClose: () => void }) {
  const { data: warehousesData } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [countedBy, setCountedBy] = useState('');

  const { data: locationsData } = useLocations(warehouseId || undefined);
  const createCycleCount = useCreateCycleCount();

  const warehouses = warehousesData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCycleCount.mutate(
      {
        warehouseId,
        locationId: locationId || undefined,
        countedBy,
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
          New Cycle Count
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Warehouse
        </label>
        <select
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value);
            setLocationId('');
          }}
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
          Location (optional - count entire warehouse if empty)
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          disabled={!warehouseId}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.code} - {loc.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Counted By (User ID)
        </label>
        <input
          value={countedBy}
          onChange={(e) => setCountedBy(e.target.value)}
          required
          placeholder="Enter user ID"
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
            disabled={createCycleCount.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createCycleCount.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createCycleCount.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createCycleCount.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function CycleCountsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useCycleCounts(filters);

  const cycleCounts: WHCycleCount[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cycle Counts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Cycle Count
        </button>
      </div>

      {showCreate && (
        <CreateCycleCountDialog onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
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
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Counted By</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Discrepancies</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {cycleCounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No cycle counts found.
                </td>
              </tr>
            ) : (
              cycleCounts.map((cc) => (
                <tr
                  key={cc.id}
                  onClick={() => navigate(`/warehouse/cycle-counts/${cc.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {cc.id.slice(-8)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {cc.warehouse?.name ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {cc.location?.code ?? 'All'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{cc.countedBy}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[cc.status]
                      }`}
                    >
                      {cc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {cc.discrepancies?.length ?? 0}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(cc.createdAt).toLocaleDateString()}
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
