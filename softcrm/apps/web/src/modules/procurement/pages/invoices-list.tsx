import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useVendorInvoices, useCreateVendorInvoice, useSuppliers } from '../api';
import type { VendorInvoice } from '../api';

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

function CreateInvoiceDialog({ onClose }: { onClose: () => void }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const { data: suppliersData } = useSuppliers({ status: 'ACTIVE' });
  const createInvoice = useCreateVendorInvoice();

  const suppliers = suppliersData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoice.mutate(
      {
        invoiceNumber,
        supplierId,
        invoiceDate,
        dueDate,
        subtotal: parseFloat(subtotal),
        taxAmount: parseFloat(taxAmount) || 0,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Vendor Invoice</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Invoice Number *
        </label>
        <input
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          required
          placeholder="e.g. INV-2024-001"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Supplier *
        </label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Invoice Date *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Subtotal *
            </label>
            <input
              type="number"
              step="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tax Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
            disabled={createInvoice.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createInvoice.isPending ? 'Creating...' : 'Create'}
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = useVendorInvoices(
    statusFilter ? { status: statusFilter } : undefined
  );
  const [showCreate, setShowCreate] = useState(false);

  const invoices: VendorInvoice[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Invoices</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Invoice
          </button>
        </div>
      </div>

      {showCreate && <CreateInvoiceDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Invoice #</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Invoice Date</th>
              <th className="px-3 py-3">Due Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Match</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/procurement/invoices/${inv.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-sm font-medium text-gray-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {inv.supplier?.name ?? inv.supplierId.slice(0, 8) + '...'}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {inv.currency} {parseFloat(inv.total).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(inv.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status as InvoiceStatus]}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MATCH_COLORS[inv.matchStatus as MatchStatus]}`}
                    >
                      {inv.matchStatus}
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
