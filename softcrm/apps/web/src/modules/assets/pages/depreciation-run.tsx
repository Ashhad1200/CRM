import { useState } from 'react';
import { Button, Badge, StatCard } from '@softcrm/ui';
import {
  useFixedAssets,
  useCalculateDepreciation,
  useDepreciationReport,
  type FixedAsset,
  type DepreciationSchedule,
} from '../api';

const fmt = (v: string | number) => `$${Number(v).toFixed(2)}`;

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight-Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
};

interface RunResult {
  assetId: string;
  assetNumber: string;
  assetName: string;
  method: string;
  depreciationCharge: number;
  closingBookValue: number;
  journalEntryId?: string;
}

export default function DepreciationRunPage() {
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);

  const { data: assetsData } = useFixedAssets({ status: 'ACTIVE' });
  const { data: reportData } = useDepreciationReport();
  const calculateDepreciation = useCalculateDepreciation();

  const activeAssets: FixedAsset[] = assetsData?.data ?? [];
  const reports = reportData?.data ?? [];

  const totalBookValue = activeAssets.reduce((s, a) => s + Number(a.currentBookValue), 0);
  const monthlyDepr = reports.reduce((s, r) => s + Number(r.monthlyDepreciation), 0);

  const handleRun = async () => {
    setIsRunning(true);
    setResults([]);
    const runResults: RunResult[] = [];

    for (const asset of activeAssets) {
      if (asset.status !== 'ACTIVE') continue;
      try {
        const response = await calculateDepreciation.mutateAsync({ id: asset.id, periodEnd });
        const schedules: DepreciationSchedule[] = response.data ?? [];
        const latest = schedules[schedules.length - 1];
        if (latest) {
          runResults.push({
            assetId: asset.id,
            assetNumber: asset.assetNumber,
            assetName: asset.name,
            method: asset.depreciationMethod,
            depreciationCharge: Number(latest.depreciationCharge),
            closingBookValue: Number(latest.closingValue),
            journalEntryId: latest.journalEntryId,
          });
        }
      } catch {
        // Individual asset failures don't abort the entire run
        runResults.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          method: asset.depreciationMethod,
          depreciationCharge: 0,
          closingBookValue: Number(asset.currentBookValue),
        });
      }
    }

    setResults(runResults);
    setIsRunning(false);
  };

  const totalDepreciated = results.reduce((s, r) => s + r.depreciationCharge, 0);
  const assetsProcessed = results.filter((r) => r.depreciationCharge > 0).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Depreciation Run</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Period End:</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button onClick={handleRun} disabled={isRunning || activeAssets.length === 0}>
            {isRunning ? 'Running…' : 'Run Monthly Depreciation'}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Active Assets" value={activeAssets.length} change={0} trend="flat" />
        <StatCard label="Total Book Value" value={fmt(totalBookValue)} change={0} trend="flat" />
        <StatCard label="Est. Monthly Depr." value={fmt(monthlyDepr)} change={0} trend="flat" />
        {results.length > 0 && (
          <StatCard
            label="This Run"
            value={fmt(totalDepreciated)}
            change={-1}
            trend="down"
            changeLabel={`${assetsProcessed} assets`}
          />
        )}
      </div>

      {/* ── Run Results ────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              Depreciation Results — Period ending {periodEnd}
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">Asset #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Depreciation</th>
                <th className="px-4 py-3 text-right">Closing Book Value</th>
                <th className="px-4 py-3">Journal Entry</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.assetId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-600">{r.assetNumber}</td>
                  <td className="px-4 py-3 font-medium">{r.assetName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{METHOD_LABELS[r.method] ?? r.method}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.depreciationCharge > 0 ? (
                      <span className="text-red-600">{fmt(r.depreciationCharge)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(r.closingBookValue)}</td>
                  <td className="px-4 py-3">
                    {r.journalEntryId ? (
                      <a
                        href={`/accounting/journal-entries/${r.journalEntryId}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-200 flex justify-between text-sm font-medium">
            <span>{assetsProcessed} of {results.length} assets depreciated</span>
            <span className="font-mono text-red-600">Total: {fmt(totalDepreciated)}</span>
          </div>
        </div>
      )}

      {/* ── Empty state before run ─────────────────────────────────── */}
      {results.length === 0 && !isRunning && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-2">
            Click &quot;Run Monthly Depreciation&quot; to calculate depreciation for all active assets.
          </p>
          <p className="text-sm text-gray-400">
            {activeAssets.length} active asset{activeAssets.length !== 1 ? 's' : ''} will be processed.
          </p>
        </div>
      )}
    </div>
  );
}
