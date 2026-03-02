import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGoodsReceipts, useCreateGoodsReceipt, usePurchaseOrders } from '../api';
import type { GoodsReceipt, GoodsReceiptStatus } from '../api';

const STATUS_COLORS: Record<GoodsReceiptStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-green-100 text-green-700',
};

function CreateReceiptDialog({
  onClose,
  preselectedPoId,
}: {
  onClose: () => void;
  preselectedPoId?: string;
}) {
  const [poId, setPoId] = useState(preselectedPoId ?? '');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const { data: posData } = usePurchaseOrders({ status: 'CONFIRMED' });
  const createReceipt = useCreateGoodsReceipt();

  const purchaseOrders = posData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReceipt.mutate(
      {
        poId,
        warehouseId: warehouseId || undefined,
        notes: notes || undefined,
        receivedAt: new Date().toISOString(),
        lines: [],
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Goods Receipt</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Purchase Order *
        </label>
        <select
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a purchase order</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.poNumber} - {po.supplier?.name ?? 'Unknown Supplier'}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Warehouse ID
        </label>
        <input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder="Optional warehouse ID"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

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
            disabled={createReceipt.isPending || !poId}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createReceipt.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createReceipt.isError && (
          <p className="mt-2 text-sm text-red-600">{createReceipt.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function ReceivingListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPoId = searchParams.get('poId') ?? undefined;
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = useGoodsReceipts(
    statusFilter ? { status: statusFilter } : undefined
  );
  const [showCreate, setShowCreate] = useState(!!preselectedPoId);

  const receipts: GoodsReceipt[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goods Receipts</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Receipt
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateReceiptDialog
          onClose={() => setShowCreate(false)}
          preselectedPoId={preselectedPoId}
        />
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Receipt Number</th>
              <th className="px-3 py-3">PO Number</th>
              <th className="px-3 py-3">Received By</th>
              <th className="px-3 py-3">Received At</th>
              <th className="px-3 py-3">Lines</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No goods receipts found.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/procurement/receiving/${r.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-sm font-medium text-gray-900">
                    {r.receiptNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.purchaseOrder?.poNumber ?? r.poId.slice(0, 8) + '...'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.receivedBy.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(r.receivedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{r.lines.length} items</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                    >
                      {r.status}
                    </span>
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
