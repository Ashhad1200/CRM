import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRoles, useCreateRole, useDeleteRole } from '../api';
import type { Role } from '../api';

function CreateRoleDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createRole = useCreateRole();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRole.mutate(
      { name, description: description || undefined },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Role</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
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
            disabled={createRole.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createRole.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createRole.isError && (
          <p className="mt-2 text-sm text-red-600">{createRole.error.message}</p>
        )}
      </form>
    </div>
  );
}

function DeleteButton({ role }: { role: Role }) {
  const deleteMut = useDeleteRole(role.id);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex gap-1">
        <button
          onClick={() => deleteMut.mutate(undefined, { onSuccess: () => setConfirming(false) })}
          disabled={deleteMut.isPending}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={role.isSystem}
      title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
      className="text-xs text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
    >
      Delete
    </button>
  );
}

export default function RolesListPage() {
  const navigate = useNavigate();
  const { data: roles, isLoading, isError, error } = useRoles();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Role
        </button>
      </div>

      {showCreate && <CreateRoleDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading roles…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {roles && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-center">Users</th>
              <th className="px-3 py-3 text-center">System</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr
                key={r.id}
                onClick={() => navigate(`/admin/roles/${r.id}`)}
                className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-3 py-3 text-gray-600">{r.description ?? '—'}</td>
                <td className="px-3 py-3 text-center text-gray-600">
                  {r._count.userRoles}
                </td>
                <td className="px-3 py-3 text-center">
                  {r.isSystem ? (
                    <span className="inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                      System
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td
                  className="px-3 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to={`/admin/roles/${r.id}`}
                    className="mr-3 text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteButton role={r} />
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
