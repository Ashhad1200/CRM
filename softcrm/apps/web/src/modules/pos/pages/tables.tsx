import { useState } from 'react';
import { useTables, useCreateTable, useUpdateTable, useOpenTableSession, useCloseTableSession } from '../api';
import type { RestaurantTable } from '../api';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  OCCUPIED: 'bg-red-500',
  RESERVED: 'bg-yellow-500',
  CLEANING: 'bg-blue-500',
};

const STATUS_TEXT: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
};

function TableCard({
  table,
  onOpen,
  onClose,
  onClick,
}: {
  table: RestaurantTable;
  onOpen: () => void;
  onClose: () => void;
  onClick: () => void;
}) {
  const isAvailable = table.status === 'AVAILABLE';
  const isOccupied = table.status === 'OCCUPIED';

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Status indicator */}
      <div
        className={`absolute top-2 right-2 h-3 w-3 rounded-full ${
          STATUS_COLORS[table.status] ?? 'bg-gray-500'
        }`}
      />

      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{table.tableNumber}</h3>
        <p className="text-sm text-gray-500">
          {table.section ? `${table.section} - ` : ''}
          {table.capacity} seats
        </p>
        <p
          className={`mt-2 text-sm font-medium ${
            isAvailable
              ? 'text-green-600'
              : isOccupied
                ? 'text-red-600'
                : 'text-gray-600'
          }`}
        >
          {STATUS_TEXT[table.status] ?? table.status}
        </p>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {isAvailable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            Seat Guests
          </button>
        )}
        {isOccupied && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
          >
            Close Table
          </button>
        )}
      </div>
    </div>
  );
}

function CreateTableDialog({ onClose }: { onClose: () => void }) {
  const [tableNumber, setTableNumber] = useState('');
  const [section, setSection] = useState('');
  const [capacity, setCapacity] = useState('4');
  const createTable = useCreateTable();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTable.mutate(
      {
        tableNumber,
        section: section || undefined,
        capacity: parseInt(capacity, 10),
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
          Add New Table
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Table Number
        </label>
        <input
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          required
          placeholder="e.g. T1, A5, Bar-1"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Section (optional)
        </label>
        <input
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="e.g. Patio, Main Floor, Bar"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Capacity
        </label>
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
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
            disabled={createTable.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createTable.isPending ? 'Creating...' : 'Add Table'}
          </button>
        </div>

        {createTable.isError && (
          <p className="mt-2 text-sm text-red-600">{createTable.error.message}</p>
        )}
      </form>
    </div>
  );
}

function EditTableDialog({
  table,
  onClose,
}: {
  table: RestaurantTable;
  onClose: () => void;
}) {
  const [tableNumber, setTableNumber] = useState(table.tableNumber);
  const [section, setSection] = useState(table.section ?? '');
  const [capacity, setCapacity] = useState(table.capacity.toString());
  const [status, setStatus] = useState(table.status);
  const updateTable = useUpdateTable();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTable.mutate(
      {
        id: table.id,
        tableNumber,
        section: section || undefined,
        capacity: parseInt(capacity, 10),
        status,
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
          Edit Table {table.tableNumber}
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Table Number
        </label>
        <input
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Section
        </label>
        <input
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Capacity
        </label>
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RestaurantTable['status'])}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="CLEANING">Cleaning</option>
        </select>

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
            disabled={updateTable.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateTable.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        {updateTable.isError && (
          <p className="mt-2 text-sm text-red-600">{updateTable.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function TablesPage() {
  const { data, isLoading, isError, error } = useTables();
  const openTableSession = useOpenTableSession();
  const closeTableSession = useCloseTableSession();

  const [showCreate, setShowCreate] = useState(false);
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>('');

  const tables: RestaurantTable[] = data?.data ?? [];

  // Get unique sections
  const sections = [...new Set(tables.map((t) => t.section).filter(Boolean))] as string[];

  const filtered = tables.filter((t) => {
    if (!sectionFilter) return true;
    return t.section === sectionFilter;
  });

  // Group by section
  const bySection = filtered.reduce(
    (acc, t) => {
      const key = t.section ?? 'Main Floor';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, RestaurantTable[]>,
  );

  // Stats
  const available = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
  const reserved = tables.filter((t) => t.status === 'RESERVED').length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Floor Plan</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Table
        </button>
      </div>

      {showCreate && <CreateTableDialog onClose={() => setShowCreate(false)} />}
      {editTable && (
        <EditTableDialog table={editTable} onClose={() => setEditTable(null)} />
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Tables</p>
          <p className="text-xl font-semibold text-gray-900">{tables.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-xl font-semibold text-green-600">{available}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Occupied</p>
          <p className="text-xl font-semibold text-red-600">{occupied}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Reserved</p>
          <p className="text-xl font-semibold text-yellow-600">{reserved}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-sm text-gray-600">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Cleaning</span>
        </div>
      </div>

      {/* Section Filter */}
      {sections.length > 0 && (
        <div className="mb-6">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="space-y-8">
          {Object.entries(bySection).map(([section, sectionTables]) => (
            <div key={section}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{section}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sectionTables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    onOpen={() => openTableSession.mutate({ tableId: t.id })}
                    onClose={() => closeTableSession.mutate(t.id)}
                    onClick={() => setEditTable(t)}
                  />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(bySection).length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No tables found. Add your first table to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
