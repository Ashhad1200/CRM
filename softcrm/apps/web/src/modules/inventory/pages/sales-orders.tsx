import { useSalesOrders, useFulfillOrder } from '../api.js';
import type { SalesOrder } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PARTIALLY_FULFILLED: 'bg-yellow-100 text-yellow-700',
  FULFILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function SalesOrdersPage() {
  const { data, isLoading, isError, error } = useSalesOrders();
  const fulfillOrder = useFulfillOrder();

  const orders: SalesOrder[] = data?.data ?? [];

  const canFulfill = (status: string) =>
    status === 'CONFIRMED' || status === 'PARTIALLY_FULFILLED';

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Order #</th>
              <th className="px-3 py-3">Deal ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Items</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No sales orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    #{o.orderNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {o.dealId ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {o.lines.length}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    ${Number(o.total).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    {canFulfill(o.status) && (
                      <button
                        onClick={() => fulfillOrder.mutate({ id: o.id })}
                        disabled={fulfillOrder.isPending}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Fulfill
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {fulfillOrder.isError && (
        <p className="mt-4 text-sm text-red-600">
          {fulfillOrder.error.message}
        </p>
      )}
    </div>
  );
}
