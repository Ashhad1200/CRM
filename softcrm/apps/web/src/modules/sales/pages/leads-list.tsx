import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLeads, useCreateLead, useConvertLead } from '../api';
import type { Lead } from '../api';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-indigo-100 text-indigo-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  UNQUALIFIED: 'bg-gray-100 text-gray-700',
  CONVERTED: 'bg-green-100 text-green-700',
};

const SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'PARTNER',
  'SOCIAL',
  'EVENT',
  'ADVERTISEMENT',
  'OTHER',
] as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}>
      {status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color: string;
  if (score >= 80) color = 'green';
  else if (score >= 50) color = 'yellow';
  else color = 'gray';

  return (
    <span
      className={`inline-flex h-6 w-10 items-center justify-center rounded-full bg-${color}-100 text-xs font-semibold text-${color}-700`}
    >
      {score}
    </span>
  );
}

function CreateLeadDialog({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState<string>('WEBSITE');
  const createLead = useCreateLead();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate(
      {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        company: company || undefined,
        source,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Lead</h2>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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
          Company
        </label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Source
        </label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
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
            disabled={createLead.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createLead.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createLead.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createLead.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function LeadsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useLeads();
  const convertLead = useConvertLead();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);

  const leads: Lead[] = data?.data ?? [];

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${l.firstName} ${l.lastName}`.toLowerCase();
    return name.includes(q) || l.email.toLowerCase().includes(q);
  });

  const handleConvert = (lead: Lead) => {
    convertLead.mutate(
      {
        id: lead.id,
        createDeal: true,
        dealName: `${lead.firstName} ${lead.lastName} - Deal`,
      },
      { onSuccess: () => setConfirmConvertId(null) },
    );
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Lead
        </button>
      </div>

      {showCreate && (
        <CreateLeadDialog onClose={() => setShowCreate(false)} />
      )}

      {/* Conversion confirmation dialog */}
      {confirmConvertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Convert Lead
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Convert lead to contact + deal?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmConvertId(null)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={convertLead.isPending}
                onClick={() => {
                  const lead = leads.find((l) => l.id === confirmConvertId);
                  if (lead) handleConvert(lead);
                }}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {convertLead.isPending ? 'Converting…' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{l.email}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {l.company ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{l.source}</td>
                  <td className="px-3 py-3">
                    <ScoreBadge score={l.score} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    {l.status !== 'CONVERTED' && l.status !== 'UNQUALIFIED' && (
                      <button
                        onClick={() => setConfirmConvertId(l.id)}
                        className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        Convert
                      </button>
                    )}
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
