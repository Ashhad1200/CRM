import { Outlet, NavLink, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../providers/auth-provider.js';

const navLinks = [
  { to: '/portal/tickets', label: 'My Tickets' },
  { to: '/portal/kb', label: 'Knowledge Base' },
  { to: '/portal/invoices', label: 'Invoices' },
] as const;

function linkClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1'
    : 'text-gray-600 hover:text-gray-900 pb-1';
}

export default function PortalShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    void navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Navigation ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/portal" className="text-lg font-bold text-blue-600 tracking-tight">
            SoftCRM Portal
          </NavLink>

          {/* Navigation links */}
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
            >
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
              <span className="hidden sm:inline">{user?.name ?? 'Account'}</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black/5 py-1 z-40">
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {user?.email}
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center gap-4 px-4 pb-2 text-sm overflow-x-auto">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
