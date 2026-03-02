import { NavLink, Outlet } from 'react-router';

export interface ModuleTab {
  label: string;
  to: string;
  /** If true, only mark active for exact match */
  end?: boolean;
}

interface ModuleLayoutProps {
  title: string;
  tabs: ModuleTab[];
}

export function ModuleLayout({ title, tabs }: ModuleLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Module header + tab bar */}
      <div className="shrink-0 border-b border-gray-200 bg-white -mx-6 -mt-6 px-6 pt-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        <nav className="flex gap-1 -mb-px" aria-label={`${title} navigation`}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Module content */}
      <div className="flex-1 overflow-auto pt-6">
        <Outlet />
      </div>
    </div>
  );
}
