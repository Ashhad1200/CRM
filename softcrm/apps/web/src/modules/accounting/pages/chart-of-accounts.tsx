import { useState, useMemo } from 'react';
import { useChartOfAccounts, useCreateAccount } from '../api.js';
import type { ChartOfAccount } from '../api.js';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  REVENUE: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
};

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {type}
    </span>
  );
}

function CreateAccountDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('ASSET');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const createAccount = useCreateAccount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAccount.mutate(
      {
        code,
        name,
        type,
        description: description || undefined,
        parentId: parentId || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Account</h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. 1010"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Parent Account ID</label>
        <input value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Optional"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={createAccount.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createAccount.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </div>

        {createAccount.isError && (
          <p className="mt-2 text-sm text-red-600">{createAccount.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const { data, isLoading, isError, error } = useChartOfAccounts();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const accounts: ChartOfAccount[] = data?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, ChartOfAccount[]> = {};
    for (const t of ACCOUNT_TYPES) map[t] = [];
    for (const acct of accounts) {
      const q = search.toLowerCase();
      if (q && !acct.name.toLowerCase().includes(q) && !acct.code.toLowerCase().includes(q)) continue;
      const bucket = map[acct.type];
      if (bucket) bucket.push(acct);
      else {
        map[acct.type] = [acct];
      }
    }
    return map;
  }, [accounts, search]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Account
        </button>
      </div>

      {showCreate && <CreateAccountDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4">
        <input type="text" placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="space-y-6">
          {ACCOUNT_TYPES.map((type) => {
            const list = grouped[type] ?? [];
            if (list.length === 0 && search) return null;
            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <TypeBadge type={type} />
                  <span className="text-xs text-gray-500">{list.length} account(s)</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">System</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-400">No accounts.</td>
                      </tr>
                    ) : (
                      list.map((acct) => (
                        <tr key={acct.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-900">{acct.code}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{acct.name}</td>
                          <td className="px-3 py-2 text-gray-600">{acct.description ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{acct.isSystem ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2 text-gray-500">{new Date(acct.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
