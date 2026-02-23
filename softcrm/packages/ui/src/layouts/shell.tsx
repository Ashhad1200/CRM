import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Sidebar ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed = false,
  onToggle,
  header,
  footer,
  className,
}) => {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-neutral-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
        {!collapsed && header}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  item.active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge != null && (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-100 px-1 text-xs font-medium text-brand-700">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-neutral-200 p-3">{footer}</div>
      )}
    </aside>
  );
};

Sidebar.displayName = 'Sidebar';

// ── TopNav ──────────────────────────────────────────────────────────────────────

export interface TopNavProps {
  breadcrumb?: React.ReactNode;
  searchInput?: React.ReactNode;
  actions?: React.ReactNode;
  userMenu?: React.ReactNode;
  className?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  breadcrumb,
  searchInput,
  actions,
  userMenu,
  className,
}) => {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {breadcrumb}
      </div>
      <div className="flex items-center gap-3">
        {searchInput}
        {actions}
        {userMenu}
      </div>
    </header>
  );
};

TopNav.displayName = 'TopNav';

// ── Shell ───────────────────────────────────────────────────────────────────────

export interface ShellProps {
  sidebar: React.ReactNode;
  topNav: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Shell: React.FC<ShellProps> = ({ sidebar, topNav, children, className }) => {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-neutral-50', className)}>
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {topNav}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

Shell.displayName = 'Shell';

// ── Mobile Nav ──────────────────────────────────────────────────────────────────

export interface MobileNavProps {
  items: NavItem[];
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ items, className }) => {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-neutral-200 bg-white py-2 md:hidden',
        className,
      )}
    >
      {items.slice(0, 5).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2 py-1 text-xs',
            item.active ? 'text-brand-600' : 'text-neutral-500',
          )}
        >
          {item.icon && <span>{item.icon}</span>}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

MobileNav.displayName = 'MobileNav';
