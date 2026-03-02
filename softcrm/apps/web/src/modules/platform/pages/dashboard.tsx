import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../providers/auth-provider';

interface DashboardStats {
  contacts: number;
  deals: number;
  tickets: number;
  invoices: number;
  projects: number;
  products: number;
}

interface RecentDeal {
  id: string;
  name: string;
  value: number;
  stage: string;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
}

const STAT_CARDS = [
  { key: 'contacts' as const, label: 'Contacts', icon: '👥', link: '/sales/contacts', color: 'bg-blue-50 text-blue-700' },
  { key: 'deals' as const, label: 'Open Deals', icon: '💼', link: '/sales/pipeline', color: 'bg-green-50 text-green-700' },
  { key: 'tickets' as const, label: 'Open Tickets', icon: '🎧', link: '/support/tickets', color: 'bg-orange-50 text-orange-700' },
  { key: 'invoices' as const, label: 'Invoices', icon: '📄', link: '/accounting/invoices', color: 'bg-purple-50 text-purple-700' },
  { key: 'projects' as const, label: 'Projects', icon: '📋', link: '/projects', color: 'bg-indigo-50 text-indigo-700' },
  { key: 'products' as const, label: 'Products', icon: '📦', link: '/inventory/products', color: 'bg-teal-50 text-teal-700' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    contacts: 0, deals: 0, tickets: 0, invoices: 0, projects: 0, products: 0,
  });
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Load counts in parallel — each endpoint returns { data: [], meta: { total } }
        const [contacts, deals, tickets, invoices, projects, products] = await Promise.allSettled([
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/sales/contacts?page=1&limit=1'),
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/sales/deals?page=1&limit=5'),
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/support/tickets?page=1&limit=5'),
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/accounting/invoices?page=1&limit=1'),
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/projects?page=1&limit=1'),
          apiClient<{ meta?: { total: number }; data: unknown[] }>('/api/v1/inventory/products?page=1&limit=1'),
        ]);

        const getTotal = (r: PromiseSettledResult<{ meta?: { total: number }; data: unknown[] }>) =>
          r.status === 'fulfilled' ? (r.value.meta?.total ?? r.value.data?.length ?? 0) : 0;

        setStats({
          contacts: getTotal(contacts),
          deals: getTotal(deals),
          tickets: getTotal(tickets),
          invoices: getTotal(invoices),
          projects: getTotal(projects),
          products: getTotal(products),
        });

        // Extract recent deals and tickets
        if (deals.status === 'fulfilled' && Array.isArray(deals.value.data)) {
          setRecentDeals(
            deals.value.data.slice(0, 5).map((d: any) => ({
              id: d.id,
              name: d.name ?? d.title ?? 'Untitled',
              value: d.value ?? d.amount ?? 0,
              stage: d.stage ?? d.status ?? 'Unknown',
            })),
          );
        }

        if (tickets.status === 'fulfilled' && Array.isArray(tickets.value.data)) {
          setRecentTickets(
            tickets.value.data.slice(0, 5).map((t: any) => ({
              id: t.id,
              subject: t.subject ?? t.title ?? 'No subject',
              status: t.status ?? 'Unknown',
              priority: t.priority ?? 'medium',
            })),
          );
        }
      } catch {
        // Dashboard is best-effort
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.name ?? user?.email?.split('@')[0] ?? 'there'}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your CRM.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.key}
            to={card.link}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-base ${card.color}`}>
                {card.icon}
              </span>
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                stats[card.key].toLocaleString()
              )}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent activity section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Deals */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Deals</h3>
            <Link to="/sales/pipeline" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : recentDeals.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">No deals yet</p>
            ) : (
              recentDeals.map((deal) => (
                <Link
                  key={deal.id}
                  to={`/sales/deals/${deal.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.name}</p>
                    <p className="text-xs text-gray-500">{deal.stage}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    ${deal.value.toLocaleString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Tickets</h3>
            <Link to="/support/tickets" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : recentTickets.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">No tickets yet</p>
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/support/tickets/${ticket.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-500">{ticket.status}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      ticket.priority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : ticket.priority === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : ticket.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/sales/contacts" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            👥 Add Contact
          </Link>
          <Link to="/sales/pipeline" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            💼 New Deal
          </Link>
          <Link to="/support/tickets" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            🎧 Create Ticket
          </Link>
          <Link to="/accounting/invoices" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            📄 New Invoice
          </Link>
          <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            📋 New Project
          </Link>
          <Link to="/marketing/campaigns/new" className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
            📣 New Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
