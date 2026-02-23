import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client.js';

/* ── Types ── */

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  status: string;
}

interface PaginatedInvoices {
  data: Invoice[];
  meta: { total: number; page: number; limit: number };
}

/* ── Status badges ── */

const invoiceStatusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  VOID: 'bg-red-100 text-red-800',
  OVERDUE: 'bg-orange-100 text-orange-800',
};

/* ── Helpers ── */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

/* ── Component ── */

export default function PortalInvoices() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => apiClient<PaginatedInvoices>('/api/v1/accounting/invoices'),
  });

  const invoices = data?.data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Invoices</h1>

      <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-gray-500 text-sm">Loading invoices…</div>
        )}

        {isError && (
          <div className="p-8 text-center text-red-600 text-sm">
            Failed to load invoices. Please try again later.
          </div>
        )}

        {!isLoading && !isError && invoices.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No invoices found.</div>
        )}

        {!isLoading && invoices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmtCurrency(inv.paidAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${invoiceStatusColor[inv.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
