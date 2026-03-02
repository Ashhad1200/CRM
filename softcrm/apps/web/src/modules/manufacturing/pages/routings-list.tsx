import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useRoutings,
  useCreateRouting,
  useDeleteRouting,
  type Routing,
} from '../api';

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function CreateRoutingDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const createRouting = useCreateRouting();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRouting.mutate(
      { name, productId, routingVersion: version },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Routing
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Product A Manufacturing Process"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Product ID
        </label>
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          placeholder="Product this routing applies to"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Version
        </label>
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="1.0"
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
            disabled={createRouting.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createRouting.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createRouting.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createRouting.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function RoutingsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useRoutings();
  const deleteRouting = useDeleteRouting();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const routings: Routing[] = data?.data ?? [];

  const filtered = routings.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.routingVersion.toLowerCase().includes(q)
    );
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this routing?')) {
      deleteRouting.mutate(id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Routings</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Routing
        </button>
      </div>

      {showCreate && <CreateRoutingDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or version..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Version</th>
              <th className="px-3 py-3">Product ID</th>
              <th className="px-3 py-3">Total Hours</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No routings found.
                </td>
              </tr>
            ) : (
              filtered.map((routing) => (
                <tr
                  key={routing.id}
                  onClick={() =>
                    navigate(`/manufacturing/routings/${routing.id}`)
                  }
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {routing.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {routing.routingVersion}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {routing.productId.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {parseFloat(routing.totalHours).toFixed(2)}h
                  </td>
                  <td className="px-3 py-3">
                    <ActiveBadge isActive={routing.isActive} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(routing.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={(e) => handleDelete(routing.id, e)}
                      disabled={deleteRouting.isPending}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
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
