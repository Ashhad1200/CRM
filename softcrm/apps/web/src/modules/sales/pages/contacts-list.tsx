import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useContacts, useCreateContact } from '../api';
import type { Contact } from '../api';

const STAGE_COLORS: Record<string, string> = {
  SUBSCRIBER: 'bg-gray-100 text-gray-700',
  LEAD: 'bg-blue-100 text-blue-700',
  MQL: 'bg-indigo-100 text-indigo-700',
  SQL: 'bg-purple-100 text-purple-700',
  OPPORTUNITY: 'bg-yellow-100 text-yellow-700',
  CUSTOMER: 'bg-green-100 text-green-700',
  EVANGELIST: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

function StageBadge({ stage }: { stage: string }) {
  const colors = STAGE_COLORS[stage] ?? STAGE_COLORS['OTHER'];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs ${colors}`}
    >
      {stage}
    </span>
  );
}

function CreateContactDialog({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const createContact = useCreateContact();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContact.mutate(
      {
        firstName,
        lastName,
        emails: email ? [email] : [],
        phones: phone ? [phone] : [],
        company: company || undefined,
        jobTitle: jobTitle || undefined,
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
          New Contact
        </h2>

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
          Job Title
        </label>
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
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
            disabled={createContact.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createContact.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createContact.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createContact.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function ContactsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useContacts();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const contacts: Contact[] = data?.data ?? [];

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const email = (c.emails[0] ?? '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Contact
        </button>
      </div>

      {showCreate && (
        <CreateContactDialog onClose={() => setShowCreate(false)} />
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
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Lifecycle Stage</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No contacts found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/sales/contacts/${c.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.emails[0] ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.phones[0] ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.company ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <StageBadge stage={c.lifecycleStage} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
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
