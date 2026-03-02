import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useChecklists, useDeleteChecklist } from '../api';
import type { QCChecklist, InspectionType } from '../api';

const TYPE_COLORS: Record<InspectionType, string> = {
  INCOMING: 'bg-blue-100 text-blue-700',
  IN_PROCESS: 'bg-purple-100 text-purple-700',
  FINAL: 'bg-green-100 text-green-700',
  SUPPLIER: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  IN_PROCESS: 'In-Process',
  FINAL: 'Final',
  SUPPLIER: 'Supplier',
};

function TypeBadge({ type }: { type: InspectionType }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function ChecklistsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const filters: Record<string, string> = {};
  if (typeFilter) filters['type'] = typeFilter;
  if (activeFilter) filters['isActive'] = activeFilter;

  const { data, isLoading, isError, error } = useChecklists(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const deleteChecklist = useDeleteChecklist();

  const checklists: QCChecklist[] = data?.data ?? [];

  const filtered = checklists.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this checklist template?')) {
      deleteChecklist.mutate({ id });
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
        <button
          onClick={() => navigate('/quality/checklists/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full py-8 text-center text-gray-400">
              No checklist templates found.
            </p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/quality/checklists/${c.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">{c.name}</h3>
                  <TypeBadge type={c.type} />
                </div>
                {c.description && (
                  <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{c.checklistItems.length} items</span>
                  <span
                    className={`rounded px-2 py-0.5 ${
                      c.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/quality/checklists/${c.id}`);
                    }}
                    className="rounded px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="rounded px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
