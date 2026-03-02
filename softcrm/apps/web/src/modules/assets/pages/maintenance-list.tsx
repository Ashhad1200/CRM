import { useState } from 'react';
import {
  useAssetMaintenanceRecords,
  useCreateAssetMaintenance,
  useCompleteMaintenance,
  useMaintenanceSchedules,
  useCreateMaintenanceSchedule,
  useFixedAssets,
  type AssetMaintenance,
  type MaintenanceSchedule,
  type MaintenanceType,
  type MaintenanceStatus,
  type MaintenanceFrequency,
} from '../api';

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const TYPE_COLORS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'bg-blue-100 text-blue-700',
  CORRECTIVE: 'bg-orange-100 text-orange-700',
  INSPECTION: 'bg-purple-100 text-purple-700',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function CreateMaintenanceDialog({ onClose }: { onClose: () => void }) {
  const { data: assetsData } = useFixedAssets();
  const assets = assetsData?.data ?? [];

  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState<MaintenanceType>('PREVENTIVE');
  const [scheduledDate, setScheduledDate] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');

  const createMaintenance = useCreateAssetMaintenance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMaintenance.mutate(
      {
        assetId,
        type,
        scheduledDate,
        description,
        vendor: vendor || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Schedule Maintenance
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Asset *</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select asset...</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetNumber} - {a.name}
            </option>
          ))}
        </select>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Scheduled Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
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
            disabled={createMaintenance.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMaintenance.isPending ? 'Creating...' : 'Schedule'}
          </button>
        </div>

        {createMaintenance.isError && (
          <p className="mt-2 text-sm text-red-600">{createMaintenance.error.message}</p>
        )}
      </form>
    </div>
  );
}

function CompleteMaintenanceDialog({
  maintenance,
  onClose,
}: {
  maintenance: AssetMaintenance;
  onClose: () => void;
}) {
  const [completedDate, setCompletedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [cost, setCost] = useState('');

  const completeMaintenance = useCompleteMaintenance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeMaintenance.mutate(
      {
        id: maintenance.id,
        completedDate,
        cost: cost || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Complete Maintenance
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Completion Date *
        </label>
        <input
          type="date"
          value={completedDate}
          onChange={(e) => setCompletedDate(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Actual Cost
        </label>
        <input
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0.00"
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
            disabled={completeMaintenance.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {completeMaintenance.isPending ? 'Completing...' : 'Complete'}
          </button>
        </div>

        {completeMaintenance.isError && (
          <p className="mt-2 text-sm text-red-600">{completeMaintenance.error.message}</p>
        )}
      </form>
    </div>
  );
}

function CreateScheduleDialog({ onClose }: { onClose: () => void }) {
  const { data: assetsData } = useFixedAssets();
  const assets = assetsData?.data ?? [];

  const [assetId, setAssetId] = useState('');
  const [name, setName] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('PREVENTIVE');
  const [frequency, setFrequency] = useState<MaintenanceFrequency>('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');

  const createSchedule = useCreateMaintenanceSchedule();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSchedule.mutate(
      {
        assetId,
        name,
        maintenanceType,
        frequency,
        startDate,
        estimatedCost: estimatedCost || undefined,
        vendor: vendor || undefined,
        description: description || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Create Recurring Schedule
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Asset *</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select asset...</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetNumber} - {a.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Schedule Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Monthly Oil Change"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Frequency *
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as MaintenanceFrequency)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="SEMI_ANNUAL">Semi-Annual</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Estimated Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
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
            disabled={createSchedule.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
          </button>
        </div>

        {createSchedule.isError && (
          <p className="mt-2 text-sm text-red-600">{createSchedule.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function MaintenanceListPage() {
  const { data: recordsData, isLoading, isError, error } = useAssetMaintenanceRecords();
  const { data: schedulesData } = useMaintenanceSchedules();

  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [completingMaintenance, setCompletingMaintenance] = useState<
    AssetMaintenance | undefined
  >();
  const [tab, setTab] = useState<'records' | 'schedules'>('records');

  const records: AssetMaintenance[] = recordsData?.data ?? [];
  const schedules: MaintenanceSchedule[] = schedulesData?.data ?? [];

  const tabClass = (t: 'records' | 'schedules') =>
    `px-4 py-2 text-sm font-medium ${
      tab === t
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Maintenance</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateRecord(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Schedule Maintenance
          </button>
          <button
            onClick={() => setShowCreateSchedule(true)}
            className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Create Recurring
          </button>
        </div>
      </div>

      {showCreateRecord && (
        <CreateMaintenanceDialog onClose={() => setShowCreateRecord(false)} />
      )}
      {showCreateSchedule && (
        <CreateScheduleDialog onClose={() => setShowCreateSchedule(false)} />
      )}
      {completingMaintenance && (
        <CompleteMaintenanceDialog
          maintenance={completingMaintenance}
          onClose={() => setCompletingMaintenance(undefined)}
        />
      )}

      <div className="mb-4 flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('records')} className={tabClass('records')}>
          Maintenance Records
        </button>
        <button onClick={() => setTab('schedules')} className={tabClass('schedules')}>
          Recurring Schedules
        </button>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {tab === 'records' && recordsData && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Asset</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Scheduled</th>
              <th className="px-3 py-3">Completed</th>
              <th className="px-3 py-3">Cost</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                  No maintenance records found.
                </td>
              </tr>
            ) : (
              records.map((m) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {m.asset?.assetNumber ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${TYPE_COLORS[m.type]}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-xs truncate">
                    {m.description}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{formatDate(m.scheduledDate)}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {m.completedDate ? formatDate(m.completedDate) : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {m.cost ? formatCurrency(m.cost) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => setCompletingMaintenance(m)}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {tab === 'schedules' && schedulesData && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Asset</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Frequency</th>
              <th className="px-3 py-3">Next Scheduled</th>
              <th className="px-3 py-3">Est. Cost</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No recurring schedules found.
                </td>
              </tr>
            ) : (
              schedules.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.asset?.assetNumber ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-700">{s.name}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${TYPE_COLORS[s.maintenanceType]}`}>
                      {s.maintenanceType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.frequency.replace('_', ' ')}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.nextScheduledDate ? formatDate(s.nextScheduledDate) : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.estimatedCost ? formatCurrency(s.estimatedCost) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    {s.isActive ? (
                      <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
