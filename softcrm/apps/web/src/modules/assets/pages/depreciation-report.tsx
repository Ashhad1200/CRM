import { useState } from 'react';
import {
  useDepreciationReport,
  useAssetCategories,
  type DepreciationReport as DepreciationReportType,
  type DepreciationMethod,
} from '../api';

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  STRAIGHT_LINE: 'Straight Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
};

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function DepreciationChart({ report }: { report: DepreciationReportType }) {
  const schedules = report.schedules ?? [];
  if (schedules.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
        No schedule data
      </div>
    );
  }

  const purchasePrice = parseFloat(report.purchasePrice);

  return (
    <div className="flex h-32 items-end gap-px">
      {schedules.slice(0, 12).map((s, i) => {
        const height = (parseFloat(s.closingValue) / purchasePrice) * 100;
        return (
          <div
            key={s.id || i}
            className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
            style={{ height: `${Math.max(height, 5)}%` }}
            title={formatCurrency(s.closingValue)}
          />
        );
      })}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtext,
  color = 'gray',
}: {
  title: string;
  value: string;
  subtext?: string;
  color?: 'gray' | 'green' | 'blue' | 'red';
}) {
  const colorClasses = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 uppercase">{title}</p>
      <p className={`text-2xl font-semibold ${colorClasses[color]}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

export default function DepreciationReportPage() {
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');

  const filters: Record<string, string> = {};
  if (categoryFilter) filters['categoryId'] = categoryFilter;
  if (methodFilter) filters['depreciationMethod'] = methodFilter;

  const { data, isLoading, isError, error } = useDepreciationReport(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  const reports: DepreciationReportType[] = data?.data ?? [];

  // Calculate totals
  const totals = reports.reduce(
    (acc, r) => ({
      purchasePrice: acc.purchasePrice + parseFloat(r.purchasePrice),
      currentBookValue: acc.currentBookValue + parseFloat(r.currentBookValue),
      totalDepreciation: acc.totalDepreciation + parseFloat(r.totalDepreciation),
      monthlyDepreciation: acc.monthlyDepreciation + parseFloat(r.monthlyDepreciation),
      yearlyDepreciation: acc.yearlyDepreciation + parseFloat(r.yearlyDepreciation),
    }),
    {
      purchasePrice: 0,
      currentBookValue: 0,
      totalDepreciation: 0,
      monthlyDepreciation: 0,
      yearlyDepreciation: 0,
    },
  );

  const depreciationPercent =
    totals.purchasePrice > 0
      ? (totals.totalDepreciation / totals.purchasePrice) * 100
      : 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Depreciation Report</h1>
        <p className="text-gray-600">
          Overview of asset depreciation across your organization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <SummaryCard
          title="Total Asset Value"
          value={formatCurrency(totals.purchasePrice.toFixed(2))}
          subtext="Original purchase price"
        />
        <SummaryCard
          title="Current Book Value"
          value={formatCurrency(totals.currentBookValue.toFixed(2))}
          color="blue"
        />
        <SummaryCard
          title="Total Depreciation"
          value={formatCurrency(totals.totalDepreciation.toFixed(2))}
          subtext={`${depreciationPercent.toFixed(1)}% depreciated`}
          color="red"
        />
        <SummaryCard
          title="Monthly Depreciation"
          value={formatCurrency(totals.monthlyDepreciation.toFixed(2))}
        />
        <SummaryCard
          title="Yearly Depreciation"
          value={formatCurrency(totals.yearlyDepreciation.toFixed(2))}
        />
      </div>

      {/* Overall Depreciation Progress */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Depreciation Progress</span>
          <span>{depreciationPercent.toFixed(1)}%</span>
        </div>
        <div className="h-4 rounded-full bg-gray-200">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${Math.min(depreciationPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Book Value: {formatCurrency(totals.currentBookValue.toFixed(2))}</span>
          <span>Depreciated: {formatCurrency(totals.totalDepreciation.toFixed(2))}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Methods</option>
          <option value="STRAIGHT_LINE">Straight Line</option>
          <option value="DECLINING_BALANCE">Declining Balance</option>
          <option value="UNITS_OF_PRODUCTION">Units of Production</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="grid gap-4">
          {reports.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No assets found.</p>
          ) : (
            reports.map((report) => {
              const deprecPercent =
                (parseFloat(report.totalDepreciation) /
                  parseFloat(report.purchasePrice)) *
                100;

              return (
                <div
                  key={report.assetId}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="grid grid-cols-[1fr_200px] gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {report.assetNumber}
                        </h3>
                        <span className="text-gray-600">{report.assetName}</span>
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {METHOD_LABELS[report.depreciationMethod]}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Purchase Price</p>
                          <p className="font-medium">
                            {formatCurrency(report.purchasePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Book Value</p>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(report.currentBookValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Depreciation</p>
                          <p className="font-medium text-red-600">
                            {formatCurrency(report.totalDepreciation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly</p>
                          <p className="font-medium">
                            {formatCurrency(report.monthlyDepreciation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Remaining Life</p>
                          <p className="font-medium">{report.remainingLife} years</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Depreciation Progress</span>
                          <span>{deprecPercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(deprecPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="border-l border-gray-200 pl-4">
                      <p className="text-xs text-gray-500 mb-2">Book Value Trend</p>
                      <DepreciationChart report={report} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
