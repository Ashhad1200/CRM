import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  type Project,
} from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ProjectListPage() {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState('');

  const params: Record<string, unknown> = { page, limit: 20 };
  if (search) params['search'] = search;
  if (status) params['status'] = status;

  const { data: listData, isLoading, error } = useProjects(params);
  const projects = listData?.data ?? [];
  const totalPages = listData?.totalPages ?? 1;

  const createMut = useCreateProject();
  const deleteMut = useDeleteProject(deleteId);

  function handleCreate() {
    if (!newName.trim()) return;
    createMut.mutate({ name: newName.trim() }, {
      onSuccess: () => { setShowCreate(false); setNewName(''); },
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return;
    setDeleteId(id);
    setTimeout(() => deleteMut.mutate(), 0);
  }

  if (error) return <div className="p-6 text-red-600">Failed to load projects.</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search projects…" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">End</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((p: Project) => (
                <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => nav(`/projects/${p.id}`)}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No projects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">New Project</h2>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" className="mb-4 w-full rounded-lg border px-3 py-2 text-sm" autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={createMut.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
