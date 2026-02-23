import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useCreateQuote, useQuote, useSubmitQuoteApproval } from '../api';
import type { Quote } from '../api';

interface LineItem {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

function emptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 0,
  };
}

function calcLineTotal(line: LineItem): number {
  return line.quantity * line.unitPrice * (1 - line.discount / 100) * (1 + line.taxRate / 100);
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
};

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

/* ─────────────────────────────────────────────────────────────────────────
   Read-only view
   ───────────────────────────────────────────────────────────────────────── */

function ReadOnlyView({ quote }: { quote: Quote }) {
  const submitApproval = useSubmitQuoteApproval();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quote #{quote.quoteNumber}
          </h1>
          {quote.title && (
            <p className="mt-1 text-gray-600">{quote.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[quote.status] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {quote.status}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${APPROVAL_COLORS[quote.approvalStatus] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {quote.approvalStatus}
          </span>
        </div>
      </div>

      {/* Line items table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Discount %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Tax %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quote.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-2 text-gray-900">{line.description}</td>
                <td className="px-4 py-2 text-right text-gray-700">{line.quantity}</td>
                <td className="px-4 py-2 text-right text-gray-700">{line.unitPrice}</td>
                <td className="px-4 py-2 text-right text-gray-700">{line.discount}</td>
                <td className="px-4 py-2 text-right text-gray-700">{line.taxRate}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {parseFloat(line.lineTotal).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Subtotal</dt>
            <dd className="font-medium text-gray-900">{parseFloat(quote.subtotal).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Discount</dt>
            <dd className="font-medium text-gray-900">−{parseFloat(quote.discountAmount).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Tax</dt>
            <dd className="font-medium text-gray-900">{parseFloat(quote.taxAmount).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <dt className="font-semibold text-gray-900">Total</dt>
            <dd className="font-semibold text-gray-900">
              {quote.currency} {parseFloat(quote.total).toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Submit for approval */}
      {quote.status === 'DRAFT' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => submitApproval.mutate({ id: quote.id })}
            disabled={submitApproval.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitApproval.isPending ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      )}

      <div>
        <Link
          to={`/sales/deals/${quote.dealId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to deal
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Creation form
   ───────────────────────────────────────────────────────────────────────── */

function CreationForm({ dealId }: { dealId: string }) {
  const navigate = useNavigate();
  const createQuote = useCreateQuote();

  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [validUntil, setValidUntil] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const updateLine = (key: string, field: keyof Omit<LineItem, 'key'>, raw: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (field === 'description') return { ...l, description: raw };
        const num = parseFloat(raw);
        return { ...l, [field]: isNaN(num) ? 0 : num };
      }),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) =>
    setLines((prev) => {
      const next = prev.filter((l) => l.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });

  /* Computed totals */
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const discountAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (l.discount / 100),
    0,
  );
  const taxAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.taxRate / 100),
    0,
  );
  const grandTotal = subtotal - discountAmount + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuote.mutate(
      {
        dealId,
        title,
        currency,
        validUntil: validUntil || undefined,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          taxRate: l.taxRate,
        })),
      },
      {
        onSuccess: () => {
          void navigate(`/sales/deals/${dealId}`);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Quote</h1>
        <Link
          to={`/sales/deals/${dealId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to deal
        </Link>
      </div>

      {/* Meta fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="quote-title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="quote-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="quote-currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select
            id="quote-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div>
          <label htmlFor="quote-valid" className="block text-sm font-medium text-gray-700">
            Valid Until
          </label>
          <input
            id="quote-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Discount %</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Tax Rate %</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Line Total</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((line) => (
              <tr key={line.key}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.key, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step={1}
                    min={0}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, 'quantity', e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.key, 'unitPrice', e.target.value)}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={100}
                    value={line.discount}
                    onChange={(e) => updateLine(line.key, 'discount', e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={line.taxRate}
                    onChange={(e) => updateLine(line.key, 'taxRate', e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">
                  {calcLineTotal(line).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Add Line
      </button>

      {/* Summary */}
      <div className="flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Subtotal</dt>
            <dd className="font-medium text-gray-900">{subtotal.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Discount</dt>
            <dd className="font-medium text-gray-900">−{discountAmount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Tax</dt>
            <dd className="font-medium text-gray-900">{taxAmount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <dt className="font-semibold text-gray-900">Grand Total</dt>
            <dd className="font-semibold text-gray-900">
              {currency} {grandTotal.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link
          to={`/sales/deals/${dealId}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={createQuote.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createQuote.isPending ? 'Creating…' : 'Create Quote'}
        </button>
      </div>

      {createQuote.isError && (
        <p className="text-sm text-red-600">{createQuote.error.message}</p>
      )}
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────────────────────────────────── */

export default function QuoteBuilderPage() {
  const { id, dealId } = useParams<{ id?: string; dealId?: string }>();

  /* Read-only: viewing an existing quote */
  if (id) {
    return <QuoteReadOnlyWrapper id={id} />;
  }

  /* Creation mode: must have dealId */
  if (dealId) {
    return <CreationForm dealId={dealId} />;
  }

  return <p className="p-6 text-gray-400">Missing deal context.</p>;
}

function QuoteReadOnlyWrapper({ id }: { id: string }) {
  const { data: quote, isLoading, isError, error } = useQuote(id);

  if (isLoading) return <p className="p-6 text-gray-500">Loading quote…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!quote) return <p className="p-6 text-gray-400">Quote not found.</p>;

  return <ReadOnlyView quote={quote} />;
}
