import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  useDeal,
  useUpdateDeal,
  useMarkDealWon,
  useMarkDealLost,
  useQuotes,
} from '../api';
import type { Deal } from '../api';
import { Timeline } from '../../comms/pages/timeline';

type Tab = 'details' | 'contacts' | 'quotes' | 'timeline';

function formatCurrency(value: string, currency: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading, isError, error } = useDeal(id ?? '');
  const updateDeal = useUpdateDeal();
  const markWon = useMarkDealWon();
  const markLost = useMarkDealLost();
  const {
    data: quotesData,
    isLoading: loadingQuotes,
  } = useQuotes(id ?? '');

  const [tab, setTab] = useState<Tab>('details');

  /* Editable form state */
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (deal) {
      setName(deal.name);
      setValue(deal.value);
      setCurrency(deal.currency);
      setExpectedCloseDate(
        deal.expectedCloseDate
          ? deal.expectedCloseDate.slice(0, 10)
          : '',
      );
      setNotes('');
    }
  }, [deal]);

  if (!id) return <p className="p-6 text-gray-400">Deal not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!deal) return <p className="p-6 text-gray-400">Deal not found.</p>;

  const isOpen = !deal.wonAt && !deal.lostAt;

  const handleSave = () => {
    updateDeal.mutate({
      id,
      version: deal.version,
      name,
      value,
      currency,
      expectedCloseDate: expectedCloseDate || undefined,
    });
  };

  const handleMarkWon = () => {
    markWon.mutate({ id });
  };

  const handleMarkLost = () => {
    const reason = window.prompt('Reason for losing this deal:');
    if (reason !== null) {
      markLost.mutate({ id, reason: reason || undefined });
    }
  };

  const stageColors = deal.stage?.color
    ? { backgroundColor: deal.stage.color }
    : undefined;
  const stageLabel = deal.stage?.name ?? deal.stageId;

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t ${
      tab === t
        ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  const quotes = quotesData?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-4">
        <Link
          to="/sales/deals"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Deals
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
        <span
          className="inline-block rounded px-2 py-0.5 text-xs text-white"
          style={stageColors ?? { backgroundColor: '#6b7280' }}
        >
          {stageLabel}
        </span>
      </div>

      {/* Sub-header metrics */}
      <div className="mb-4 flex items-center gap-6 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        <span>Probability: {deal.probability}%</span>
        {deal.wonAt && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Won
          </span>
        )}
        {deal.lostAt && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Lost
          </span>
        )}
      </div>

      {/* Action buttons */}
      {isOpen && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={handleMarkWon}
            disabled={markWon.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {markWon.isPending ? 'Saving…' : 'Mark Won'}
          </button>
          <button
            onClick={handleMarkLost}
            disabled={markLost.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {markLost.isPending ? 'Saving…' : 'Mark Lost'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('contacts')} className={tabClass('contacts')}>
          Contacts
        </button>
        <button onClick={() => setTab('quotes')} className={tabClass('quotes')}>
          Quotes
        </button>
        <button onClick={() => setTab('timeline')} className={tabClass('timeline')}>
          Timeline
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* ── Details ── */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Deal Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Value
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateDeal.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateDeal.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>

            {updateDeal.isError && (
              <p className="text-sm text-red-600">{updateDeal.error.message}</p>
            )}
            {updateDeal.isSuccess && (
              <p className="text-sm text-green-600">Saved successfully.</p>
            )}
          </div>
        )}

        {/* ── Contacts ── */}
        {tab === 'contacts' && (
          <div>
            {(!deal.contacts || deal.contacts.length === 0) ? (
              <p className="py-8 text-center text-gray-400">
                No contacts associated with this deal.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Primary</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.contacts.map((dc) => (
                    <tr
                      key={dc.contact.id}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {dc.contact.firstName} {dc.contact.lastName}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {dc.role ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        {dc.isPrimary && (
                          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Primary
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Quotes ── */}
        {tab === 'quotes' && (
          <div>
            <div className="mb-4 flex justify-end">
              <Link
                to={`/sales/deals/${id}/quotes/new`}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                New Quote
              </Link>
            </div>

            {loadingQuotes && <p className="text-gray-500">Loading…</p>}

            {!loadingQuotes && quotes.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                No quotes for this deal.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const statusColors =
                      QUOTE_STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-700';
                    const approvalColors =
                      APPROVAL_COLORS[q.approvalStatus] ?? 'bg-gray-100 text-gray-700';
                    return (
                      <tr
                        key={q.id}
                        className="border-b border-gray-100"
                      >
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {q.quoteNumber}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {q.title ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-900">
                          {formatCurrency(q.total, q.currency)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${approvalColors}`}
                          >
                            {q.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Timeline ── */}
        {tab === 'timeline' && id && (
          <Timeline dealId={id} />
        )}
      </div>
    </div>
  );
}
