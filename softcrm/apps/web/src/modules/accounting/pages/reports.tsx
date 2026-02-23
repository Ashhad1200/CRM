import { useState } from 'react';
import {
  useProfitLoss,
  useBalanceSheet,
  useTrialBalance,
  useArAging,
} from '../api.js';

type ReportTab = 'pl' | 'bs' | 'tb' | 'ar';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'pl', label: 'Profit & Loss' },
  { key: 'bs', label: 'Balance Sheet' },
  { key: 'tb', label: 'Trial Balance' },
  { key: 'ar', label: 'AR Aging' },
];

/* ───────── Profit & Loss ───────── */

function ProfitLossPanel() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const { data, isLoading, isError, error } = useProfitLoss(startDate, endDate);
  const report = data?.data;

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {report && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-green-700">Revenue</h3>
            <table className="w-full text-sm">
              <tbody>
                {(report.revenue ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{r.account}</td>
                    <td className="py-1.5 text-right text-gray-900">{Number(r.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5 text-green-700">Total Revenue</td>
                  <td className="py-1.5 text-right text-green-700">{Number(report.totalRevenue).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-red-700">Expenses</h3>
            <table className="w-full text-sm">
              <tbody>
                {(report.expenses ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{r.account}</td>
                    <td className="py-1.5 text-right text-gray-900">{Number(r.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5 text-red-700">Total Expenses</td>
                  <td className="py-1.5 text-right text-red-700">{Number(report.totalExpenses).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-lg font-bold text-gray-900">
              Net Income:{' '}
              <span className={Number(report.netIncome) >= 0 ? 'text-green-700' : 'text-red-700'}>
                {Number(report.netIncome).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Balance Sheet ───────── */

function BalanceSheetPanel() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading, isError, error } = useBalanceSheet(asOfDate);
  const report = data?.data;

  const renderSection = (title: string, items: { account: string; amount: number }[], total: number, color: string) => (
    <div>
      <h3 className={`mb-1 text-sm font-semibold ${color}`}>{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {(items ?? []).map((r, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-700">{r.account}</td>
              <td className="py-1.5 text-right text-gray-900">{Number(r.amount).toFixed(2)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className={`py-1.5 ${color}`}>Total</td>
            <td className={`py-1.5 text-right ${color}`}>{Number(total).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-700">As of Date</label>
        <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {report && (
        <div className="space-y-4">
          {renderSection('Assets', report.assets, report.totalAssets, 'text-blue-700')}
          {renderSection('Liabilities', report.liabilities, report.totalLiabilities, 'text-red-700')}
          {renderSection('Equity', report.equity, report.totalEquity, 'text-purple-700')}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p>
              <span className="font-medium text-gray-700">Assets:</span> {Number(report.totalAssets).toFixed(2)}
              {' = '}
              <span className="font-medium text-gray-700">Liabilities:</span> {Number(report.totalLiabilities).toFixed(2)}
              {' + '}
              <span className="font-medium text-gray-700">Equity:</span> {Number(report.totalEquity).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Trial Balance ───────── */

function TrialBalancePanel() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const { data, isLoading, isError, error } = useTrialBalance(year, month);
  const report = data?.data;

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Year</label>
          <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)}
            className="w-24 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Month</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {report && (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Debits</th>
                <th className="px-3 py-2 text-right">Credits</th>
                <th className="px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(report.rows ?? []).map((row) => (
                <tr key={row.accountId} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-gray-600">{row.code}</td>
                  <td className="px-3 py-2 text-gray-900">{row.name}</td>
                  <td className="px-3 py-2 text-gray-500">{row.type}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{Number(row.totalDebits).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{Number(row.totalCredits).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{Number(row.balance).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={3} className="px-3 py-2 text-gray-700">Totals</td>
                <td className="px-3 py-2 text-right text-gray-900">{Number(report.totalDebits).toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-gray-900">{Number(report.totalCredits).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  {report.isBalanced ? (
                    <span className="text-green-600">Balanced ✓</span>
                  ) : (
                    <span className="text-red-600">Not Balanced ✗</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}

/* ───────── AR Aging ───────── */

function ArAgingPanel() {
  const { data, isLoading, isError, error } = useArAging();
  const report = data?.data;

  const renderBucket = (label: string, items: { invoiceId: string; amount: number; contact?: string }[]) => (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-gray-700">{label} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">None</p>
      ) : (
        <table className="mb-3 w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              <th className="py-1 text-left">Invoice</th>
              <th className="py-1 text-left">Contact</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 text-gray-600">{item.invoiceId.slice(0, 8)}…</td>
                <td className="py-1 text-gray-600">{item.contact ?? '—'}</td>
                <td className="py-1 text-right text-gray-900">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {report && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-6 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs">
            <div>
              <p className="font-medium text-gray-500">Current</p>
              <p className="text-sm font-bold text-gray-900">{Number(report.totals.current).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">1-30 days</p>
              <p className="text-sm font-bold text-yellow-600">{Number(report.totals.days30).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">31-60 days</p>
              <p className="text-sm font-bold text-orange-600">{Number(report.totals.days60).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">61-90 days</p>
              <p className="text-sm font-bold text-red-500">{Number(report.totals.days90).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">90+ days</p>
              <p className="text-sm font-bold text-red-700">{Number(report.totals.over90).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Total</p>
              <p className="text-sm font-bold text-gray-900">{Number(report.totals.total).toFixed(2)}</p>
            </div>
          </div>

          {renderBucket('Current', report.current ?? [])}
          {renderBucket('1-30 Days', report.days30 ?? [])}
          {renderBucket('31-60 Days', report.days60 ?? [])}
          {renderBucket('61-90 Days', report.days90 ?? [])}
          {renderBucket('90+ Days', report.over90 ?? [])}
        </div>
      )}
    </div>
  );
}

/* ───────── Reports Page ───────── */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pl');

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Financial Reports</h1>

      {/* Tab selector */}
      <div className="mb-6 flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pl' && <ProfitLossPanel />}
      {activeTab === 'bs' && <BalanceSheetPanel />}
      {activeTab === 'tb' && <TrialBalancePanel />}
      {activeTab === 'ar' && <ArAgingPanel />}
    </div>
  );
}
