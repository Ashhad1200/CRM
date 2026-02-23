import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useTicket,
  useAddReply,
  useResolveTicket,
  useCloseTicket,
  useEscalateTicket,
  useReopenTicket,
} from '../api.js';
import type { TicketReply } from '../api.js';

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

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ticketQuery = useTicket(id!);
  const addReply = useAddReply();
  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();
  const escalateTicket = useEscalateTicket();
  const reopenTicket = useReopenTicket();

  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  if (ticketQuery.isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (ticketQuery.isError) return <div className="p-6 text-red-600">{ticketQuery.error.message}</div>;

  const ticket = ticketQuery.data;
  if (!ticket) return <div className="p-6 text-gray-500">Ticket not found.</div>;

  const statusColor = STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-700';
  const priorityColor = PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-700';
  const replies: TicketReply[] = ticket.replies ?? [];

  const canResolve = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL'].includes(ticket.status);
  const canClose = ticket.status === 'RESOLVED';
  const canEscalate = ['OPEN', 'IN_PROGRESS'].includes(ticket.status);
  const canReopen = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    addReply.mutate(
      { ticketId: ticket.id, body: replyBody, isInternal },
      {
        onSuccess: () => {
          setReplyBody('');
          setIsInternal(false);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button onClick={() => navigate('/support/tickets')}
        className="mb-4 text-sm text-blue-600 hover:underline">&larr; Back to Tickets</button>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">#{ticket.ticketNumber} — {ticket.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColor}`}>
                {ticket.priority}
              </span>
              <span className="text-xs text-gray-500">Channel: {ticket.channel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canResolve && (
              <button onClick={() => resolveTicket.mutate({ id: ticket.id })} disabled={resolveTicket.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {resolveTicket.isPending ? 'Resolving…' : 'Resolve'}
              </button>
            )}
            {canClose && (
              <button onClick={() => closeTicket.mutate({ id: ticket.id })} disabled={closeTicket.isPending}
                className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                {closeTicket.isPending ? 'Closing…' : 'Close'}
              </button>
            )}
            {canEscalate && (
              <button onClick={() => escalateTicket.mutate({ id: ticket.id })} disabled={escalateTicket.isPending}
                className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {escalateTicket.isPending ? 'Escalating…' : 'Escalate'}
              </button>
            )}
            {canReopen && (
              <button onClick={() => reopenTicket.mutate({ id: ticket.id })} disabled={reopenTicket.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {reopenTicket.isPending ? 'Reopening…' : 'Reopen'}
              </button>
            )}
          </div>
        </div>

        {/* Ticket details grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Assigned Agent</p>
            <p className="text-sm text-gray-900">{ticket.assignedAgentId ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Contact</p>
            <p className="text-sm text-gray-900">{ticket.contactId ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">SLA Deadline</p>
            <p className="text-sm text-gray-900">
              {ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Created</p>
            <p className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Description</p>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{ticket.description}</p>
        </div>

        {/* Tags */}
        {ticket.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>
            ))}
          </div>
        )}

        {/* SLA Policy */}
        {ticket.slaPolicy && (
          <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">SLA Policy: {ticket.slaPolicy.name}</p>
            <p className="text-xs text-gray-500">
              First Response: {ticket.slaPolicy.firstResponseMinutes}m · Resolution: {ticket.slaPolicy.resolutionMinutes}m
            </p>
          </div>
        )}
      </div>

      {/* Replies Timeline */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Conversation</h2>
        {replies.length === 0 && (
          <p className="text-sm text-gray-400">No replies yet.</p>
        )}
        <div className="space-y-3">
          {replies.map((reply) => {
            const isAgent = reply.authorType === 'AGENT';
            return (
              <div
                key={reply.id}
                className={`rounded-lg border p-4 ${
                  reply.isInternal
                    ? 'border-yellow-200 bg-yellow-50'
                    : isAgent
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    {reply.authorType}
                    {reply.isInternal && (
                      <span className="ml-1 rounded bg-yellow-200 px-1.5 py-0.5 text-xs text-yellow-800">Internal</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{reply.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Form */}
      {ticket.status !== 'CLOSED' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Add Reply</h3>
          <form onSubmit={handleSendReply}>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              placeholder="Type your reply…"
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Internal note
              </label>
              <button
                type="submit"
                disabled={addReply.isPending || !replyBody.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addReply.isPending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
            {addReply.isError && (
              <p className="mt-2 text-sm text-red-600">{addReply.error.message}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
