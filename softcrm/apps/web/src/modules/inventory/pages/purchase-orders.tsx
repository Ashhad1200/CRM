import { useState } from 'react';
import {
  usePurchaseOrders,
  useApprovePurchaseOrder,
  useCreatePurchaseOrder,
} from '../api.js';
import type { PurchaseOrder } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

interface POLineInput {
  productId: string;
  quantity: string;
  unitCost: string;
}

function CreatePODialog({ onClose }: { onClose: () => void }) {
  const [vendorName, setVendorName] = useState('');
  const [lines, setLines] = useState<POLineInput[]>([
    { productId: '', quantity: '', unitCost: '' },
  ]);
  const createPO = useCreatePurchaseOrder();

  const updateLine = (idx: number, field: keyof POLineInput, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { productId: '', quantity: '', unitCost: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPO.mutate(
      {
        vendorName,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Purchase Order
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Vendor Name
        </label>
        <input
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          required
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Lines</span>
          <button
            type="button"
            onClick={addLine}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add Line
          </button>
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className="mb-3 flex gap-2">
            <input
              value={line.productId}
              onChange={(e) => updateLine(idx, 'productId', e.target.value)}
              placeholder="Product ID"
              required
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              value={line.quantity}
              onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
              placeholder="Qty"
              required
              className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              value={line.unitCost}
              onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
              placeholder="Unit Cost"
              required
              className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPO.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createPO.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createPO.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createPO.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { data, isLoading, isError, error } = usePurchaseOrders();
  const approvePO = useApprovePurchaseOrder();
  const [showCreate, setShowCreate] = useState(false);

  const orders: PurchaseOrder[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New PO
        </button>
      </div>

      {showCreate && (
        <CreatePODialog onClose={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">PO #</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Approval</th>
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
                  colSpan={8}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr
                  key={po.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    #{po.poNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{po.vendorName}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        APPROVAL_COLORS[po.approvalStatus] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {po.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {po.lines.length}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    ${Number(po.total).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    {po.approvalStatus === 'PENDING' && (
                      <button
                        onClick={() => approvePO.mutate({ id: po.id })}
                        disabled={approvePO.isPending}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {approvePO.isError && (
        <p className="mt-4 text-sm text-red-600">
          {approvePO.error.message}
        </p>
      )}
    </div>
  );
}
