import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../providers/auth-provider';
import { useCommandPalette } from '../providers/command-palette-provider';
import { useNotifications } from '../providers/notification-provider';
import { useBreadcrumb } from '../hooks/use-breadcrumb';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { useTheme, cn, SearchInput, NotificationPanel, Badge, Breadcrumb } from '@softcrm/ui';
import { SidebarNav } from './sidebar-nav';
import type { Theme } from '@softcrm/ui';

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const commandPalette = useCommandPalette();
  const notifications = useNotifications();
  const breadcrumbItems = useBreadcrumb();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!);
  };

  const handleLogout = async () => {
    await logout();
    void navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 mesh-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col glass-3 backdrop-blur-xl border-r border-white/10 transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <span className="text-lg font-bold accent-gradient bg-clip-text text-transparent">
              SoftBusiness
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <SidebarNav collapsed={!sidebarOpen} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav */}
        <header className="flex h-14 items-center justify-between glass-2 backdrop-blur-xl border-b border-white/10 px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Breadcrumb
              items={breadcrumbItems}
              onNavigate={(href) => navigate(href)}
              maxItems={5}
            />
          </div>
          <div className="flex items-center gap-3">
            <SearchInput
              onSearch={() => {}}
              placeholder="Search..."
              shortcut="⌘K"
              onShortcutClick={() => commandPalette.open()}
              className="w-64"
              data-search-input
            />

            <button
              onClick={cycleTheme}
              className="glass-1 rounded-lg p-2 hover:glass-2"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? '🌙' : '☀️'}
            </button>

            <button
              onClick={notifications.togglePanel}
              className="relative glass-1 rounded-lg p-2 hover:glass-2"
              aria-label="Notifications"
            >
              🔔
              {notifications.unreadCount > 0 && (
                <Badge
                  variant="danger"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {notifications.unreadCount}
                </Badge>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-300">
                {user?.name}
              </span>
              <button
                onClick={() => void handleLogout()}
                className="glass-1 rounded-lg px-3 py-1.5 text-sm hover:glass-2"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        open={notifications.isPanelOpen}
        onOpenChange={notifications.setPanelOpen}
        notifications={notifications.notifications}
        onMarkRead={notifications.markRead}
        onMarkAllRead={notifications.markAllRead}
        onDismiss={notifications.dismiss}
        onClearAll={notifications.clearAll}
      />
    </div>
  );
}
