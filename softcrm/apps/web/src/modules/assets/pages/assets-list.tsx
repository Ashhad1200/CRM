import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useFixedAssets,
  useCreateFixedAsset,
  useAssetCategories,
  type FixedAsset,
  type AssetStatus,
  type AssetCondition,
  type DepreciationMethod,
} from '../api';

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

function StatusBadge({ status }: { status: AssetStatus }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: AssetCondition }) {
  const colors = CONDITION_COLORS[condition] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {condition}
    </span>
  );
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function CreateAssetDialog({ onClose }: { onClose: () => void }) {
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [usefulLifeYears, setUsefulLifeYears] = useState('5');
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');

  const createAsset = useCreateFixedAsset();

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      setUsefulLifeYears(String(cat.usefulLifeYears));
      setDepreciationMethod(cat.depreciationMethod);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(purchasePrice);
    const salvagePercent = selectedCategory
      ? parseFloat(selectedCategory.salvageValuePercent)
      : 0;
    const salvageValue = price * (salvagePercent / 100);

    createAsset.mutate(
      {
        name,
        assetNumber,
        categoryId,
        serialNumber: serialNumber || undefined,
        purchaseDate,
        purchasePrice,
        currentBookValue: purchasePrice,
        salvageValue: salvageValue.toFixed(2),
        usefulLifeYears: parseInt(usefulLifeYears, 10),
        depreciationMethod,
        locationId: locationId || undefined,
        description: description || undefined,
        condition: 'NEW',
        status: 'ACTIVE',
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Fixed Asset</h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Asset Number *
            </label>
            <input
              value={assetNumber}
              onChange={(e) => setAssetNumber(e.target.value)}
              required
              placeholder="FA-001"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">Serial Number</label>
        <input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Purchase Date *
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Purchase Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Useful Life (Years)
            </label>
            <input
              type="number"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              min="1"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Depreciation Method
            </label>
            <select
              value={depreciationMethod}
              onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="STRAIGHT_LINE">Straight Line</option>
              <option value="DECLINING_BALANCE">Declining Balance</option>
              <option value="UNITS_OF_PRODUCTION">Units of Production</option>
            </select>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
        <input
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          placeholder="Building A, Room 101"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAsset.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createAsset.isPending ? 'Creating...' : 'Create Asset'}
          </button>
        </div>

        {createAsset.isError && (
          <p className="mt-2 text-sm text-red-600">{createAsset.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function AssetsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useFixedAssets();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const assets: FixedAsset[] = data?.data ?? [];

  const filtered = assets.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.assetNumber.toLowerCase().includes(q) ||
      (a.serialNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fixed Assets</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Asset
        </button>
      </div>

      {showCreate && <CreateAssetDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search by name, number, or serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="FULLY_DEPRECIATED">Fully Depreciated</option>
          <option value="DISPOSED">Disposed</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Asset #</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Purchase Price</th>
              <th className="px-3 py-3">Book Value</th>
              <th className="px-3 py-3">Condition</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                  No assets found.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/assets/assets/${a.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">{a.assetNumber}</td>
                  <td className="px-3 py-3 text-gray-700">{a.name}</td>
                  <td className="px-3 py-3 text-gray-600">{a.category?.name ?? '-'}</td>
                  <td className="px-3 py-3 text-gray-600">{formatCurrency(a.purchasePrice)}</td>
                  <td className="px-3 py-3 text-gray-900 font-medium">
                    {formatCurrency(a.currentBookValue)}
                  </td>
                  <td className="px-3 py-3">
                    <ConditionBadge condition={a.condition} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-600">{a.locationId ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
