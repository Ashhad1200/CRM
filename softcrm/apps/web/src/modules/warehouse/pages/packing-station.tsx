import { useState } from 'react';
import { GlassCard, Badge } from '@softcrm/ui';
import { usePackOrders, useStartPacking, useCompletePacking } from '../api-enhanced';
import type { PackOrder } from '../api-enhanced';

const STATUS_VARIANT: Record<string, 'warning' | 'primary' | 'success' | 'outline'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  PACKED: 'success',
  SHIPPED: 'outline',
};

const TABS = ['All', 'Pending', 'In Progress', 'Packed'] as const;
const TAB_STATUS: Record<string, string | undefined> = {
  All: undefined,
  Pending: 'PENDING',
  'In Progress': 'IN_PROGRESS',
  Packed: 'PACKED',
};

function CompleteDialog({
  order,
  onClose,
}: {
  order: PackOrder;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(order.totalWeight?.toString() ?? '');
  const [boxCount, setBoxCount] = useState(order.boxCount.toString());
  const complete = useCompletePacking();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    complete.mutate(
      {
        id: order.id,
        totalWeight: weight ? Number(weight) : undefined,
        boxCount: boxCount ? Number(boxCount) : undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Complete Packing
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Total Weight (kg)
        </label>
        <input
          type="number"
          step="0.01"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Box Count
        </label>
        <input
          type="number"
          value={boxCount}
          onChange={(e) => setBoxCount(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={complete.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {complete.isPending ? 'Completing...' : 'Complete'}
          </button>
        </div>

        {complete.isError && (
          <p className="mt-2 text-sm text-red-600">{complete.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function PackingStationPage() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const statusFilter = TAB_STATUS[activeTab];
  const { data: orders = [], isLoading, isError, error } = usePackOrders(undefined, statusFilter);
  const startPacking = useStartPacking();
  const [completeOrder, setCompleteOrder] = useState<PackOrder | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Packing Station</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage pack orders and complete packing workflows
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {/* Pack Orders Table */}
      <GlassCard tier="subtle" padding="none">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Boxes</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No pack orders found.
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr
                  key={po.id}
                  className="border-b border-gray-100 hover:bg-white/5 dark:border-gray-800"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {po.id.slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {po.warehouseId.slice(-8)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[po.status] ?? 'default'}>
                      {po.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{po.boxCount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {po.totalWeight != null ? `${po.totalWeight} kg` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {po.status === 'PENDING' && (
                        <button
                          onClick={() => startPacking.mutate(po.id)}
                          disabled={startPacking.isPending}
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Start Packing
                        </button>
                      )}
                      {po.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => setCompleteOrder(po)}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
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
      </GlassCard>

      {completeOrder && (
        <CompleteDialog order={completeOrder} onClose={() => setCompleteOrder(null)} />
      )}
    </div>
  );
}
