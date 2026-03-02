import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  useFixedAsset,
  useUpdateFixedAsset,
  useAssetDepreciationSchedule,
  useCalculateDepreciation,
  useAssetMaintenanceRecords,
  type FixedAsset,
  type AssetStatus,
  type AssetCondition,
  type DepreciationSchedule,
} from '../api';

type Tab = 'details' | 'depreciation' | 'maintenance' | 'history';

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DISPOSED: 'bg-gray-100 text-gray-700',
  UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  FULLY_DEPRECIATED: 'bg-blue-100 text-blue-700',
};

const CONDITION_COLORS: Record<AssetCondition, string> = {
  NEW: 'bg-emerald-100 text-emerald-700',
  EXCELLENT: 'bg-green-100 text-green-700',
  GOOD: 'bg-blue-100 text-blue-700',
  FAIR: 'bg-yellow-100 text-yellow-700',
  POOR: 'bg-red-100 text-red-700',
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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function DepreciationChart({ schedules }: { schedules: DepreciationSchedule[] }) {
  if (schedules.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400">
        No depreciation schedule generated yet.
      </div>
    );
  }

  const maxValue = Math.max(...schedules.map((s) => parseFloat(s.openingValue)));

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-1 rounded-lg bg-gray-50 p-4">
        {schedules.slice(0, 12).map((s, i) => {
          const height = (parseFloat(s.closingValue) / maxValue) * 100;
          return (
            <div
              key={s.id}
              className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${formatDate(s.periodEnd)}: ${formatCurrency(s.closingValue)}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center">
        Book Value Over Time (showing up to 12 periods)
      </div>
    </div>
  );
}

function TimelineItem({
  date,
  title,
  description,
  type,
}: {
  date: string;
  title: string;
  description?: string;
  type: 'maintenance' | 'depreciation' | 'transfer' | 'audit';
}) {
  const colors = {
    maintenance: 'bg-yellow-500',
    depreciation: 'bg-blue-500',
    transfer: 'bg-purple-500',
    audit: 'bg-green-500',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors[type]}`} />
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="pb-6">
        <p className="text-xs text-gray-500">{formatDate(date)}</p>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading, isError, error } = useFixedAsset(id ?? '');
  const { data: depreciationData } = useAssetDepreciationSchedule(id ?? '');
  const { data: maintenanceData } = useAssetMaintenanceRecords({ assetId: id ?? '' });
  const updateAsset = useUpdateFixedAsset();
  const calculateDepreciation = useCalculateDepreciation();

  const [tab, setTab] = useState<Tab>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('NEW');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description ?? '');
      setCondition(asset.condition);
      setLocationId(asset.locationId ?? '');
      setNotes(asset.notes ?? '');
    }
  }, [asset]);

  if (!id) return <p className="p-6 text-gray-400">Asset not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!asset) return <p className="p-6 text-gray-400">Asset not found.</p>;

  const schedules = depreciationData?.data ?? [];
  const maintenanceRecords = maintenanceData?.data ?? [];

  const handleSave = () => {
    updateAsset.mutate({
      id,
      version: asset.version,
      name,
      description: description || undefined,
      condition,
      locationId: locationId || undefined,
      notes: notes || undefined,
    });
  };

  const handleCalculateDepreciation = () => {
    calculateDepreciation.mutate({ id });
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t ${
      tab === t
        ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  const depreciated =
    parseFloat(asset.purchasePrice) - parseFloat(asset.currentBookValue);
  const depreciationPercent =
    (depreciated / parseFloat(asset.purchasePrice)) * 100;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-4">
        <Link
          to="/assets/assets"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Assets
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {asset.assetNumber} - {asset.name}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[asset.status]}`}
        >
          {asset.status.replace('_', ' ')}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Purchase Price</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(asset.purchasePrice)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Book Value</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatCurrency(asset.currentBookValue)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Total Depreciation</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(depreciated.toFixed(2))}
          </p>
          <div className="mt-1 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${Math.min(depreciationPercent, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Condition</p>
          <span
            className={`inline-block rounded px-2 py-0.5 text-sm ${CONDITION_COLORS[asset.condition]}`}
          >
            {asset.condition}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('depreciation')} className={tabClass('depreciation')}>
          Depreciation
        </button>
        <button onClick={() => setTab('maintenance')} className={tabClass('maintenance')}>
          Maintenance
        </button>
        <button onClick={() => setTab('history')} className={tabClass('history')}>
          History
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* Details Tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Asset Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  value={asset.category?.name ?? '-'}
                  disabled
                  className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Serial Number
                </label>
                <input
                  value={asset.serialNumber ?? '-'}
                  disabled
                  className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Purchase Date
                </label>
                <input
                  value={formatDate(asset.purchaseDate)}
                  disabled
                  className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Depreciation Method
                </label>
                <input
                  value={asset.depreciationMethod.replace('_', ' ')}
                  disabled
                  className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AssetCondition)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="NEW">New</option>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateAsset.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {updateAsset.isError && (
              <p className="text-sm text-red-600">{updateAsset.error.message}</p>
            )}
            {updateAsset.isSuccess && (
              <p className="text-sm text-green-600">Saved successfully.</p>
            )}
          </div>
        )}

        {/* Depreciation Tab */}
        {tab === 'depreciation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Depreciation Schedule
              </h3>
              <button
                onClick={handleCalculateDepreciation}
                disabled={calculateDepreciation.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {calculateDepreciation.isPending ? 'Calculating...' : 'Calculate Depreciation'}
              </button>
            </div>

            <DepreciationChart schedules={schedules} />

            {schedules.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Period</th>
                    <th className="px-3 py-3">Opening Value</th>
                    <th className="px-3 py-3">Depreciation</th>
                    <th className="px-3 py-3">Closing Value</th>
                    <th className="px-3 py-3">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 text-gray-700">
                        {formatDate(s.periodStart)} - {formatDate(s.periodEnd)}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {formatCurrency(s.openingValue)}
                      </td>
                      <td className="px-3 py-3 text-red-600">
                        -{formatCurrency(s.depreciationCharge)}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {formatCurrency(s.closingValue)}
                      </td>
                      <td className="px-3 py-3">
                        {s.isPosted ? (
                          <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            Posted
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            Pending
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

        {/* Maintenance Tab */}
        {tab === 'maintenance' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Maintenance Records
              </h3>
              <Link
                to="/assets/maintenance"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Schedule Maintenance
              </Link>
            </div>

            {maintenanceRecords.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                No maintenance records for this asset.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Scheduled</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Cost</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 text-gray-700">{m.type}</td>
                      <td className="px-3 py-3 text-gray-600">{m.description}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {formatDate(m.scheduledDate)}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {m.completedDate ? formatDate(m.completedDate) : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {m.cost ? formatCurrency(m.cost) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs ${
                            m.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : m.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Asset History</h3>
            <div className="ml-2">
              <TimelineItem
                date={asset.createdAt}
                title="Asset Created"
                description={`Purchased for ${formatCurrency(asset.purchasePrice)}`}
                type="audit"
              />
              {maintenanceRecords.map((m) => (
                <TimelineItem
                  key={m.id}
                  date={m.scheduledDate}
                  title={`Maintenance: ${m.type}`}
                  description={m.description}
                  type="maintenance"
                />
              ))}
              {schedules
                .filter((s) => s.isPosted)
                .map((s) => (
                  <TimelineItem
                    key={s.id}
                    date={s.periodEnd}
                    title="Depreciation Posted"
                    description={`${formatCurrency(s.depreciationCharge)} depreciation recorded`}
                    type="depreciation"
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
