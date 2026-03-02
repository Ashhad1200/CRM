import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useRequisition,
  useSubmitRequisition,
  useApproveRequisition,
  useRejectRequisition,
  useCreatePOFromRequisition,
} from '../api';
import type { RequisitionStatus } from '../api';

const STATUS_COLORS: Record<RequisitionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PO_CREATED: 'bg-purple-100 text-purple-700',
};

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: requisition, isLoading, isError, error } = useRequisition(id ?? '');
  const submitRequisition = useSubmitRequisition();
  const approveRequisition = useApproveRequisition();
  const rejectRequisition = useRejectRequisition();
  const createPO = useCreatePOFromRequisition();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreatePODialog, setShowCreatePODialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  if (!id) return <p className="p-6 text-gray-400">Requisition not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!requisition) return <p className="p-6 text-gray-400">Requisition not found.</p>;

  const handleSubmit = () => {
    submitRequisition.mutate({ id });
  };

  const handleApprove = () => {
    approveRequisition.mutate({ id });
  };

  const handleReject = () => {
    rejectRequisition.mutate({ id, reason: rejectReason }, {
      onSuccess: () => setShowRejectDialog(false),
    });
  };

  const handleCreatePO = () => {
    createPO.mutate(
      { requisitionId: id, supplierId: selectedSupplierId },
      {
        onSuccess: (data) => {
          setShowCreatePODialog(false);
          navigate(`/procurement/purchase-orders/${data.data.id}`);
        },
      }
    );
  };

  const totalEstimated = requisition.lines.reduce(
    (sum, line) => sum + parseFloat(line.quantity) * parseFloat(line.estimatedUnitPrice),
    0
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/procurement/requisitions')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Requisitions
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{requisition.reqNumber}</h1>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[requisition.status]}`}
          >
            {requisition.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-2">
          {requisition.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              disabled={submitRequisition.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitRequisition.isPending ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {requisition.status === 'SUBMITTED' && (
            <>
              <button
                onClick={handleApprove}
                disabled={approveRequisition.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveRequisition.isPending ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
          {requisition.status === 'APPROVED' && (
            <button
              onClick={() => setShowCreatePODialog(true)}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Requested By</p>
          <p className="font-medium text-gray-900">{requisition.requestedBy}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="font-medium text-gray-900">
            {new Date(requisition.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Estimated Total</p>
          <p className="font-medium text-gray-900">${totalEstimated.toFixed(2)}</p>
        </div>
        {requisition.approvedBy && (
          <>
            <div>
              <p className="text-sm text-gray-500">Approved By</p>
              <p className="font-medium text-gray-900">{requisition.approvedBy}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved At</p>
              <p className="font-medium text-gray-900">
                {requisition.approvedAt
                  ? new Date(requisition.approvedAt).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </>
        )}
        {requisition.notes && (
          <div className="col-span-3">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="text-gray-900">{requisition.notes}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Line Items</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Quantity</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Est. Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Required By</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requisition.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No line items.
                </td>
              </tr>
            ) : (
              requisition.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2 text-gray-900">{line.description}</td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {parseFloat(line.quantity).toFixed(0)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    ${parseFloat(line.estimatedUnitPrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {new Date(line.requiredByDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    ${(parseFloat(line.quantity) * parseFloat(line.estimatedUnitPrice)).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Reject Requisition</h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason for Rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectDialog(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectRequisition.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectRequisition.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Dialog */}
      {showCreatePODialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Purchase Order</h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Supplier ID
            </label>
            <input
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              placeholder="Enter supplier ID"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreatePODialog(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={createPO.isPending || !selectedSupplierId}
                className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {createPO.isPending ? 'Creating...' : 'Create PO'}
              </button>
            </div>
            {createPO.isError && (
              <p className="mt-2 text-sm text-red-600">{createPO.error.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
