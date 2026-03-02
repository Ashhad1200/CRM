import * as React from 'react';
import { cn } from '../utils/cn.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

export interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const typeIconColors: Record<Notification['type'], string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

const typeBorderColors: Record<Notification['type'], string> = {
  info: 'border-l-blue-400',
  success: 'border-l-emerald-400',
  warning: 'border-l-amber-400',
  error: 'border-l-red-400',
};

const defaultIcons: Record<Notification['type'], React.ReactNode> = {
  info: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const groups: { label: string; items: Notification[] }[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const n of notifications) {
    if (isSameDay(n.timestamp, today)) todayItems.push(n);
    else if (isSameDay(n.timestamp, yesterday)) yesterdayItems.push(n);
    else earlierItems.push(n);
  }

  if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

  return groups;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ notification, onMarkRead, onDismiss }) => {
  const icon = notification.icon ?? defaultIcons[notification.type];

  return (
    <div
      role="listitem"
      className={cn(
        'group relative flex gap-3 rounded-lg border-l-2 p-3 transition-all',
        notification.read
          ? 'border-l-transparent bg-transparent'
          : cn('glass-1', typeBorderColors[notification.type]),
      )}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 shrink-0', typeIconColors[notification.type])}>
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-snug', notification.read ? 'text-neutral-400' : 'font-medium text-neutral-100')}>
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-neutral-500">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
          {notification.message}
        </p>
        {notification.action && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              notification.action!.onClick();
            }}
            className="mt-2 inline-flex items-center rounded-md bg-brand-600/20 px-2.5 py-1 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-600/30"
          >
            {notification.action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="absolute right-2 top-2 rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
      >
        <svg className="h-3.5 w-3.5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
};
NotificationItem.displayName = 'NotificationItem';

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDate(notifications);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          aria-hidden="true"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Notifications"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col',
          'glass-3 rounded-l-2xl border-l border-white/10 shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-neutral-100">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => onOpenChange(false)}
              className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <svg className="h-4 w-4 text-neutral-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notifications.length === 0 ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
              <svg className="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="text-sm font-medium">No notifications</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {group.label}
                </h3>
                <div role="list" className="space-y-1">
                  {group.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={onMarkRead}
                      onDismiss={onDismiss}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};
NotificationPanel.displayName = 'NotificationPanel';
