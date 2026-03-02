import { useState } from 'react';
import { useWarehouses, useLocations, useCreateLocation } from '../api';
import type { WHLocation, LocationType } from '../api';

const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  RECEIVING: 'bg-blue-100 text-blue-700',
  STORAGE: 'bg-green-100 text-green-700',
  PICKING: 'bg-yellow-100 text-yellow-700',
  SHIPPING: 'bg-purple-100 text-purple-700',
  QUARANTINE: 'bg-red-100 text-red-700',
};

function LocationNode({
  location,
  depth = 0,
}: {
  location: WHLocation;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = location.children && location.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-5 w-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            {expanded ? '-' : '+'}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}
        <span className="font-medium text-gray-900">{location.name}</span>
        <span className="text-sm text-gray-500">({location.code})</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            LOCATION_TYPE_COLORS[location.type]
          }`}
        >
          {location.type}
        </span>
        {location.zone && (
          <span className="text-xs text-gray-500">Zone: {location.zone}</span>
        )}
        {location.aisle && (
          <span className="text-xs text-gray-500">Aisle: {location.aisle}</span>
        )}
        {location.rack && (
          <span className="text-xs text-gray-500">Rack: {location.rack}</span>
        )}
        {location.bin && (
          <span className="text-xs text-gray-500">Bin: {location.bin}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children!.map((child) => (
            <LocationNode key={child.id} location={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateLocationDialog({
  warehouseId,
  onClose,
}: {
  warehouseId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>('STORAGE');
  const [zone, setZone] = useState('');
  const [aisle, setAisle] = useState('');
  const [rack, setRack] = useState('');
  const [bin, setBin] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');

  const createLocation = useCreateLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLocation.mutate(
      {
        warehouseId,
        name,
        code,
        type,
        zone: zone || undefined,
        aisle: aisle || undefined,
        rack: rack || undefined,
        bin: bin || undefined,
        maxCapacity: maxCapacity || undefined,
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
          New Location
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          placeholder="e.g. A-01-01"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LocationType)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="RECEIVING">Receiving</option>
          <option value="STORAGE">Storage</option>
          <option value="PICKING">Picking</option>
          <option value="SHIPPING">Shipping</option>
          <option value="QUARANTINE">Quarantine</option>
        </select>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Zone
            </label>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Aisle
            </label>
            <input
              value={aisle}
              onChange={(e) => setAisle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Rack
            </label>
            <input
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bin
            </label>
            <input
              value={bin}
              onChange={(e) => setBin(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Max Capacity
        </label>
        <input
          type="number"
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(e.target.value)}
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
            disabled={createLocation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createLocation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createLocation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createLocation.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function LocationsTreePage() {
  const { data: warehousesData, isLoading: loadingWarehouses } = useWarehouses();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const warehouses = warehousesData?.data ?? [];

  const { data: locationsData, isLoading: loadingLocations } = useLocations(
    selectedWarehouseId || undefined,
  );

  const locations: WHLocation[] = locationsData?.data ?? [];

  // Auto-select first warehouse
  if (!selectedWarehouseId && warehouses.length > 0) {
    setSelectedWarehouseId(warehouses[0]!.id);
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            disabled={loadingWarehouses}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {loadingWarehouses && <option>Loading...</option>}
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!selectedWarehouseId}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            New Location
          </button>
        </div>
      </div>

      {showCreate && selectedWarehouseId && (
        <CreateLocationDialog
          warehouseId={selectedWarehouseId}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-blue-500" />
              Receiving
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-green-500" />
              Storage
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-yellow-500" />
              Picking
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-purple-500" />
              Shipping
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-red-500" />
              Quarantine
            </span>
          </div>
        </div>

        {loadingLocations ? (
          <p className="px-4 py-8 text-center text-gray-500">Loading...</p>
        ) : locations.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400">
            No locations found. Create your first location to get started.
          </p>
        ) : (
          <div>
            {locations.map((loc) => (
              <LocationNode key={loc.id} location={loc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
