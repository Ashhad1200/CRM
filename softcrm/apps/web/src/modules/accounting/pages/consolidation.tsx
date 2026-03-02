import { useState } from 'react';
import { GlassCard } from '@softcrm/ui';
import {
  useCompanies,
  useConsolidatedProfitLoss,
  useConsolidatedBalanceSheet,
  type ConsolidatedReportSection,
} from '../api-enhanced.js';

type ConsolidationTab = 'pl' | 'bs';

function SectionTable({ section }: { section: ConsolidatedReportSection }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{section.label}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
            <th className="py-2 text-left">Code</th>
            <th className="py-2 text-left">Account</th>
            <th className="py-2 text-right">Consolidated</th>
          </tr>
        </thead>
        <tbody>
          {section.accounts.map((a) => (
            <tr key={a.accountId} className="border-b border-gray-100">
              <td className="py-1.5 font-mono text-xs text-gray-500">{a.code}</td>
              <td className="py-1.5 text-gray-800">{a.name}</td>
              <td className="py-1.5 text-right font-medium">{Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td colSpan={2} className="py-2 text-gray-700">Total {section.label}</td>
            <td className="py-2 text-right">{Number(section.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function ConsolidationPage() {
  const [tab, setTab] = useState<ConsolidationTab>('pl');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [asOfDate, setAsOfDate] = useState(today.toISOString().slice(0, 10));

  const { data: companies } = useCompanies();
  const { data: plReport, isLoading: plLoading } = useConsolidatedProfitLoss(selectedIds, startDate, endDate);
  const { data: bsReport, isLoading: bsLoading } = useConsolidatedBalanceSheet(selectedIds, asOfDate);

  function toggleCompany(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Consolidation Reports</h1>

      {/* Company selector */}
      <GlassCard>
        <div className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Select Companies to Consolidate</h2>
          <div className="flex flex-wrap gap-2">
            {(companies ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedIds.includes(c.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.name} ({c.code})
              </button>
            ))}
          </div>
          {selectedIds.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">Select at least one company</p>
          )}
        </div>
      </GlassCard>

      {/* Tab selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('pl')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'pl' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Profit &amp; Loss
        </button>
        <button
          onClick={() => setTab('bs')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'bs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Balance Sheet
        </button>
      </div>

      {/* P&L Tab */}
      {tab === 'pl' && (
        <GlassCard>
          <div className="p-4">
            <div className="mb-4 flex gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm" />
              </div>
            </div>

            {plLoading && <p className="text-sm text-gray-500">Loading…</p>}
            {plReport && (
              <div className="space-y-4">
                <SectionTable section={plReport.revenue} />
                <SectionTable section={plReport.expenses} />
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-lg font-bold">
                    Consolidated Net Income:{' '}
                    <span className={plReport.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {Number(plReport.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* BS Tab */}
      {tab === 'bs' && (
        <GlassCard>
          <div className="p-4">
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">As of Date</label>
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm" />
            </div>

            {bsLoading && <p className="text-sm text-gray-500">Loading…</p>}
            {bsReport && (
              <div className="space-y-4">
                <SectionTable section={bsReport.assets} />
                <SectionTable section={bsReport.liabilities} />
                <SectionTable section={bsReport.equity} />
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
