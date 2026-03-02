import { useParams, useNavigate } from 'react-router';
import {
  useWorkOrder,
  useWorkOrderOperations,
  useWorkOrderMaterials,
  useWorkOrderOutputs,
  useReleaseWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCancelWorkOrder,
  useUpdateOperationStatus,
  useRecordProductionOutput,
  type WorkOrder,
  type WorkOrderOperation,
  type MaterialConsumption,
  type ProductionOutput,
  type OperationStatus,
} from '../api';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RELEASED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS['DRAFT'];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function OperationsSection({
  workOrderId,
  operations,
  onRefresh,
}: {
  workOrderId: string;
  operations: WorkOrderOperation[];
  onRefresh: () => void;
}) {
  const updateStatus = useUpdateOperationStatus();

  const handleStatusChange = (
    operationId: string,
    newStatus: OperationStatus
  ) => {
    updateStatus.mutate(
      { workOrderId, operationId, status: newStatus },
      { onSuccess: onRefresh }
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Operations</h3>
      {operations.length === 0 ? (
        <p className="text-sm text-gray-500">No operations defined.</p>
      ) : (
        <div className="space-y-3">
          {operations
            .sort((a, b) => a.sequence - b.sequence)
            .map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      #{op.sequence}
                    </span>
                    <span className="font-medium text-gray-900">{op.name}</span>
                    <StatusBadge status={op.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Work Center: {op.workCenter?.name ?? op.workCenterId.slice(0, 8)}
                    {' | '}
                    Planned: {op.plannedHours}h | Actual: {op.actualHours}h
                  </p>
                </div>
                <div className="flex gap-2">
                  {op.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange(op.id, 'IN_PROGRESS')}
                      disabled={updateStatus.isPending}
                      className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
                      Start
                    </button>
                  )}
                  {op.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange(op.id, 'COMPLETED')}
                      disabled={updateStatus.isPending}
                      className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function MaterialsSection({ materials }: { materials: MaterialConsumption[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Materials</h3>
      {materials.length === 0 ? (
        <p className="text-sm text-gray-500">No materials tracked.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-semibold uppercase text-gray-500">
              <th className="py-2">Component</th>
              <th className="py-2">Planned</th>
              <th className="py-2">Consumed</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const planned = parseFloat(m.plannedQty);
              const consumed = parseFloat(m.consumedQty);
              const pct = planned > 0 ? Math.round((consumed / planned) * 100) : 0;
              return (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium">
                    {m.componentProductId.slice(0, 8)}
                  </td>
                  <td className="py-2">{m.plannedQty}</td>
                  <td className="py-2">{m.consumedQty}</td>
                  <td className="py-2">{m.unit}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OutputsSection({
  workOrderId,
  outputs,
  onRefresh,
}: {
  workOrderId: string;
  outputs: ProductionOutput[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const recordOutput = useRecordProductionOutput();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordOutput.mutate(
      {
        workOrderId,
        quantity: parseFloat(quantity),
        unit: 'EA',
        lotNumber: lotNumber || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setQuantity('');
          setLotNumber('');
          onRefresh();
        },
      }
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Production Output</h3>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
        >
          Record Output
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 rounded border bg-gray-50 p-3">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Lot Number
              </label>
              <input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordOutput.isPending}
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
            >
              {recordOutput.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {outputs.length === 0 ? (
        <p className="text-sm text-gray-500">No output recorded yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-semibold uppercase text-gray-500">
              <th className="py-2">Quantity</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Lot #</th>
              <th className="py-2">Received</th>
            </tr>
          </thead>
          <tbody>
            {outputs.map((o) => (
              <tr key={o.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{o.quantity}</td>
                <td className="py-2">{o.unit}</td>
                <td className="py-2">{o.lotNumber ?? '-'}</td>
                <td className="py-2 text-xs text-gray-500">
                  {formatDateTime(o.receivedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workOrder, isLoading, isError, error, refetch } = useWorkOrder(id!);
  const { data: opsData, refetch: refetchOps } = useWorkOrderOperations(id!);
  const { data: matsData } = useWorkOrderMaterials(id!);
  const { data: outputsData, refetch: refetchOutputs } = useWorkOrderOutputs(id!);

  const releaseWo = useReleaseWorkOrder();
  const startWo = useStartWorkOrder();
  const completeWo = useCompleteWorkOrder();
  const cancelWo = useCancelWorkOrder();

  const operations = opsData?.data ?? [];
  const materials = matsData?.data ?? [];
  const outputs = outputsData?.data ?? [];

  const handleAction = (action: 'release' | 'start' | 'complete' | 'cancel') => {
    const mutations = {
      release: () => releaseWo.mutateAsync(id!),
      start: () => startWo.mutateAsync(id!),
      complete: () => completeWo.mutateAsync(id!),
      cancel: () => cancelWo.mutateAsync({ id: id! }),
    };
    mutations[action]().then(() => refetch());
  };

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!workOrder) return <p className="p-6 text-gray-500">Work order not found.</p>;

  const progress =
    parseFloat(workOrder.producedQuantity) / parseFloat(workOrder.plannedQuantity);
  const progressPercent = Math.min(Math.round(progress * 100), 100);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button
        onClick={() => navigate('/manufacturing/work-orders')}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Work Orders
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.workOrderNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            BOM: {workOrder.bom?.name ?? workOrder.bomId}
          </p>
        </div>
        <StatusBadge status={workOrder.status} />
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Planned Qty
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {workOrder.plannedQuantity}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Produced Qty
          </p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {workOrder.producedQuantity}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Planned Start
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatDate(workOrder.plannedStartDate)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Planned End
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatDate(workOrder.plannedEndDate)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {workOrder.status === 'DRAFT' && (
          <button
            onClick={() => handleAction('release')}
            disabled={releaseWo.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Release
          </button>
        )}
        {workOrder.status === 'RELEASED' && (
          <button
            onClick={() => handleAction('start')}
            disabled={startWo.isPending}
            className="rounded bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            Start Production
          </button>
        )}
        {workOrder.status === 'IN_PROGRESS' && (
          <button
            onClick={() => handleAction('complete')}
            disabled={completeWo.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Mark Complete
          </button>
        )}
        {['DRAFT', 'RELEASED', 'IN_PROGRESS'].includes(workOrder.status) && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={cancelWo.isPending}
            className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <OperationsSection
          workOrderId={id!}
          operations={operations}
          onRefresh={() => {
            void refetch();
            void refetchOps();
          }}
        />
        <MaterialsSection materials={materials} />
        <OutputsSection
          workOrderId={id!}
          outputs={outputs}
          onRefresh={() => {
            void refetch();
            void refetchOutputs();
          }}
        />
      </div>

      {/* Notes */}
      {workOrder.notes && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {workOrder.notes}
          </p>
        </div>
      )}
    </div>
  );
}
