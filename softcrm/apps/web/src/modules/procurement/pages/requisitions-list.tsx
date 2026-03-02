import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRequisitions, useCreateRequisition } from '../api';
import type { PurchaseRequisition, RequisitionStatus } from '../api';

const STATUS_COLORS: Record<RequisitionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PO_CREATED: 'bg-purple-100 text-purple-700',
};

function CreateRequisitionDialog({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const createRequisition = useCreateRequisition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequisition.mutate(
      {
        notes: notes || undefined,
        lines: [],
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
          New Purchase Requisition
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes about this requisition"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <p className="mb-4 text-sm text-gray-500">
          You can add line items after creating the requisition.
        </p>

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
            disabled={createRequisition.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createRequisition.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createRequisition.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createRequisition.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function RequisitionsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = useRequisitions(
    statusFilter ? { status: statusFilter } : undefined
  );
  const [showCreate, setShowCreate] = useState(false);

  const requisitions: PurchaseRequisition[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PO_CREATED">PO Created</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Requisition
          </button>
        </div>
      </div>

      {showCreate && <CreateRequisitionDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Req Number</th>
              <th className="px-3 py-3">Requested By</th>
              <th className="px-3 py-3">Lines</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Approved By</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No requisitions found.
                </td>
              </tr>
            ) : (
              requisitions.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/procurement/requisitions/${r.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-sm font-medium text-gray-900">
                    {r.reqNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.requestedBy.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.lines.length} items
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.approvedBy ? r.approvedBy.slice(0, 8) + '...' : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
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
