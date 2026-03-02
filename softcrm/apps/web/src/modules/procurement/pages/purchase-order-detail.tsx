import { useParams, useNavigate, Link } from 'react-router';
import {
  usePurchaseOrder,
  useApprovePurchaseOrder,
  useSendPurchaseOrder,
  useCancelPurchaseOrder,
} from '../api';
import type { POStatus, ApprovalStatus } from '../api';

const STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const APPROVAL_COLORS: Record<ApprovalStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: po, isLoading, isError, error } = usePurchaseOrder(id ?? '');
  const approvePO = useApprovePurchaseOrder();
  const sendPO = useSendPurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

  if (!id) return <p className="p-6 text-gray-400">Purchase order not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!po) return <p className="p-6 text-gray-400">Purchase order not found.</p>;

  const handleApprove = () => {
    approvePO.mutate({ id });
  };

  const handleSend = () => {
    sendPO.mutate({ id });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this purchase order?')) {
      cancelPO.mutate({ id });
    }
  };

  const canReceive = po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED';

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/procurement/purchase-orders')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Purchase Orders
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[po.status]}`}
          >
            {po.status.replace('_', ' ')}
          </span>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${APPROVAL_COLORS[po.approvalStatus]}`}
          >
            {po.approvalStatus}
          </span>
        </div>
        <div className="flex gap-2">
          {po.status === 'DRAFT' && po.approvalStatus === 'PENDING' && (
            <button
              onClick={handleApprove}
              disabled={approvePO.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approvePO.isPending ? 'Approving...' : 'Approve'}
            </button>
          )}
          {po.status === 'DRAFT' && po.approvalStatus === 'APPROVED' && (
            <button
              onClick={handleSend}
              disabled={sendPO.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sendPO.isPending ? 'Sending...' : 'Send to Supplier'}
            </button>
          )}
          {canReceive && (
            <Link
              to={`/procurement/receiving?poId=${po.id}`}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Receive Goods
            </Link>
          )}
          {po.status !== 'CANCELLED' && po.status !== 'RECEIVED' && (
            <button
              onClick={handleCancel}
              disabled={cancelPO.isPending}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelPO.isPending ? 'Cancelling...' : 'Cancel PO'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Supplier</p>
          <p className="font-medium text-gray-900">
            {po.supplier?.name ?? po.supplierId}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Currency</p>
          <p className="font-medium text-gray-900">{po.currency}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Expected Delivery</p>
          <p className="font-medium text-gray-900">
            {po.expectedDeliveryDate
              ? new Date(po.expectedDeliveryDate).toLocaleDateString()
              : '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created By</p>
          <p className="font-medium text-gray-900">{po.createdBy ?? '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created At</p>
          <p className="font-medium text-gray-900">
            {new Date(po.createdAt).toLocaleDateString()}
          </p>
        </div>
        {po.approvedBy && (
          <div>
            <p className="text-sm text-gray-500">Approved By</p>
            <p className="font-medium text-gray-900">{po.approvedBy}</p>
          </div>
        )}
        {po.requisitionId && (
          <div>
            <p className="text-sm text-gray-500">From Requisition</p>
            <Link
              to={`/procurement/requisitions/${po.requisitionId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              View Requisition
            </Link>
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
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Tax %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Line Total</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {po.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No line items.
                </td>
              </tr>
            ) : (
              po.lines.map((line) => {
                const qty = parseFloat(line.quantity);
                const received = parseFloat(line.receivedQty);
                const isFullyReceived = received >= qty;
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-2 text-gray-900">{line.description}</td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {qty.toFixed(0)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      ${parseFloat(line.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {(parseFloat(line.taxRate) * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ${parseFloat(line.lineTotal).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`font-medium ${
                          isFullyReceived ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {received.toFixed(0)} / {qty.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Subtotal</dt>
            <dd className="font-medium text-gray-900">
              ${parseFloat(po.subtotal).toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Tax</dt>
            <dd className="font-medium text-gray-900">
              ${parseFloat(po.taxAmount).toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <dt className="font-semibold text-gray-900">Total</dt>
            <dd className="font-semibold text-gray-900">
              {po.currency} {parseFloat(po.total).toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Mutation feedback */}
      {(approvePO.isError || sendPO.isError || cancelPO.isError) && (
        <p className="mt-4 text-sm text-red-600">
          {approvePO.error?.message ?? sendPO.error?.message ?? cancelPO.error?.message}
        </p>
      )}
    </div>
  );
}
