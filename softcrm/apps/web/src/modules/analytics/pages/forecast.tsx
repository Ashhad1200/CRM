import { useState } from 'react';
import { useForecast, useAnomalies, type ForecastResult, type AnomalyResult } from '../api.js';

export default function ForecastPage() {
  const [forecastType, setForecastType] = useState('REVENUE');
  const [historicalMonths, setHistoricalMonths] = useState('12');
  const [anomalyMetric, setAnomalyMetric] = useState('revenue');
  const [anomalyThreshold, setAnomalyThreshold] = useState('2');

  const forecastParams: Record<string, unknown> = { type: forecastType, historicalMonths: Number(historicalMonths) };
  const { data: forecastData, isLoading: forecastLoading, error: forecastError } = useForecast(forecastParams);
  const forecasts = forecastData?.data ?? [];

  const anomalyParams: Record<string, unknown> = { metric: anomalyMetric, threshold: Number(anomalyThreshold) };
  const { data: anomalyData, isLoading: anomalyLoading, error: anomalyError } = useAnomalies(anomalyParams);
  const anomalies = anomalyData?.data ?? [];

  function fmt(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Revenue Forecasting &amp; Anomaly Detection</h1>

      {/* Forecast Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">AI Revenue Forecast</h2>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Type</label>
            <select
              value={forecastType}
              onChange={(e) => setForecastType(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="REVENUE">Revenue</option>
              <option value="PIPELINE">Pipeline</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Historical Months</label>
            <select
              value={historicalMonths}
              onChange={(e) => setHistoricalMonths(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </select>
          </div>
        </div>

        {forecastLoading && <p className="text-sm text-gray-500">Loading forecast...</p>}
        {forecastError && <p className="text-sm text-red-600">Error: {(forecastError as Error).message}</p>}

        {!forecastLoading && forecasts.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Predicted</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">CI Low</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">CI High</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {forecasts.map((f: ForecastResult) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{f.period}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.type}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{fmt(f.predictedValue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{fmt(f.confidenceLow)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{fmt(f.confidenceHigh)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{f.modelVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!forecastLoading && forecasts.length === 0 && (
          <p className="text-sm text-gray-500">No forecast data available. Try a different type or date range.</p>
        )}
      </section>

      {/* Anomaly Detection Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Anomaly Detection</h2>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
            <select
              value={anomalyMetric}
              onChange={(e) => setAnomalyMetric(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="revenue">Revenue</option>
              <option value="dealCount">Deal Count</option>
              <option value="avgDealSize">Avg Deal Size</option>
              <option value="winRate">Win Rate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (std deviations)</label>
            <select
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="1.5">1.5σ</option>
              <option value="2">2σ</option>
              <option value="2.5">2.5σ</option>
              <option value="3">3σ</option>
            </select>
          </div>
        </div>

        {anomalyLoading && <p className="text-sm text-gray-500">Scanning for anomalies...</p>}
        {anomalyError && <p className="text-sm text-red-600">Error: {(anomalyError as Error).message}</p>}

        {!anomalyLoading && anomalies.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Metric</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Current</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Rolling Avg</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Std Dev</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Deviation</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Anomaly?</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {anomalies.map((a: AnomalyResult, i: number) => (
                  <tr key={i} className={a.isAnomaly ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.metric}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{a.currentValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{a.rollingAvg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{a.stdDeviation.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{a.deviationFactor.toFixed(2)}σ</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {a.isAnomaly ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Yes</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.detectedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!anomalyLoading && anomalies.length === 0 && (
          <p className="text-sm text-gray-500">No anomalies detected for the selected metric and threshold.</p>
        )}
      </section>
    </div>
  );
}
