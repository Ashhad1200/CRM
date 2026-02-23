import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useInvoices, useCreateInvoice } from '../api.js';
import type { Invoice } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  VOID: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-orange-100 text-orange-700',
};

const STATUSES = ['ALL', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}

function CreateInvoiceDialog({ onClose }: { onClose: () => void }) {
  const [contactId, setContactId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [lineDesc, setLineDesc] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('');
  const [lineTax, setLineTax] = useState('0');
  const [lines, setLines] = useState<{ description: string; quantity: number; unitPrice: number; taxRate: number }[]>([]);

  const createInvoice = useCreateInvoice();

  const addLine = () => {
    if (!lineDesc || !linePrice) return;
    setLines((prev) => [
      ...prev,
      { description: lineDesc, quantity: Number(lineQty), unitPrice: Number(linePrice), taxRate: Number(lineTax) },
    ]);
    setLineDesc('');
    setLineQty('1');
    setLinePrice('');
    setLineTax('0');
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoice.mutate(
      {
        contactId: contactId || undefined,
        issueDate,
        dueDate,
        currency,
        notes: notes || undefined,
        lines,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Invoice</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Contact ID</label>
        <input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Optional"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        {/* Line items */}
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Line Items</h3>
        {lines.length > 0 && (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="py-1 text-left">Description</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Tax %</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{l.description}</td>
                  <td className="py-1 text-right">{l.quantity}</td>
                  <td className="py-1 text-right">{l.unitPrice.toFixed(2)}</td>
                  <td className="py-1 text-right">{l.taxRate}%</td>
                  <td className="py-1 text-right">
                    <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mb-3 grid grid-cols-5 gap-2">
          <input placeholder="Description" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          <input placeholder="Qty" type="number" min="1" value={lineQty} onChange={(e) => setLineQty(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          <input placeholder="Price" type="number" step="0.01" value={linePrice} onChange={(e) => setLinePrice(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
          <button type="button" onClick={addLine}
            className="rounded bg-gray-100 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
            + Add
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={createInvoice.isPending || lines.length === 0}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createInvoice.isPending ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>

        {createInvoice.isError && (
          <p className="mt-2 text-sm text-red-600">{createInvoice.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function InvoicesListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (statusFilter !== 'ALL') filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useInvoices(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  const invoices: Invoice[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Invoice
        </button>
      </div>

      {showCreate && <CreateInvoiceDialog onClose={() => setShowCreate(false)} />}

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <>
          <p className="mb-2 text-xs text-gray-400">{data.meta?.total ?? invoices.length} invoice(s)</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Issue Date</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3">Currency</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/accounting/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-900">INV-{inv.invoiceNumber}</td>
                    <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-3 py-3 text-gray-600">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{Number(inv.total).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{Number(inv.paidAmount).toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-500">{inv.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
