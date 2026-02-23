import { useState } from 'react';
import { usePipelineMetrics, useScorecard } from '../api.js';

export default function TeamPerformancePage() {
  const [userId, setUserId] = useState('');

  const { data: pipelineData, isLoading: pipelineLoading, error: pipelineError } = usePipelineMetrics();
  const metrics = pipelineData?.data;

  const { data: scorecardData, isLoading: scorecardLoading, error: scorecardError } = useScorecard(userId);
  const scorecard = scorecardData?.data;

  function fmt(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  }

  function pct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Team Performance</h1>

      {/* Pipeline Metrics Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Pipeline Overview</h2>

        {pipelineLoading && <p className="text-sm text-gray-500">Loading pipeline metrics...</p>}
        {pipelineError && <p className="text-sm text-red-600">Error: {(pipelineError as Error).message}</p>}

        {metrics && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.totalPipeline)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Weighted Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.weightedPipeline)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{pct(metrics.winRate)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.avgDealSize)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Revenue MTD</p>
                <p className="text-xl font-bold text-gray-900">{fmt(metrics.revenueMTD)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Revenue QTD</p>
                <p className="text-xl font-bold text-gray-900">{fmt(metrics.revenueQTD)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Revenue YTD</p>
                <p className="text-xl font-bold text-gray-900">{fmt(metrics.revenueYTD)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500 mb-1">Pipeline Velocity</p>
              <p className="text-xl font-bold text-gray-900">{metrics.velocity.toFixed(1)} days</p>
            </div>

            {/* Deals by stage */}
            {Object.keys(metrics.dealsByStage).length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Deals by Stage</h3>
                <div className="space-y-2">
                  {Object.entries(metrics.dealsByStage).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{stage}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Rep Scorecard */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Rep Scorecard</h2>

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter user ID"
            />
          </div>
        </div>

        {scorecardLoading && userId && <p className="text-sm text-gray-500">Loading scorecard...</p>}
        {scorecardError && <p className="text-sm text-red-600">Error: {(scorecardError as Error).message}</p>}

        {scorecard && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Deals Closed</p>
              <p className="text-2xl font-bold text-gray-900">{scorecard.dealsClosed}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(scorecard.revenue)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Activities</p>
              <p className="text-2xl font-bold text-gray-900">{scorecard.activities}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{scorecard.avgResponseTime.toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Pipeline Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{(scorecard.pipelineCoverage * 100).toFixed(0)}%</p>
            </div>
          </div>
        )}

        {!scorecard && userId && !scorecardLoading && !scorecardError && (
          <p className="text-sm text-gray-500">No scorecard data for this user.</p>
        )}

        {!userId && (
          <p className="text-sm text-gray-500">Enter a user ID above to view their scorecard.</p>
        )}
      </section>
    </div>
  );
}
