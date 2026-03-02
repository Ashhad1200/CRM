import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useOrder, useVoidOrder, useRefundOrder } from '../api';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  VOID: 'bg-red-100 text-red-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
};

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error } = useOrder(id ?? '');
  const voidOrder = useVoidOrder();
  const refundOrder = useRefundOrder();

  const [showVoid, setShowVoid] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [reason, setReason] = useState('');

  if (!id) return <p className="p-6 text-gray-400">Transaction not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!order) return <p className="p-6 text-gray-400">Transaction not found.</p>;

  const canVoid = order.status === 'OPEN';
  const canRefund = order.status === 'PAID';

  const handleVoid = (e: React.FormEvent) => {
    e.preventDefault();
    voidOrder.mutate(
      { id, reason: reason || undefined },
      { onSuccess: () => setShowVoid(false) },
    );
  };

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    refundOrder.mutate(
      { id, reason: reason || undefined },
      { onSuccess: () => setShowRefund(false) },
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/pos/transactions')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Transactions
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Order {order.orderNumber}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs ${
            STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        {canVoid && (
          <button
            onClick={() => setShowVoid(true)}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Void Order
          </button>
        )}
        {canRefund && (
          <button
            onClick={() => setShowRefund(true)}
            className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Refund Order
          </button>
        )}
      </div>

      {/* Void Modal */}
      {showVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleVoid}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Void Order
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to void this order? This action cannot be undone.
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVoid(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={voidOrder.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {voidOrder.isPending ? 'Voiding...' : 'Void Order'}
              </button>
            </div>
            {voidOrder.isError && (
              <p className="mt-2 text-sm text-red-600">{voidOrder.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Refund Modal */}
      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleRefund}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Refund Order
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              This will refund the full amount of ${order.total}.
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRefund(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundOrder.isPending}
                className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {refundOrder.isPending ? 'Refunding...' : 'Refund Order'}
              </button>
            </div>
            {refundOrder.isError && (
              <p className="mt-2 text-sm text-red-600">{refundOrder.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Order Summary */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium text-gray-900">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="font-medium text-gray-900">
              {order.completedAt ? new Date(order.completedAt).toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Currency</p>
            <p className="font-medium text-gray-900">{order.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Loyalty Points</p>
            <p className="font-medium text-gray-900">{order.loyaltyPointsEarned}</p>
          </div>
        </div>
        {order.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="font-medium text-gray-900">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Order Lines */}
      {order.lines && order.lines.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Items</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">Unit Price</th>
                <th className="px-3 py-3">Discount</th>
                <th className="px-3 py-3">Tax</th>
                <th className="px-3 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{line.quantity}</td>
                  <td className="px-3 py-3 text-gray-600">${line.unitPrice}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {parseFloat(line.discount) > 0 ? `-$${line.discount}` : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{line.taxRate}%</td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    ${line.lineTotal}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-500">
                  Subtotal
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">${order.subtotal}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-500">
                  Tax
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">${order.taxAmount}</td>
              </tr>
              {parseFloat(order.discountAmount) > 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-500">
                    Discount
                  </td>
                  <td className="px-3 py-2 font-medium text-red-600">
                    -${order.discountAmount}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-3 py-3 text-right text-lg font-semibold text-gray-900">
                  Total
                </td>
                <td className="px-3 py-3 text-lg font-semibold text-gray-900">
                  ${order.total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Payments */}
      {order.payments && order.payments.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Payments</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Processed At</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {payment.method}
                  </td>
                  <td className="px-3 py-3 text-gray-600">${payment.amount}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {payment.reference ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(payment.processedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        PAYMENT_STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
