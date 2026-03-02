import { useKitchenOrders, useUpdateKitchenOrderStatus } from '../api';
import type { KitchenOrder, KitchenOrderStatus } from '../api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 border-yellow-500',
  IN_PROGRESS: 'bg-blue-100 border-blue-500',
  READY: 'bg-green-100 border-green-500',
  SERVED: 'bg-gray-100 border-gray-300',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-700',
  IN_PROGRESS: 'text-blue-700',
  READY: 'text-green-700',
  SERVED: 'text-gray-500',
};

function OrderCard({
  order,
  onStatusChange,
}: {
  order: KitchenOrder;
  onStatusChange: (status: KitchenOrderStatus) => void;
}) {
  const createdTime = new Date(order.createdAt);
  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - createdTime.getTime()) / 60000);

  const isPending = order.status === 'PENDING';
  const isInProgress = order.status === 'IN_PROGRESS';
  const isReady = order.status === 'READY';

  return (
    <div
      className={`rounded-lg border-l-4 p-4 shadow-sm ${
        STATUS_COLORS[order.status] ?? 'bg-white border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-2xl font-bold text-gray-900">
            #{order.ticketNumber}
          </span>
          {order.table && (
            <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-sm font-medium text-gray-700">
              Table {order.table.tableNumber}
            </span>
          )}
        </div>
        <div className="text-right">
          <span
            className={`text-sm font-medium ${
              STATUS_TEXT_COLORS[order.status] ?? 'text-gray-600'
            }`}
          >
            {order.status.replace('_', ' ')}
          </span>
          <p
            className={`text-xs ${
              minutesAgo > 15 ? 'text-red-600 font-bold' : 'text-gray-500'
            }`}
          >
            {minutesAgo}m ago
          </p>
        </div>
      </div>

      {order.notes && (
        <div className="mb-3 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
          Note: {order.notes}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {isPending && (
          <button
            onClick={() => onStatusChange('IN_PROGRESS')}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start
          </button>
        )}
        {isInProgress && (
          <button
            onClick={() => onStatusChange('READY')}
            className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Ready
          </button>
        )}
        {isReady && (
          <button
            onClick={() => onStatusChange('SERVED')}
            className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Served
          </button>
        )}
      </div>
    </div>
  );
}

export default function KitchenDisplayPage() {
  const { data, isLoading, isError, error } = useKitchenOrders();
  const updateStatus = useUpdateKitchenOrderStatus();

  const orders: KitchenOrder[] = data?.data ?? [];

  // Group by status
  const pending = orders.filter((o) => o.status === 'PENDING');
  const inProgress = orders.filter((o) => o.status === 'IN_PROGRESS');
  const ready = orders.filter((o) => o.status === 'READY');

  const handleStatusChange = (id: string, status: KitchenOrderStatus) => {
    updateStatus.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading kitchen orders...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
        <div className="flex gap-4 text-sm">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
            Pending: {pending.length}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
            In Progress: {inProgress.length}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
            Ready: {ready.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Pending Column */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-yellow-700">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            Pending ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No pending orders</p>
            ) : (
              pending.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={(status) => handleStatusChange(order.id, status)}
                />
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-700">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            In Progress ({inProgress.length})
          </h2>
          <div className="space-y-4">
            {inProgress.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No orders in progress</p>
            ) : (
              inProgress.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={(status) => handleStatusChange(order.id, status)}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-700">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            Ready ({ready.length})
          </h2>
          <div className="space-y-4">
            {ready.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No orders ready</p>
            ) : (
              ready.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={(status) => handleStatusChange(order.id, status)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
