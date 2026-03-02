import { useState } from 'react';
import { GlassCard } from '@softcrm/ui';
import { useCompanies, useCostCenterReport } from '../api-enhanced.js';
import type { CostCenterReportRow } from '../api-enhanced.js';

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CostCenterReportPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [companyId, setCompanyId] = useState('');
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: rows = [], isLoading, isError, error } = useCostCenterReport(
    companyId || undefined,
    startDate || undefined,
    endDate || undefined,
  );

  const reportRows = rows as CostCenterReportRow[];
  const totals = reportRows.reduce(
    (acc, r) => ({
      totalDebit: acc.totalDebit + Number(r.totalDebit),
      totalCredit: acc.totalCredit + Number(r.totalCredit),
      netAmount: acc.netAmount + Number(r.netAmount),
    }),
    { totalDebit: 0, totalCredit: 0, netAmount: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cost Center Report</h1>

      {/* Filters */}
      <GlassCard tier="subtle" padding="md">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Company</label>
            {companiesLoading ? (
              <div className="h-9 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Select a company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
          </div>
        </div>
      </GlassCard>

      {/* Report table */}
      <GlassCard tier="medium" padding="none">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cost Centers</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
          </div>
        ) : isError ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{(error as Error).message}</div>
        ) : !companyId ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Select a company to view the report.</div>
        ) : reportRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No cost center data for the selected period.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Total Debit</th>
                <th className="px-4 py-3 text-right">Total Credit</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((r) => (
                <tr key={r.costCenterId} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">{r.code}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{fmt(r.totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{fmt(r.totalCredit)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(r.netAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(r.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-gray-700 dark:text-gray-300">Totals</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{fmt(totals.totalDebit)}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{fmt(totals.totalCredit)}</td>
                <td className={`px-4 py-3 text-right ${totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(totals.netAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
