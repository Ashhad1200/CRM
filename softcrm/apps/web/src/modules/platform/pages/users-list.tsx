import { useState } from 'react';
import { useUsers, useRoles } from '../api';

export default function UsersListPage() {
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call invite endpoint when available
    alert(`Invite would be sent to: ${inviteEmail}`);
    setInviteEmail('');
    setShowInvite(false);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Invite User
        </button>
      </div>

      {/* Invite dialog */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleInvite}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Invite User
            </h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {isLoading && <p className="text-gray-500">Loading…</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Email</th>
            <th className="px-3 py-3">Role(s)</th>
            <th className="px-3 py-3">Last Login</th>
            <th className="px-3 py-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {users && users.length > 0 ? (
            users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-3 font-medium text-gray-900">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-3 py-3 text-gray-600">{u.email}</td>
                <td className="px-3 py-3">
                  <select
                    value={u.roles[0] ?? ''}
                    onChange={() => {
                      // TODO: implement role assignment
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="">— Assign Role —</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      u.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : u.status === 'INVITED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                {isLoading
                  ? ''
                  : 'No users found. User management endpoints are not yet implemented.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
