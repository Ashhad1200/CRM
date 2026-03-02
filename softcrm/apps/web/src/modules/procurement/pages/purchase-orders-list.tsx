import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePurchaseOrders } from '../api';
import type { PurchaseOrder, POStatus, ApprovalStatus } from '../api';

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

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = usePurchaseOrders(
    statusFilter ? { status: statusFilter } : undefined
  );

  const purchaseOrders: PurchaseOrder[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={() => navigate('/procurement/purchase-orders/new')}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Purchase Order
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">PO Number</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Approval</th>
              <th className="px-3 py-3">Expected Delivery</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              purchaseOrders.map((po) => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-sm font-medium text-gray-900">
                    {po.poNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {po.supplier?.name ?? po.supplierId.slice(0, 8) + '...'}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {po.currency} {parseFloat(po.total).toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status]}`}
                    >
                      {po.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_COLORS[po.approvalStatus]}`}
                    >
                      {po.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {po.expectedDeliveryDate
                      ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString()}
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
