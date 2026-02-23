import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAccounts, useCreateAccount } from '../api';
import type { Account } from '../api';

function CreateAccountDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [size, setSize] = useState('');
  const createAccount = useCreateAccount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAccount.mutate(
      {
        name,
        industry: industry || undefined,
        website: website || undefined,
        phone: phone || undefined,
        size: size || undefined,
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
          New Account
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
          Industry
        </label>
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Size
        </label>
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. SMALL, MEDIUM, ENTERPRISE"
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
            disabled={createAccount.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createAccount.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createAccount.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createAccount.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function AccountsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAccounts();
  const [showCreate, setShowCreate] = useState(false);

  const accounts: Account[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Account
        </button>
      </div>

      {showCreate && (
        <CreateAccountDialog onClose={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Industry</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Website</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No accounts found.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/sales/accounts/${a.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {a.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {a.industry ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {a.size ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {a.website ? (
                      <a
                        href={a.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        {a.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {a.ownerId ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(a.createdAt).toLocaleDateString()}
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
