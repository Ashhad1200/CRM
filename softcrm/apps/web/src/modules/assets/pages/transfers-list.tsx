import { useState } from 'react';
import {
  useAssetTransfers,
  useCreateAssetTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useCompleteTransfer,
  useFixedAssets,
  type AssetTransfer,
  type TransferStatus,
} from '../api';

const STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CreateTransferDialog({ onClose }: { onClose: () => void }) {
  const { data: assetsData } = useFixedAssets({ status: 'ACTIVE' });
  const assets = assetsData?.data ?? [];

  const [assetId, setAssetId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [toAssignedTo, setToAssignedTo] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const createTransfer = useCreateAssetTransfer();

  const selectedAsset = assets.find((a) => a.id === assetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransfer.mutate(
      {
        assetId,
        fromLocationId: selectedAsset?.locationId || undefined,
        toLocationId: toLocationId || undefined,
        fromDepartmentId: selectedAsset?.departmentId || undefined,
        toDepartmentId: toDepartmentId || undefined,
        fromAssignedTo: selectedAsset?.assignedTo || undefined,
        toAssignedTo: toAssignedTo || undefined,
        transferDate,
        effectiveDate: effectiveDate || transferDate,
        reason: reason || undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Create Asset Transfer
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Asset *</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select asset...</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetNumber} - {a.name}
            </option>
          ))}
        </select>

        {selectedAsset && (
          <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
            <p className="text-gray-600">
              <strong>Current Location:</strong> {selectedAsset.locationId ?? 'Not assigned'}
            </p>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Transfer Date *
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Effective Date
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          New Location
        </label>
        <input
          value={toLocationId}
          onChange={(e) => setToLocationId(e.target.value)}
          placeholder="Building B, Room 205"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Assigned To
        </label>
        <input
          value={toAssignedTo}
          onChange={(e) => setToAssignedTo(e.target.value)}
          placeholder="Employee ID or name"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason for Transfer
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
            disabled={createTransfer.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createTransfer.isPending ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>

        {createTransfer.isError && (
          <p className="mt-2 text-sm text-red-600">{createTransfer.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function TransfersListPage() {
  const { data, isLoading, isError, error } = useAssetTransfers();
  const approveTransfer = useApproveTransfer();
  const rejectTransfer = useRejectTransfer();
  const completeTransfer = useCompleteTransfer();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const transfers: AssetTransfer[] = data?.data ?? [];

  const filtered = statusFilter
    ? transfers.filter((t) => t.status === statusFilter)
    : transfers;

  const handleApprove = (id: string) => {
    approveTransfer.mutate({ id });
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason !== null) {
      rejectTransfer.mutate({ id, reason: reason || undefined });
    }
  };

  const handleComplete = (id: string) => {
    completeTransfer.mutate({ id });
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Transfers</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Transfer
        </button>
      </div>

      {showCreate && <CreateTransferDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Transfer #</th>
              <th className="px-3 py-3">Asset</th>
              <th className="px-3 py-3">From</th>
              <th className="px-3 py-3">To</th>
              <th className="px-3 py-3">Transfer Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No transfers found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {t.transferNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {t.asset?.assetNumber} - {t.asset?.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {t.fromLocationId ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {t.toLocationId ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {formatDate(t.transferDate)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {t.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(t.id)}
                            disabled={approveTransfer.isPending}
                            className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(t.id)}
                            disabled={rejectTransfer.isPending}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {t.status === 'APPROVED' && (
                        <button
                          onClick={() => handleComplete(t.id)}
                          disabled={completeTransfer.isPending}
                          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                    </div>
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
