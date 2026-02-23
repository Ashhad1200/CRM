import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTimeline } from '../api.js';
import type { Activity } from '../api.js';

/* ───────── Helpers ───────── */

const TYPE_ICONS: Record<Activity['type'], string> = {
  EMAIL: '📧',
  CALL: '📞',
  NOTE: '📝',
  MEETING: '📅',
  SMS: '💬',
};

const TYPE_COLORS: Record<Activity['type'], string> = {
  EMAIL: 'bg-blue-100 text-blue-800',
  CALL: 'bg-green-100 text-green-800',
  NOTE: 'bg-yellow-100 text-yellow-800',
  MEETING: 'bg-purple-100 text-purple-800',
  SMS: 'bg-pink-100 text-pink-800',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function truncate(text: string | null, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/* ───────── Timeline Item ───────── */

interface TimelineItemProps {
  activity: Activity;
  isLast: boolean;
}

function TimelineItem({ activity, isLast }: TimelineItemProps) {
  const icon = TYPE_ICONS[activity.type];
  const colorClass = TYPE_COLORS[activity.type];

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Vertical connecting line */}
      {!isLast && (
        <div className="absolute left-5 top-10 h-full w-px bg-gray-200" />
      )}

      {/* Icon circle */}
      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${colorClass}`}
      >
        {icon}
      </div>

      {/* Content card */}
      <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {/* Header row */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
          >
            {activity.type}
          </span>
          <span className="text-xs text-gray-500">
            {activity.direction === 'INBOUND' ? '⬅ Inbound' : '➡ Outbound'}
          </span>
          <span className="ml-auto text-xs text-gray-400" title={formatAbsoluteTime(activity.timestamp)}>
            {relativeTime(activity.timestamp)}
          </span>
        </div>

        {/* Subject */}
        {activity.subject && (
          <h3 className="mb-1 text-sm font-semibold text-gray-900">
            {activity.subject}
          </h3>
        )}

        {/* Body preview */}
        {activity.body && (
          <p className="mb-2 text-sm text-gray-600">
            {truncate(activity.body, 100)}
          </p>
        )}

        {/* Call details */}
        {activity.type === 'CALL' && activity.callLog && (
          <div className="mt-2 flex flex-wrap gap-3 rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <span>
              Duration: <strong>{formatDuration(activity.callLog.duration)}</strong>
            </span>
            <span>
              Status:{' '}
              <strong className="capitalize">{activity.callLog.status}</strong>
            </span>
            {activity.callLog.fromNumber && (
              <span>From: {activity.callLog.fromNumber}</span>
            )}
            {activity.callLog.toNumber && (
              <span>To: {activity.callLog.toNumber}</span>
            )}
          </div>
        )}

        {/* Absolute time */}
        <p className="mt-2 text-xs text-gray-400">
          {formatAbsoluteTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

/* ───────── Timeline Component ───────── */

interface TimelineProps {
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  accountId?: string;
}

export function Timeline({ contactId, dealId, ticketId, accountId }: TimelineProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useTimeline({
    contactId,
    dealId,
    ticketId,
    accountId,
    page,
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load timeline: {(error as Error).message}
      </div>
    );
  }

  const activities = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="mb-2 text-4xl">📭</span>
        <p className="text-sm">No activities yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-1">
        {activities.map((activity, idx) => (
          <TimelineItem
            key={activity.id}
            activity={activity}
            isLast={idx === activities.length - 1}
          />
        ))}
      </div>

      {/* Pagination: Load More */}
      {page < totalPages && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Load More
          </button>
        </div>
      )}

      {/* Page indicator */}
      <p className="mt-3 text-center text-xs text-gray-400">
        Page {page} of {totalPages}
      </p>
    </div>
  );
}

/* ───────── Standalone Page (default export) ───────── */

export default function TimelinePage() {
  const [searchParams] = useSearchParams();

  const contactId = searchParams.get('contactId') ?? undefined;
  const dealId = searchParams.get('dealId') ?? undefined;
  const ticketId = searchParams.get('ticketId') ?? undefined;
  const accountId = searchParams.get('accountId') ?? undefined;

  const hasContext = contactId || dealId || ticketId || accountId;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Activity Timeline</h1>

      {!hasContext && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Select a contact, deal, ticket, or account to view its timeline.
        </div>
      )}

      {hasContext && (
        <Timeline
          contactId={contactId}
          dealId={dealId}
          ticketId={ticketId}
          accountId={accountId}
        />
      )}
    </div>
  );
}
