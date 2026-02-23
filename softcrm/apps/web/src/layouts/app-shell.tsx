import { useState, type ReactNode } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../providers/auth-provider';
import { useRbac } from '../providers/rbac-provider';

interface NavItem {
  label: string;
  path: string;
  module: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Pipeline', path: '/sales', module: 'sales', icon: '💼' },
  { label: 'Accounting', path: '/accounting', module: 'accounting', icon: '📊' },
  { label: 'Support', path: '/support', module: 'support', icon: '🎧' },
  { label: 'Marketing', path: '/marketing', module: 'marketing', icon: '📣' },
  { label: 'Inventory', path: '/inventory', module: 'inventory', icon: '📦' },
  { label: 'Projects', path: '/projects', module: 'projects', icon: '📋' },
  { label: 'Analytics', path: '/analytics', module: 'analytics', icon: '📈' },
  { label: 'Admin', path: '/admin', module: 'platform', icon: '⚙️' },
];

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { permissions } = useRbac();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => {
    const mod = permissions[item.module];
    return mod && mod.access !== 'none';
  });

  const handleLogout = async () => {
    await logout();
    void navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-16'
        } flex flex-col border-r border-gray-200 bg-white transition-all duration-200`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {sidebarOpen && (
            <span className="text-lg font-bold text-brand-600">SoftCRM</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <span>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-gray-500">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name ?? user?.email}</span>
            <button
              onClick={() => void handleLogout()}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
