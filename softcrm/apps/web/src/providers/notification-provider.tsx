import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { useSocket } from './socket-provider';
import { apiClient } from '../lib/api-client';
import { toast, type Notification } from '@softcrm/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isPanelOpen: boolean;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mapNotificationType(
  apiType: string,
): 'info' | 'success' | 'warning' | 'error' {
  switch (apiType) {
    case 'DEAL_WON':
      return 'success';
    case 'DEAL_LOST':
    case 'TICKET_OVERDUE':
    case 'INVOICE_OVERDUE':
      return 'error';
    case 'APPROVAL_REQUIRED':
    case 'LEAVE_REQUEST':
      return 'warning';
    default:
      return 'info';
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const NotificationContext = createContext<NotificationContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function NotificationProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Map an API notification object to the UI Notification type
  const toUiNotification = useCallback(
    (n: ApiNotification): Notification => ({
      id: n.id,
      title: n.title,
      message: n.body,
      type: mapNotificationType(n.type),
      read: n.isRead,
      timestamp: new Date(n.createdAt),
      action: n.actionUrl
        ? { label: 'View', onClick: () => navigate(n.actionUrl!) }
        : undefined,
    }),
    [navigate],
  );

  // Fetch initial notifications
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiClient<ApiNotification[]>(
          '/api/v1/platform/notifications?limit=50',
        );
        if (cancelled) return;
        const mapped = data.map(toUiNotification);
        setNotifications(mapped);
        setUnreadCount(mapped.filter((n) => !n.read).length);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [toUiNotification]);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;

    function handleNew(apiNotification: ApiNotification) {
      const mapped = toUiNotification(apiNotification);
      setNotifications((prev) => [mapped, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast({
        title: mapped.title,
        description: mapped.message,
        variant:
          mapped.type === 'error'
            ? 'danger'
            : mapped.type === 'warning'
              ? 'warning'
              : mapped.type === 'success'
                ? 'success'
                : 'default',
      });
    }

    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [socket, toUiNotification]);

  // Panel controls
  const togglePanel = useCallback(() => setIsPanelOpen((o) => !o), []);
  const setPanelOpen = useCallback((open: boolean) => setIsPanelOpen(open), []);

  // Mark a single notification as read
  const markRead = useCallback(
    (id: string) => {
      apiClient('/api/v1/platform/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [],
  );

  // Mark all notifications as read
  const markAllRead = useCallback(() => {
    apiClient('/api/v1/platform/notifications/mark-all-read', {
      method: 'POST',
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Dismiss a single notification
  const dismiss = useCallback(
    (id: string) => {
      apiClient(`/api/v1/platform/notifications/${id}`, {
        method: 'DELETE',
      });
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    },
    [],
  );

  // Clear all notifications locally
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isPanelOpen,
        togglePanel,
        setPanelOpen,
        markRead,
        markAllRead,
        dismiss,
        clearAll,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
