import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTestPlans, useDeleteTestPlan } from '../api';
import type { TestPlan } from '../api';

export default function TestPlansListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const filters: Record<string, string> = {};
  if (activeFilter) filters['isActive'] = activeFilter;

  const { data, isLoading, isError, error } = useTestPlans(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const deleteTestPlan = useDeleteTestPlan();

  const testPlans: TestPlan[] = data?.data ?? [];

  const filtered = testPlans.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this test plan?')) {
      deleteTestPlan.mutate({ id });
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Test Plans</h1>
        <button
          onClick={() => navigate('/quality/test-plans/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Test Plan
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search test plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
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
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Steps</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No test plans found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/quality/test-plans/${t.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-gray-600">
                    {t.description ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{t.steps.length} steps</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quality/test-plans/${t.id}`);
                        }}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDelete(t.id, e)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
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
