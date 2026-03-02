import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  useWorkOrders,
  useUpdateWorkOrderStatus,
  useCreateWorkOrder,
  type WorkOrder,
  type WorkOrderStatus,
} from '../api';

const STATUS_COLUMNS: { status: WorkOrderStatus; label: string; color: string }[] = [
  { status: 'DRAFT', label: 'Draft', color: '#9ca3af' },
  { status: 'RELEASED', label: 'Released', color: '#3b82f6' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b' },
  { status: 'COMPLETED', label: 'Completed', color: '#22c55e' },
  { status: 'CANCELLED', label: 'Cancelled', color: '#ef4444' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

function WorkOrderCard({
  workOrder,
  onNavigate,
}: {
  workOrder: WorkOrder;
  onNavigate: (id: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', workOrder.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const progress =
    parseFloat(workOrder.producedQuantity) / parseFloat(workOrder.plannedQuantity);
  const progressPercent = Math.min(Math.round(progress * 100), 100);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onNavigate(workOrder.id)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md"
    >
      <p className="mb-1 text-sm font-semibold text-gray-900">
        {workOrder.workOrderNumber}
      </p>
      <p className="mb-2 text-xs text-gray-600 truncate">
        BOM: {workOrder.bom?.name ?? workOrder.bomId.slice(0, 8)}
      </p>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Qty: {workOrder.plannedQuantity}</span>
        <span>{formatDate(workOrder.plannedEndDate)}</span>
      </div>
    </div>
  );
}

function StatusColumn({
  status,
  label,
  color,
  workOrders,
  onMoveOrder,
  onNavigate,
}: {
  status: WorkOrderStatus;
  label: string;
  color: string;
  workOrders: WorkOrder[];
  onMoveOrder: (orderId: string, newStatus: WorkOrderStatus) => void;
  onNavigate: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId) {
      onMoveOrder(orderId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[400px] w-64 shrink-0 flex-col rounded-lg bg-gray-50 p-3 ${
        dragOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
          {workOrders.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {workOrders.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            No work orders
          </p>
        ) : (
          workOrders.map((wo) => (
            <WorkOrderCard key={wo.id} workOrder={wo} onNavigate={onNavigate} />
          ))
        )}
      </div>
    </div>
  );
}

function CreateWorkOrderDialog({ onClose }: { onClose: () => void }) {
  const [bomId, setBomId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const createWorkOrder = useCreateWorkOrder();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWorkOrder.mutate(
      {
        bomId,
        productId,
        plannedQuantity: parseFloat(quantity),
        plannedStartDate: plannedStart || undefined,
        plannedEndDate: plannedEnd || undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Work Order
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          BOM ID
        </label>
        <input
          value={bomId}
          onChange={(e) => setBomId(e.target.value)}
          required
          placeholder="Select BOM"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Product ID
        </label>
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          placeholder="Product to manufacture"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Planned Quantity
        </label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Planned Start
            </label>
            <input
              type="date"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Planned End
            </label>
            <input
              type="date"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

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
            disabled={createWorkOrder.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createWorkOrder.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createWorkOrder.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createWorkOrder.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function WorkOrdersKanbanPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useWorkOrders();
  const updateStatus = useUpdateWorkOrderStatus();
  const [showCreate, setShowCreate] = useState(false);
  const [hideCancelled, setHideCancelled] = useState(true);

  const workOrders: WorkOrder[] = data?.data ?? [];

  const ordersByStatus = useMemo(() => {
    const map = new Map<WorkOrderStatus, WorkOrder[]>();
    for (const col of STATUS_COLUMNS) {
      map.set(col.status, []);
    }
    for (const wo of workOrders) {
      const list = map.get(wo.status);
      if (list) {
        list.push(wo);
      }
    }
    return map;
  }, [workOrders]);

  const handleMoveOrder = (orderId: string, newStatus: WorkOrderStatus) => {
    const order = workOrders.find((wo) => wo.id === orderId);
    if (order && order.status !== newStatus) {
      updateStatus.mutate({ id: orderId, status: newStatus });
    }
  };

  const handleNavigate = (id: string) => {
    navigate(`/manufacturing/work-orders/${id}`);
  };

  const visibleColumns = hideCancelled
    ? STATUS_COLUMNS.filter((c) => c.status !== 'CANCELLED')
    : STATUS_COLUMNS;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={hideCancelled}
              onChange={(e) => setHideCancelled(e.target.checked)}
              className="rounded"
            />
            Hide Cancelled
          </label>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Work Order
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateWorkOrderDialog onClose={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {!isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleColumns.map((col) => (
            <StatusColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              workOrders={ordersByStatus.get(col.status) ?? []}
              onMoveOrder={handleMoveOrder}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
