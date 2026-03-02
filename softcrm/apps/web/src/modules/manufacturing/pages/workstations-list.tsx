import { useState } from 'react';
import {
  useWorkCenters,
  useCreateWorkCenter,
  useUpdateWorkCenter,
  useDeleteWorkCenter,
  type WorkCenter,
  type WorkCenterStatus,
} from '../api';

const STATUS_COLORS: Record<WorkCenterStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: WorkCenterStatus }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

interface WorkCenterFormData {
  name: string;
  description: string;
  capacity: string;
  capacityUnit: string;
  costPerHour: string;
  status: WorkCenterStatus;
}

function WorkCenterFormDialog({
  workCenter,
  onClose,
}: {
  workCenter?: WorkCenter;
  onClose: () => void;
}) {
  const isEdit = !!workCenter;
  const [formData, setFormData] = useState<WorkCenterFormData>({
    name: workCenter?.name ?? '',
    description: workCenter?.description ?? '',
    capacity: workCenter?.capacity ?? '8',
    capacityUnit: workCenter?.capacityUnit ?? 'hours',
    costPerHour: workCenter?.costPerHour ?? '50',
    status: workCenter?.status ?? 'ACTIVE',
  });

  const createWorkCenter = useCreateWorkCenter();
  const updateWorkCenter = useUpdateWorkCenter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      capacity: parseFloat(formData.capacity),
      costPerHour: parseFloat(formData.costPerHour),
    };

    if (isEdit) {
      updateWorkCenter.mutate(
        { id: workCenter.id, ...payload },
        { onSuccess: () => onClose() }
      );
    } else {
      createWorkCenter.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  const isPending = createWorkCenter.isPending || updateWorkCenter.isPending;
  const error = createWorkCenter.error ?? updateWorkCenter.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit Workstation' : 'New Workstation'}
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Assembly Line 1"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Capacity
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Capacity Unit
            </label>
            <select
              value={formData.capacityUnit}
              onChange={(e) =>
                setFormData({ ...formData, capacityUnit: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="hours">Hours/Day</option>
              <option value="units">Units/Hour</option>
              <option value="cycles">Cycles/Day</option>
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cost per Hour
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.costPerHour}
              onChange={(e) =>
                setFormData({ ...formData, costPerHour: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as WorkCenterStatus,
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

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
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error.message}</p>
        )}
      </form>
    </div>
  );
}

function WorkCenterCard({
  workCenter,
  onEdit,
  onDelete,
}: {
  workCenter: WorkCenter;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-gray-900">{workCenter.name}</h3>
        <StatusBadge status={workCenter.status} />
      </div>

      {workCenter.description && (
        <p className="mb-3 text-sm text-gray-600 line-clamp-2">
          {workCenter.description}
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Capacity:</span>{' '}
          <span className="font-medium text-gray-900">
            {workCenter.capacity} {workCenter.capacityUnit}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Cost:</span>{' '}
          <span className="font-medium text-gray-900">
            ${parseFloat(workCenter.costPerHour).toFixed(2)}/hr
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <button
          onClick={onEdit}
          className="flex-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function WorkstationsListPage() {
  const { data, isLoading, isError, error } = useWorkCenters();
  const deleteWorkCenter = useDeleteWorkCenter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorkCenter, setEditingWorkCenter] = useState<WorkCenter | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkCenterStatus | ''>('');

  const workCenters: WorkCenter[] = data?.data ?? [];

  const filtered = workCenters.filter((wc) => {
    if (statusFilter && wc.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      wc.name.toLowerCase().includes(q) ||
      (wc.description ?? '').toLowerCase().includes(q)
    );
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this workstation?')) {
      deleteWorkCenter.mutate(id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workstations</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Workstation
        </button>
      </div>

      {showCreate && (
        <WorkCenterFormDialog onClose={() => setShowCreate(false)} />
      )}

      {editingWorkCenter && (
        <WorkCenterFormDialog
          workCenter={editingWorkCenter}
          onClose={() => setEditingWorkCenter(null)}
        />
      )}

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as WorkCenterStatus | '')
          }
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && filtered.length === 0 && (
        <p className="py-8 text-center text-gray-400">No workstations found.</p>
      )}

      {data && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((wc) => (
            <WorkCenterCard
              key={wc.id}
              workCenter={wc}
              onEdit={() => setEditingWorkCenter(wc)}
              onDelete={() => handleDelete(wc.id)}
            />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {data && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {workCenters.length}
            </p>
            <p className="text-sm text-gray-500">Total Workstations</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {workCenters.filter((w) => w.status === 'ACTIVE').length}
            </p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">
              {workCenters.filter((w) => w.status === 'INACTIVE').length}
            </p>
            <p className="text-sm text-gray-500">Inactive</p>
          </div>
        </div>
      )}
    </div>
  );
}
