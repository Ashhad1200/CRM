import { useParams } from 'react-router';
import { useState, type FormEvent } from 'react';
import { useTicket, useAddReply, type TicketReply } from '../../api.js';

const statusColor: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING_ON_CUSTOMER: 'bg-purple-100 text-purple-800',
  ESCALATED: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const priorityColor: Record<string, string> = {
  LOW: 'text-gray-600',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PortalTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id!);
  const addReply = useAddReply();
  const [body, setBody] = useState('');

  const publicReplies: TicketReply[] =
    ticket?.replies?.filter((r) => !r.isInternal) ?? [];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !id) return;
    addReply.mutate(
      { ticketId: id, body: body.trim(), isInternal: false },
      { onSuccess: () => setBody('') },
    );
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-16 text-sm">Loading ticket…</div>;
  }

  if (isError || !ticket) {
    return (
      <div className="text-center text-red-600 py-16 text-sm">
        Failed to load ticket. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              #{ticket.ticketNumber} &middot; {fmtDateTime(ticket.createdAt)}
            </p>
            <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor[ticket.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {ticket.status.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs font-medium ${priorityColor[ticket.priority] ?? 'text-gray-600'}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
        {ticket.description && (
          <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </p>
        )}
      </div>

      {/* ── Reply Timeline ── */}
      <div className="rounded-lg bg-white shadow-sm border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider rounded-t-lg">
          Replies ({publicReplies.length})
        </div>

        {publicReplies.length === 0 && (
          <div className="px-5 py-6 text-sm text-gray-400 text-center">No replies yet.</div>
        )}

        {publicReplies.map((r) => (
          <div key={r.id} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-700 capitalize">
                {r.authorType === 'AGENT' ? 'Support' : 'You'}
              </span>
              <span className="text-xs text-gray-400">{fmtDateTime(r.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
          </div>
        ))}
      </div>

      {/* ── Reply Form ── */}
      {ticket.status !== 'CLOSED' && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg bg-white shadow-sm border border-gray-200 p-5 space-y-3"
        >
          <label htmlFor="portal-reply" className="block text-sm font-medium text-gray-700">
            Add a reply
          </label>
          <textarea
            id="portal-reply"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!body.trim() || addReply.isPending}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addReply.isPending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
