import { useParams, useNavigate, Link } from 'react-router';
import { useGoodsReceipt, useConfirmGoodsReceipt } from '../api';
import type { GoodsReceiptStatus } from '../api';

const STATUS_COLORS: Record<GoodsReceiptStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-green-100 text-green-700',
};

export default function ReceivingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: receipt, isLoading, isError, error } = useGoodsReceipt(id ?? '');
  const confirmReceipt = useConfirmGoodsReceipt();

  if (!id) return <p className="p-6 text-gray-400">Goods receipt not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!receipt) return <p className="p-6 text-gray-400">Goods receipt not found.</p>;

  const handleConfirm = () => {
    confirmReceipt.mutate({ id });
  };

  const totalReceived = receipt.lines.reduce(
    (sum, line) => sum + parseFloat(line.receivedQty),
    0
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/procurement/receiving')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Goods Receipts
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{receipt.receiptNumber}</h1>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[receipt.status]}`}
          >
            {receipt.status}
          </span>
        </div>
        <div className="flex gap-2">
          {receipt.status === 'DRAFT' && (
            <button
              onClick={handleConfirm}
              disabled={confirmReceipt.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {confirmReceipt.isPending ? 'Confirming...' : 'Confirm Receipt'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Purchase Order</p>
          <Link
            to={`/procurement/purchase-orders/${receipt.poId}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {receipt.purchaseOrder?.poNumber ?? receipt.poId}
          </Link>
        </div>
        <div>
          <p className="text-sm text-gray-500">Received By</p>
          <p className="font-medium text-gray-900">{receipt.receivedBy}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Received At</p>
          <p className="font-medium text-gray-900">
            {new Date(receipt.receivedAt).toLocaleString()}
          </p>
        </div>
        {receipt.warehouseId && (
          <div>
            <p className="text-sm text-gray-500">Warehouse</p>
            <p className="font-medium text-gray-900">{receipt.warehouseId}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">Total Items Received</p>
          <p className="font-medium text-gray-900">{totalReceived.toFixed(0)} units</p>
        </div>
        {receipt.notes && (
          <div className="col-span-3">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="text-gray-900">{receipt.notes}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Received Items</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">PO Line</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Product ID</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Received Qty</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Lot Number</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receipt.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No line items received yet.
                </td>
              </tr>
            ) : (
              receipt.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2 font-mono text-sm text-gray-600">
                    {line.poLineId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 font-mono text-sm text-gray-600">
                    {line.productId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {parseFloat(line.receivedQty).toFixed(0)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{line.lotNumber ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{line.notes ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mutation feedback */}
      {confirmReceipt.isError && (
        <p className="mt-4 text-sm text-red-600">{confirmReceipt.error.message}</p>
      )}
      {confirmReceipt.isSuccess && (
        <p className="mt-4 text-sm text-green-600">Receipt confirmed successfully.</p>
      )}
    </div>
  );
}
