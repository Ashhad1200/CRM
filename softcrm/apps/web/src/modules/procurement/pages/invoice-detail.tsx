import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  useVendorInvoice,
  useMatchInvoiceToReceipt,
  useApproveVendorInvoice,
  useGoodsReceipts,
} from '../api';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
type MatchStatus = 'UNMATCHED' | 'PARTIAL' | 'MATCHED';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const MATCH_COLORS: Record<MatchStatus, string> = {
  UNMATCHED: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  MATCHED: 'bg-green-100 text-green-700',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError, error } = useVendorInvoice(id ?? '');
  const { data: receiptsData } = useGoodsReceipts({ status: 'CONFIRMED' });
  const matchInvoice = useMatchInvoiceToReceipt();
  const approveInvoice = useApproveVendorInvoice();
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');

  const receipts = receiptsData?.data ?? [];

  if (!id) return <p className="p-6 text-gray-400">Invoice not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!invoice) return <p className="p-6 text-gray-400">Invoice not found.</p>;

  const handleApprove = () => {
    approveInvoice.mutate({ id });
  };

  const handleMatch = () => {
    matchInvoice.mutate(
      { invoiceId: id, goodsReceiptId: selectedReceiptId },
      {
        onSuccess: () => setShowMatchDialog(false),
      }
    );
  };

  const canMatch = invoice.matchStatus !== 'MATCHED';
  const canApprove = invoice.status === 'PENDING' && invoice.matchStatus === 'MATCHED';

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/procurement/invoices')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Invoices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[invoice.status as InvoiceStatus]}`}
          >
            {invoice.status}
          </span>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${MATCH_COLORS[invoice.matchStatus as MatchStatus]}`}
          >
            {invoice.matchStatus}
          </span>
        </div>
        <div className="flex gap-2">
          {canMatch && (
            <button
              onClick={() => setShowMatchDialog(true)}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Match to Receipt
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={approveInvoice.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approveInvoice.isPending ? 'Approving...' : 'Approve Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Supplier</p>
          <p className="font-medium text-gray-900">
            {invoice.supplier?.name ?? invoice.supplierId}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Currency</p>
          <p className="font-medium text-gray-900">{invoice.currency}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Invoice Date</p>
          <p className="font-medium text-gray-900">
            {new Date(invoice.invoiceDate).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Due Date</p>
          <p className="font-medium text-gray-900">
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        {invoice.poId && (
          <div>
            <p className="text-sm text-gray-500">Purchase Order</p>
            <Link
              to={`/procurement/purchase-orders/${invoice.poId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              View PO
            </Link>
          </div>
        )}
        {invoice.goodsReceiptId && (
          <div>
            <p className="text-sm text-gray-500">Goods Receipt</p>
            <Link
              to={`/procurement/receiving/${invoice.goodsReceiptId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              View Receipt
            </Link>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoice Amounts</h2>
        <div className="flex justify-end">
          <dl className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd className="font-medium text-gray-900">
                ${parseFloat(invoice.subtotal).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Tax</dt>
              <dd className="font-medium text-gray-900">
                ${parseFloat(invoice.taxAmount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <dt className="font-semibold text-gray-900">Total</dt>
              <dd className="font-semibold text-gray-900">
                {invoice.currency} {parseFloat(invoice.total).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Three-Way Match Status */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Three-Way Match</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded bg-gray-50 p-3 text-center">
            <p className="text-sm text-gray-500">Purchase Order</p>
            {invoice.poId ? (
              <p className="font-medium text-green-600">Linked</p>
            ) : (
              <p className="font-medium text-gray-400">Not Linked</p>
            )}
          </div>
          <div className="rounded bg-gray-50 p-3 text-center">
            <p className="text-sm text-gray-500">Goods Receipt</p>
            {invoice.goodsReceiptId ? (
              <p className="font-medium text-green-600">Matched</p>
            ) : (
              <p className="font-medium text-red-600">Not Matched</p>
            )}
          </div>
          <div className="rounded bg-gray-50 p-3 text-center">
            <p className="text-sm text-gray-500">Invoice</p>
            <p className="font-medium text-green-600">Received</p>
          </div>
        </div>
        {invoice.matchStatus !== 'MATCHED' && (
          <p className="mt-4 text-sm text-yellow-600">
            This invoice needs to be matched to a goods receipt before approval.
          </p>
        )}
      </div>

      {/* Match Dialog */}
      {showMatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Match to Goods Receipt
            </h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Goods Receipt
            </label>
            <select
              value={selectedReceiptId}
              onChange={(e) => setSelectedReceiptId(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a receipt</option>
              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.receiptNumber} - {new Date(r.receivedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMatchDialog(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleMatch}
                disabled={matchInvoice.isPending || !selectedReceiptId}
                className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {matchInvoice.isPending ? 'Matching...' : 'Match'}
              </button>
            </div>
            {matchInvoice.isError && (
              <p className="mt-2 text-sm text-red-600">{matchInvoice.error.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Mutation feedback */}
      {approveInvoice.isError && (
        <p className="mt-4 text-sm text-red-600">{approveInvoice.error.message}</p>
      )}
      {approveInvoice.isSuccess && (
        <p className="mt-4 text-sm text-green-600">Invoice approved successfully.</p>
      )}
    </div>
  );
}
