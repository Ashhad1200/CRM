import { NavLink, useLocation } from 'react-router';
import { cn } from '@softcrm/ui';
import { useState } from 'react';
import { useRbac } from '../providers/rbac-provider';

interface NavItem {
  label: string;
  path: string;
  module: string;
  icon: string;
  badge?: number;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'core',
    label: 'Core',
    icon: '🔹',
    items: [
      { label: 'Dashboard', path: '/', module: '_home', icon: '🏠' },
      { label: 'Analytics', path: '/analytics', module: 'analytics', icon: '📈' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: '💼',
    items: [
      { label: 'Pipeline', path: '/sales', module: 'sales', icon: '💼' },
      { label: 'Marketing', path: '/marketing', module: 'marketing', icon: '📣' },
      { label: 'Support', path: '/support', module: 'support', icon: '🎧' },
      { label: 'Comms', path: '/comms', module: 'comms', icon: '✉️' },
    ],
  },
  {
    id: 'erp',
    label: 'ERP',
    icon: '📊',
    items: [
      { label: 'Accounting', path: '/accounting', module: 'accounting', icon: '📊' },
      { label: 'Inventory', path: '/inventory', module: 'inventory', icon: '📦' },
      { label: 'HR & Payroll', path: '/hr', module: 'hr', icon: '👥' },
      { label: 'Manufacturing', path: '/manufacturing', module: 'manufacturing', icon: '🏭' },
      { label: 'Warehouse', path: '/warehouse', module: 'warehouse', icon: '🏗️' },
      { label: 'Procurement', path: '/procurement', module: 'procurement', icon: '🛒' },
      { label: 'Assets', path: '/assets', module: 'assets', icon: '🏢' },
      { label: 'Quality', path: '/quality', module: 'quality', icon: '✅' },
    ],
  },
  {
    id: 'pos',
    label: 'POS',
    icon: '💳',
    items: [
      { label: 'Terminal', path: '/pos', module: 'pos', icon: '💳' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: '📋',
    items: [
      { label: 'Projects', path: '/projects', module: 'projects', icon: '📋' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '⚙️',
    items: [
      { label: 'Admin', path: '/admin', module: 'platform', icon: '⚙️' },
      { label: 'Theme Settings', path: '/admin/theme', module: 'platform', icon: '🎨' },
    ],
  },
];

const STORAGE_KEY = 'softcrm-nav-sections';

function loadExpandedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // ignore malformed data
  }
  return {};
}

function saveExpandedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path),
  );
}

export interface SidebarNavProps {
  collapsed: boolean;
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const { pathname } = useLocation();
  const { permissions } = useRbac();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const stored = loadExpandedState();
    // Auto-expand the section that contains the active route
    const initial: Record<string, boolean> = {};
    for (const section of NAV_SECTIONS) {
      initial[section.id] =
        stored[section.id] ?? sectionContainsPath(section, pathname);
    }
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveExpandedState(next);
      return next;
    });
  };

  const isItemVisible = (item: NavItem) => {
    if (item.module === '_home') return true;
    const mod = permissions[item.module];
    return mod && mod.access !== 'none';
  };

  // Filter sections: hide if all items are RBAC-hidden
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(isItemVisible),
  })).filter((section) => section.items.length > 0);

  // Separate admin (bottom) from the rest
  const mainSections = visibleSections.filter((s) => s.id !== 'admin');
  const adminSection = visibleSections.find((s) => s.id === 'admin');

  const collapsible = (section: NavSection) =>
    section.id !== 'core' && section.items.length > 1;

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'accent-gradient text-white'
            : 'text-gray-600 hover:glass-1 hover:text-gray-900',
          collapsed && 'justify-center px-2',
        )
      }
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const renderSection = (section: NavSection) => {
    const isCollapsible = collapsible(section);
    const isExpanded = expanded[section.id] ?? true;

    return (
      <div key={section.id} className="space-y-0.5">
        {/* Section header — shown only when sidebar is expanded */}
        {!collapsed && isCollapsible && (
          <button
            onClick={() => toggleSection(section.id)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:glass-1 hover:text-gray-600"
          >
            <span>{section.icon}</span>
            <span className="flex-1 text-left">{section.label}</span>
            <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
          </button>
        )}

        {/* Non-collapsible section label */}
        {!collapsed && !isCollapsible && section.id !== 'core' && (
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <span>{section.icon}</span>{' '}
            <span>{section.label}</span>
          </div>
        )}

        {/* Items */}
        {(isExpanded || !isCollapsible || collapsed) && (
          <div className="space-y-0.5">
            {section.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex flex-1 flex-col justify-between px-2 py-4">
      <div className="space-y-3">
        {mainSections.map(renderSection)}
      </div>

      {adminSection && (
        <div className="mt-auto border-t border-gray-200 pt-3">
          {renderSection(adminSection)}
        </div>
      )}
    </nav>
  );
}
