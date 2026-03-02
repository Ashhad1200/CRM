import { useMemo } from 'react';
import { useLocation } from 'react-router';
import type { BreadcrumbItem } from '@softcrm/ui';

/** Module route configuration */
interface ModuleConfig {
  label: string;
  icon?: string;
}

/** Sub-route configuration */
interface SubRouteConfig {
  label: string;
  /** If true, treat next segment as ID */
  hasId?: boolean;
  /** Label pattern for ID (uses segment as ID) */
  idLabel?: (id: string) => string;
}

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  // Core modules
  sales: { label: 'Sales', icon: '💰' },
  accounting: { label: 'Accounting', icon: '📊' },
  support: { label: 'Support', icon: '🎧' },
  marketing: { label: 'Marketing', icon: '📣' },
  inventory: { label: 'Inventory', icon: '📦' },
  projects: { label: 'Projects', icon: '📁' },
  analytics: { label: 'Analytics', icon: '📈' },
  admin: { label: 'Admin', icon: '⚙️' },
  comms: { label: 'Communications', icon: '💬' },

  // Extended modules
  hr: { label: 'HR', icon: '👥' },
  warehouse: { label: 'Warehouse', icon: '🏭' },
  manufacturing: { label: 'Manufacturing', icon: '🔧' },
  procurement: { label: 'Procurement', icon: '🛒' },
  pos: { label: 'Point of Sale', icon: '💳' },
  assets: { label: 'Assets', icon: '🏢' },
  quality: { label: 'Quality Control', icon: '✅' },
};

const SUB_ROUTES: Record<string, Record<string, SubRouteConfig>> = {
  sales: {
    pipeline: { label: 'Pipeline' },
    deals: { label: 'Deals', hasId: true, idLabel: (id) => `Deal #${id}` },
    contacts: { label: 'Contacts', hasId: true, idLabel: (id) => `Contact #${id}` },
    companies: { label: 'Companies', hasId: true, idLabel: (id) => `Company #${id}` },
  },
  accounting: {
    invoices: { label: 'Invoices', hasId: true, idLabel: (id) => `Invoice #${id}` },
    payments: { label: 'Payments' },
    ledger: { label: 'Ledger' },
    reports: { label: 'Reports' },
  },
  support: {
    tickets: { label: 'Tickets', hasId: true, idLabel: (id) => `Ticket #${id}` },
    inbox: { label: 'Inbox' },
    knowledge: { label: 'Knowledge Base' },
  },
  marketing: {
    campaigns: { label: 'Campaigns', hasId: true, idLabel: (id) => `Campaign #${id}` },
    templates: { label: 'Templates' },
    audiences: { label: 'Audiences' },
  },
  inventory: {
    products: { label: 'Products', hasId: true, idLabel: (id) => `Product #${id}` },
    categories: { label: 'Categories' },
    stock: { label: 'Stock Levels' },
  },
  projects: {
    boards: { label: 'Boards', hasId: true, idLabel: (id) => `Board #${id}` },
    tasks: { label: 'Tasks' },
    timeline: { label: 'Timeline' },
  },
  analytics: {
    dashboard: { label: 'Dashboard' },
    reports: { label: 'Reports' },
    exports: { label: 'Exports' },
  },
  hr: {
    employees: { label: 'Employees', hasId: true, idLabel: (id) => `Employee #${id}` },
    payroll: { label: 'Payroll' },
    leave: { label: 'Leave Management' },
    attendance: { label: 'Attendance' },
  },
  warehouse: {
    stock: { label: 'Stock', hasId: true, idLabel: (id) => `Lot #${id}` },
    locations: { label: 'Locations' },
    shipments: { label: 'Shipments', hasId: true, idLabel: (id) => `Shipment #${id}` },
    receive: { label: 'Receive Stock' },
  },
  manufacturing: {
    'work-orders': { label: 'Work Orders', hasId: true, idLabel: (id) => `WO #${id}` },
    bom: { label: 'Bill of Materials' },
    routing: { label: 'Routing' },
  },
  procurement: {
    vendors: { label: 'Vendors', hasId: true, idLabel: (id) => `Vendor #${id}` },
    'purchase-orders': { label: 'Purchase Orders', hasId: true, idLabel: (id) => `PO #${id}` },
    requisitions: { label: 'Requisitions' },
  },
  pos: {
    register: { label: 'Register' },
    transactions: { label: 'Transactions' },
    settings: { label: 'Settings' },
  },
  assets: {
    items: { label: 'Asset Items', hasId: true, idLabel: (id) => `Asset #${id}` },
    maintenance: { label: 'Maintenance' },
    depreciation: { label: 'Depreciation' },
  },
  quality: {
    inspections: { label: 'Inspections', hasId: true, idLabel: (id) => `Inspection #${id}` },
    ncr: { label: 'NCRs' },
    capa: { label: 'CAPA' },
  },
};

/**
 * Hook that generates breadcrumb items based on current route
 */
export function useBreadcrumb(): BreadcrumbItem[] {
  const location = useLocation();

  return useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Home', href: '/', icon: '🏠' }];

    if (segments.length === 0) {
      // We're on the home/dashboard page
      return items;
    }

    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      currentPath += `/${segment}`;

      // First segment is the module
      if (i === 0) {
        const moduleConfig = MODULE_CONFIG[segment];
        if (moduleConfig) {
          items.push({
            label: moduleConfig.label,
            href: currentPath,
            icon: moduleConfig.icon,
          });
        } else {
          // Unknown module, just capitalize
          items.push({
            label: segment.charAt(0).toUpperCase() + segment.slice(1),
            href: currentPath,
          });
        }
        continue;
      }

      // Subsequent segments are sub-routes
      const parentModule = segments[0]!;
      const subRoutes = SUB_ROUTES[parentModule];
      const subRouteConfig = subRoutes?.[segment];

      if (subRouteConfig) {
        // Check if next segment is an ID
        if (subRouteConfig.hasId && i + 1 < segments.length) {
          // Add the section first
          items.push({
            label: subRouteConfig.label,
            href: currentPath,
          });

          // Then add the ID item
          const idSegment = segments[i + 1]!;
          currentPath += `/${idSegment}`;
          items.push({
            label: subRouteConfig.idLabel?.(idSegment) ?? `#${idSegment}`,
            href: currentPath,
          });
          i++; // Skip the ID segment in next iteration
        } else {
          items.push({
            label: subRouteConfig.label,
            href: currentPath,
          });
        }
      } else {
        // Check if this might be an action or unknown segment
        if (segment === 'new') {
          items.push({ label: 'New', href: currentPath });
        } else if (segment === 'edit') {
          items.push({ label: 'Edit', href: currentPath });
        } else if (/^[a-f0-9-]{36}$/i.test(segment) || /^\d+$/.test(segment)) {
          // Looks like a UUID or numeric ID
          const prevConfig = subRoutes?.[segments[i - 1] ?? ''];
          const label = prevConfig?.idLabel?.(segment) ?? `#${segment.slice(0, 8)}...`;
          items.push({ label, href: currentPath });
        } else {
          // Unknown segment, just capitalize
          items.push({
            label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
            href: currentPath,
          });
        }
      }
    }

    // Remove href from last item (current page)
    if (items.length > 0) {
      const lastItem = items[items.length - 1]!;
      items[items.length - 1] = { ...lastItem, href: undefined };
    }

    return items;
  }, [location.pathname]);
}
