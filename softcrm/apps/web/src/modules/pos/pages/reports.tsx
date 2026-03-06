import { useState } from 'react';
import { StatCard, Badge } from '@softcrm/ui';
import { useOrders, useSessions, type POSOrder } from '../api';

const fmt = (v: number) => v.toFixed(2);

const PAYMENT_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  CASH: 'success',
  CARD: 'primary',
  MOBILE: 'warning',
  SPLIT: 'default',
  LOYALTY_POINTS: 'default',
};

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const { data: ordersData, isLoading } = useOrders({ date: dateFilter, status: 'PAID' });
  const { data: sessionsData } = useSessions();

  const orders: POSOrder[] = ordersData?.data ?? [];
  const sessions = sessionsData?.data ?? [];

  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalTax = orders.reduce((s, o) => s + Number(o.taxAmount), 0);
  const totalDiscount = orders.reduce((s, o) => s + Number(o.discountAmount), 0);
  const avgTransaction = orders.length > 0 ? totalSales / orders.length : 0;

  // Payment method breakdown from order payments
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  for (const order of orders) {
    for (const payment of order.payments ?? []) {
      const method = payment.method;
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].total += Number(payment.amount);
    }
  }

  // Top products from order lines
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of orders) {
    for (const line of order.lines ?? []) {
      const key = line.productId;
      if (!productSales[key]) productSales[key] = { name: line.description, qty: 0, revenue: 0 };
      productSales[key].qty += Number(line.quantity);
      productSales[key].revenue += Number(line.lineTotal);
    }
  }
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Hourly sales distribution
  const hourlySales = new Array(24).fill(0) as number[];
  for (const order of orders) {
    if (order.completedAt) {
      const hour = new Date(order.completedAt).getHours();
      hourlySales[hour] = (hourlySales[hour] ?? 0) + Number(order.total);
    }
  }
  const maxHourlySale = Math.max(...hourlySales, 1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">POS Reports</h1>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Total Sales" value={`$${fmt(totalSales)}`} change={0} trend="flat" />
        <StatCard label="Transactions" value={orders.length} change={0} trend="flat" />
        <StatCard label="Avg. Transaction" value={`$${fmt(avgTransaction)}`} change={0} trend="flat" />
        <StatCard label="Tax Collected" value={`$${fmt(totalTax)}`} change={0} trend="flat" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* ── Hourly Sales Chart (placeholder bar chart) ────────── */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Hourly Sales Distribution</h3>
          <div className="flex items-end gap-1 h-40">
            {hourlySales.map((val, hour) => (
              <div key={hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500/70 rounded-t transition-all"
                  style={{ height: `${(val / maxHourlySale) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                  title={`${hour}:00 — $${fmt(val)}`}
                />
                {hour % 4 === 0 && (
                  <span className="text-[9px] text-gray-400 mt-1">{hour}:00</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment Method Breakdown ──────────────────────────── */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Methods</h3>
          {Object.keys(paymentBreakdown).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No payment data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([method, data]) => {
                const pct = totalSales > 0 ? (data.total / totalSales) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={PAYMENT_COLORS[method] ?? 'default'}>{method}</Badge>
                        <span className="text-xs text-gray-500">{data.count} txns</span>
                      </div>
                      <span className="text-sm font-mono font-medium">${fmt(data.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Top Products ───────────────────────────────────────────── */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Products</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2 text-right">Qty Sold</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">% of Sales</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  No product data for this date.
                </td>
              </tr>
            ) : (
              topProducts.map((p, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{p.qty}</td>
                  <td className="px-3 py-2 text-right font-mono">${fmt(p.revenue)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {totalSales > 0 ? fmt((p.revenue / totalSales) * 100) : '0.00'}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
