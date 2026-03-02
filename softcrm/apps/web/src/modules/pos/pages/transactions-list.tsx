import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useOrders } from '../api';
import type { POSOrder } from '../api';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  VOID: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status}
    </span>
  );
}

export default function TransactionsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useOrders(
    statusFilter ? { status: statusFilter } : undefined,
  );

  const orders: POSOrder[] = data?.data ?? [];

  const filtered = orders.filter((o) => {
    if (!search) return true;
    return o.orderNumber.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate totals
  const totalRevenue = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + parseFloat(o.total), 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === 'PAID').length;
  const voidedOrders = orders.filter((o) => o.status === 'VOID').length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-xl font-semibold text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-xl font-semibold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-xl font-semibold text-gray-900">{paidOrders}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Voided</p>
          <p className="text-xl font-semibold text-red-600">{voidedOrders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="PAID">Paid</option>
          <option value="REFUNDED">Refunded</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Order #</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Subtotal</th>
              <th className="px-3 py-3">Tax</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/pos/transactions/${o.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {o.orderNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">${o.subtotal}</td>
                  <td className="px-3 py-3 text-gray-600">${o.taxAmount}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {parseFloat(o.discountAmount) > 0 ? `-$${o.discountAmount}` : '-'}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">${o.total}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={o.status} />
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
