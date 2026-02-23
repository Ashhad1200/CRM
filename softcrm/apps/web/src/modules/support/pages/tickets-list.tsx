import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTickets, useCreateTicket } from '../api.js';
import type { Ticket } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  WAITING_CUSTOMER: 'bg-orange-100 text-orange-700',
  WAITING_INTERNAL: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED'] as const;
const PRIORITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors = PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {priority}
    </span>
  );
}

function CreateTicketDialog({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [channel, setChannel] = useState('EMAIL');
  const [contactId, setContactId] = useState('');
  const createTicket = useCreateTicket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate(
      {
        subject,
        description,
        priority,
        channel,
        contactId: contactId || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Ticket</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {(['EMAIL', 'PHONE', 'CHAT', 'WEB', 'API'] as const).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Contact ID</label>
        <input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Optional"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={createTicket.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>

        {createTicket.isError && (
          <p className="mt-2 text-sm text-red-600">{createTicket.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function TicketsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const filters: Record<string, string> = { page: String(page), limit: '20' };
  if (statusFilter !== 'ALL') filters['status'] = statusFilter;
  if (priorityFilter !== 'ALL') filters['priority'] = priorityFilter;

  const { data, isLoading, isError, error } = useTickets(filters);

  const tickets: Ticket[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Ticket
        </button>
      </div>

      {showCreate && <CreateTicketDialog onClose={() => setShowCreate(false)} />}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {PRIORITIES.map((p) => (
            <button key={p} onClick={() => { setPriorityFilter(p); setPage(1); }}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tickets found.</td>
                  </tr>
                )}
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => navigate(`/support/tickets/${t.id}`)}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.ticketNumber}</td>
                    <td className="px-4 py-3 text-gray-900">{t.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3 text-gray-500">{t.channel}</td>
                    <td className="px-4 py-3 text-gray-500">{t.assignedAgentId ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {meta.page} of {totalPages} · {meta.total} total
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
