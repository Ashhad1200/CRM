import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useInvoice,
  useInvoicePayments,
  useRecordPayment,
  useSendInvoice,
  useVoidInvoice,
} from '../api.js';
import type { Payment } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  VOID: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-orange-100 text-orange-700',
};

const PAYMENT_METHODS = ['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHECK', 'OTHER'] as const;

function PaymentDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const recordPayment = useRecordPayment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordPayment.mutate(
      {
        invoiceId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
        paidAt: new Date(paidAt).toISOString(),
        notes: notes || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Record Payment</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">Reference</label>
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Paid At</label>
        <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={recordPayment.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </div>

        {recordPayment.isError && (
          <p className="mt-2 text-sm text-red-600">{recordPayment.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceQuery = useInvoice(id!);
  const paymentsQuery = useInvoicePayments(id!);
  const sendInvoice = useSendInvoice();
  const voidInvoice = useVoidInvoice();
  const [showPayment, setShowPayment] = useState(false);

  if (invoiceQuery.isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (invoiceQuery.isError) return <div className="p-6 text-red-600">{invoiceQuery.error.message}</div>;

  const inv = invoiceQuery.data;
  if (!inv) return <div className="p-6 text-gray-500">Invoice not found.</div>;

  const payments: Payment[] = paymentsQuery.data?.data ?? inv.payments ?? [];
  const statusColor = STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-700';
  const remaining = Number(inv.total) - Number(inv.paidAmount);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button onClick={() => navigate('/accounting/invoices')}
        className="mb-4 text-sm text-blue-600 hover:underline">&larr; Back to Invoices</button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">INV-{inv.invoiceNumber}</h1>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>
            {inv.status}
          </span>
        </div>
        <div className="flex gap-2">
          {inv.status === 'DRAFT' && (
            <button onClick={() => sendInvoice.mutate({ id: inv.id })} disabled={sendInvoice.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {sendInvoice.isPending ? 'Sending…' : 'Send'}
            </button>
          )}
          {inv.status !== 'VOID' && inv.status !== 'PAID' && (
            <button onClick={() => setShowPayment(true)}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Record Payment
            </button>
          )}
          {inv.status !== 'VOID' && inv.status !== 'PAID' && (
            <button onClick={() => voidInvoice.mutate({ id: inv.id })} disabled={voidInvoice.isPending}
              className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
              {voidInvoice.isPending ? 'Voiding…' : 'Void'}
            </button>
          )}
        </div>
      </div>

      {showPayment && <PaymentDialog invoiceId={inv.id} onClose={() => setShowPayment(false)} />}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500">Issue Date</p>
          <p className="text-sm font-medium text-gray-900">{new Date(inv.issueDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-sm font-medium text-gray-900">{new Date(inv.dueDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-gray-900">{inv.currency} {Number(inv.total).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Balance Due</p>
          <p className={`text-sm font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {inv.currency} {remaining.toFixed(2)}
          </p>
        </div>
      </div>

      {inv.notes && (
        <div className="mb-6">
          <p className="text-xs text-gray-500">Notes</p>
          <p className="text-sm text-gray-700">{inv.notes}</p>
        </div>
      )}

      {/* Line items */}
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Line Items</h2>
      <table className="mb-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Unit Price</th>
            <th className="px-3 py-2 text-right">Discount</th>
            <th className="px-3 py-2 text-right">Tax %</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(inv.lines ?? []).map((line) => (
            <tr key={line.id} className="border-b border-gray-100">
              <td className="px-3 py-2 text-gray-900">{line.description}</td>
              <td className="px-3 py-2 text-right text-gray-600">{line.quantity}</td>
              <td className="px-3 py-2 text-right text-gray-600">{Number(line.unitPrice).toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{Number(line.discount).toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{line.taxRate}%</td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">{Number(line.lineTotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t text-sm">
            <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-700">Subtotal</td>
            <td className="px-3 py-2 text-right text-gray-900">{Number(inv.subtotal).toFixed(2)}</td>
          </tr>
          <tr className="text-sm">
            <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-700">Tax</td>
            <td className="px-3 py-2 text-right text-gray-900">{Number(inv.taxAmount).toFixed(2)}</td>
          </tr>
          <tr className="text-sm font-bold">
            <td colSpan={5} className="px-3 py-2 text-right text-gray-900">Total</td>
            <td className="px-3 py-2 text-right text-gray-900">{Number(inv.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payments */}
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Payments</h2>
      {paymentsQuery.isLoading && <p className="text-gray-500">Loading payments…</p>}
      {payments.length === 0 && !paymentsQuery.isLoading ? (
        <p className="text-sm text-gray-400">No payments recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="px-3 py-2 text-gray-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right font-medium text-green-700">{Number(p.amount).toFixed(2)}</td>
                <td className="px-3 py-2 text-gray-600">{p.method.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2 text-gray-500">{p.reference ?? '—'}</td>
                <td className="px-3 py-2 text-gray-500">{p.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
