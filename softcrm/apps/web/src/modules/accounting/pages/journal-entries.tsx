import { useState } from 'react';
import { useJournalEntries, useCreateJournalEntry, useChartOfAccounts } from '../api.js';
import type { JournalEntry } from '../api.js';

function CreateJournalDialog({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [fiscalPeriodId, setFiscalPeriodId] = useState('');
  const [lines, setLines] = useState<{ accountId: string; debit: string; credit: string; description: string }[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ]);

  const createEntry = useCreateJournalEntry();
  const { data: coaData } = useChartOfAccounts();
  const accounts = coaData?.data ?? [];

  const addLine = () =>
    setLines((prev) => [...prev, { accountId: '', debit: '', credit: '', description: '' }]);

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, val: string) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));

  const totalDebits = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEntry.mutate(
      {
        date: new Date(date).toISOString(),
        description,
        fiscalPeriodId: fiscalPeriodId || undefined,
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || undefined,
          })),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Journal Entry</h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fiscal Period ID</label>
            <input value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} placeholder="Optional"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} required
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <h3 className="mb-2 text-sm font-semibold text-gray-800">Lines</h3>
        <table className="mb-2 w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              <th className="py-1 text-left">Account</th>
              <th className="py-1 text-right">Debit</th>
              <th className="py-1 text-right">Credit</th>
              <th className="py-1 text-left">Memo</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-1">
                  <select value={l.accountId} onChange={(e) => updateLine(i, 'accountId', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">-- select --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-1">
                  <input type="number" step="0.01" min="0" value={l.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
                </td>
                <td className="py-1 pr-1">
                  <input type="number" step="0.01" min="0" value={l.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
                </td>
                <td className="py-1 pr-1">
                  <input value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none" />
                </td>
                <td className="py-1">
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                    className="text-xs text-red-500 hover:text-red-700 disabled:text-gray-300">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t text-sm font-medium">
              <td className="py-1 text-gray-700">Totals</td>
              <td className="py-1 text-right text-gray-900">{totalDebits.toFixed(2)}</td>
              <td className="py-1 text-right text-gray-900">{totalCredits.toFixed(2)}</td>
              <td colSpan={2} className="py-1 text-right">
                {isBalanced ? (
                  <span className="text-xs text-green-600">Balanced ✓</span>
                ) : (
                  <span className="text-xs text-red-600">Not balanced</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>

        <button type="button" onClick={addLine}
          className="mb-4 text-sm text-blue-600 hover:underline">+ Add Line</button>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={createEntry.isPending || !isBalanced}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createEntry.isPending ? 'Creating…' : 'Create Entry'}
          </button>
        </div>

        {createEntry.isError && (
          <p className="mt-2 text-sm text-red-600">{createEntry.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function JournalEntriesPage() {
  const { data, isLoading, isError, error } = useJournalEntries();
  const [showCreate, setShowCreate] = useState(false);

  const entries: JournalEntry[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Entry
        </button>
      </div>

      {showCreate && <CreateJournalDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <>
          <p className="mb-2 text-xs text-gray-400">{data.meta?.total ?? entries.length} entry(ies)</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Lines</th>
                <th className="px-3 py-3 text-right">Total Debits</th>
                <th className="px-3 py-3 text-right">Total Credits</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">No journal entries found.</td>
                </tr>
              ) : (
                entries.map((je) => {
                  const totalD = je.lines.reduce((s, l) => s + Number(l.debit), 0);
                  const totalC = je.lines.reduce((s, l) => s + Number(l.credit), 0);
                  return (
                    <tr key={je.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-900">{new Date(je.date).toLocaleDateString()}</td>
                      <td className="px-3 py-3 font-medium text-gray-900">{je.description}</td>
                      <td className="px-3 py-3 text-gray-600">{je.lines.length}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{totalD.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{totalC.toFixed(2)}</td>
                      <td className="px-3 py-3 text-gray-500">{new Date(je.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
