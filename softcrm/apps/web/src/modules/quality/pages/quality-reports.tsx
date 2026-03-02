import { useState } from 'react';
import { useQualityMetrics, useSupplierQualityScores } from '../api';
import type { QualityMetrics, SupplierQualityScore } from '../api';

function MetricCard({
  title,
  value,
  subtitle,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
    </div>
  );
}

function TrendChart({
  data,
}: {
  data: { period: string; inspections: number; passRate: number; ncrs: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400">
        No trend data available
      </div>
    );
  }

  const maxInspections = Math.max(...data.map((d) => d.inspections), 1);
  const maxNcrs = Math.max(...data.map((d) => d.ncrs), 1);

  return (
    <div className="space-y-4">
      {/* Pass Rate Trend */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Pass Rate Trend</p>
        <div className="flex h-24 items-end gap-1">
          {data.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t bg-green-500"
                style={{ height: `${d.passRate}%` }}
                title={`${d.passRate.toFixed(1)}%`}
              />
              <span className="mt-1 text-xs text-gray-500">{d.period}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inspections vs NCRs */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Inspections (blue) vs NCRs (red)
        </p>
        <div className="flex h-24 items-end gap-1">
          {data.map((d, i) => (
            <div key={i} className="flex flex-1 gap-0.5">
              <div
                className="flex-1 rounded-t bg-blue-400"
                style={{ height: `${(d.inspections / maxInspections) * 100}%` }}
                title={`${d.inspections} inspections`}
              />
              <div
                className="flex-1 rounded-t bg-red-400"
                style={{ height: `${(d.ncrs / maxNcrs) * 100}%` }}
                title={`${d.ncrs} NCRs`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupplierScoreTable({
  scores,
}: {
  scores: SupplierQualityScore[];
}) {
  if (scores.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">
        No supplier quality data available
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
          <th className="px-3 py-2 text-left">Supplier ID</th>
          <th className="px-3 py-2 text-left">Period</th>
          <th className="px-3 py-2 text-right">Inspections</th>
          <th className="px-3 py-2 text-right">Passed</th>
          <th className="px-3 py-2 text-right">NCRs</th>
          <th className="px-3 py-2 text-right">Score</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((s) => {
          const score = parseFloat(s.qualityScore);
          const scoreColor =
            score >= 90
              ? 'text-green-600'
              : score >= 70
                ? 'text-yellow-600'
                : 'text-red-600';
          return (
            <tr key={s.id} className="border-b border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-900">
                {s.supplierId}
              </td>
              <td className="px-3 py-2 text-gray-600">{s.period}</td>
              <td className="px-3 py-2 text-right text-gray-600">
                {s.totalInspections}
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {s.passedInspections}
              </td>
              <td className="px-3 py-2 text-right text-gray-600">{s.ncrCount}</td>
              <td className={`px-3 py-2 text-right font-medium ${scoreColor}`}>
                {score.toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function QualityReportsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: metricsData, isLoading: loadingMetrics } = useQualityMetrics({
    period,
  });
  const { data: scoresData, isLoading: loadingScores } = useSupplierQualityScores();

  const metrics: QualityMetrics | undefined = metricsData;
  const supplierScores: SupplierQualityScore[] = scoresData?.data ?? [];

  const isLoading = loadingMetrics || loadingScores;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quality Reports</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="365d">Last year</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading metrics...</p>}

      {metrics && (
        <>
          {/* Key Metrics */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Inspections"
              value={metrics.totalInspections}
              subtitle={`${metrics.passedInspections} passed`}
              color="blue"
            />
            <MetricCard
              title="Pass Rate"
              value={`${metrics.passRate.toFixed(1)}%`}
              subtitle={`${metrics.failedInspections} failed`}
              color={metrics.passRate >= 90 ? 'green' : metrics.passRate >= 70 ? 'yellow' : 'red'}
            />
            <MetricCard
              title="Open NCRs"
              value={metrics.openNcrs}
              subtitle={`${metrics.openCapas} open CAPAs`}
              color={metrics.openNcrs > 10 ? 'red' : metrics.openNcrs > 5 ? 'yellow' : 'green'}
            />
            <MetricCard
              title="Overdue Actions"
              value={metrics.overdueActions}
              subtitle={
                metrics.averageResolutionTime > 0
                  ? `Avg resolution: ${metrics.averageResolutionTime.toFixed(1)} days`
                  : undefined
              }
              color={metrics.overdueActions > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Trend Chart */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Quality Trends
            </h2>
            <TrendChart data={metrics.trendData} />
          </div>
        </>
      )}

      {/* Supplier Quality Scores */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Supplier Quality Scores
        </h2>
        <SupplierScoreTable scores={supplierScores} />
      </div>

      {/* Quick Stats Summary */}
      {metrics && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded bg-white p-4 shadow-sm">
              <p className="font-medium text-gray-700">Inspection Performance</p>
              <p className="text-gray-600">
                {metrics.passRate >= 95
                  ? 'Excellent - Consistently high quality standards'
                  : metrics.passRate >= 85
                    ? 'Good - Minor improvements needed'
                    : metrics.passRate >= 70
                      ? 'Fair - Review inspection processes'
                      : 'Needs Attention - Significant quality issues'}
              </p>
            </div>
            <div className="rounded bg-white p-4 shadow-sm">
              <p className="font-medium text-gray-700">NCR Status</p>
              <p className="text-gray-600">
                {metrics.openNcrs === 0
                  ? 'All NCRs have been closed'
                  : `${metrics.openNcrs} NCR${metrics.openNcrs > 1 ? 's' : ''} require attention`}
              </p>
            </div>
            <div className="rounded bg-white p-4 shadow-sm">
              <p className="font-medium text-gray-700">Action Items</p>
              <p className="text-gray-600">
                {metrics.overdueActions === 0
                  ? 'No overdue actions'
                  : `${metrics.overdueActions} overdue action${metrics.overdueActions > 1 ? 's' : ''} - prioritize completion`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
