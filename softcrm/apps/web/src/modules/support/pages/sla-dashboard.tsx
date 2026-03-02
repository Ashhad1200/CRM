import { useQuery } from '@tanstack/react-query';
import { GlassCard, Badge, StatCard } from '@softcrm/ui';
import { apiClient } from '../../../lib/api-client.js';

interface SlaMetrics {
  totalTickets: number;
  withinSla: number;
  breached: number;
  atRisk: number;
  avgResponseMinutes: number;
  avgResolutionHours: number;
}

function useSlaMetrics() {
  return useQuery({
    queryKey: ['support', 'sla-metrics'],
    queryFn: () =>
      apiClient<{ data: SlaMetrics }>('/api/v1/support/sla/metrics').then((r) => r.data),
  });
}

function useAtRiskTickets() {
  return useQuery({
    queryKey: ['support', 'at-risk-tickets'],
    queryFn: () =>
      apiClient<{ data: Array<{
        id: string; ticketNumber: number; subject: string;
        priority: string; status: string; slaDeadline: string;
      }> }>('/api/v1/support/tickets?slaStatus=AT_RISK&limit=10').then((r) => r.data),
  });
}

export default function SlaDashboardPage() {
  const { data: metrics } = useSlaMetrics();
  const { data: atRisk = [] } = useAtRiskTickets();

  const slaRate = metrics && metrics.totalTickets > 0
    ? Math.round((metrics.withinSla / metrics.totalTickets) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SLA Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor service level compliance and response times
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="SLA Compliance" value={`${slaRate}%`} changeLabel={slaRate >= 90 ? 'On Track' : 'Below Target'} trend={slaRate >= 90 ? 'up' : 'down'} />
        <StatCard label="Avg Response Time" value={`${metrics?.avgResponseMinutes ?? 0}m`} />
        <StatCard label="Avg Resolution" value={`${metrics?.avgResolutionHours ?? 0}h`} />
        <StatCard label="Breached" value={metrics?.breached ?? 0} changeLabel={`${metrics?.atRisk ?? 0} at risk`} trend="down" />
      </div>

      {/* SLA Status Bar */}
      <GlassCard tier="medium" padding="lg">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">SLA Status Breakdown</h2>
        {metrics && metrics.totalTickets > 0 ? (
          <>
            <div className="flex h-6 rounded-full overflow-hidden">
              <div className="bg-green-500 transition-all" style={{ width: `${(metrics.withinSla / metrics.totalTickets) * 100}%` }} />
              <div className="bg-yellow-500 transition-all" style={{ width: `${(metrics.atRisk / metrics.totalTickets) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(metrics.breached / metrics.totalTickets) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Within SLA: {metrics.withinSla}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> At Risk: {metrics.atRisk}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Breached: {metrics.breached}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No tickets to display</p>
        )}
      </GlassCard>

      {/* At-Risk Tickets */}
      <GlassCard tier="subtle" padding="none">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">At-Risk Tickets</h2>
        </div>
        <div className="divide-y divide-white/10">
          {atRisk.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No at-risk tickets 🎉</div>
          ) : (
            atRisk.map((ticket) => {
              const deadline = new Date(ticket.slaDeadline);
              const minsLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000));
              return (
                <div key={ticket.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <Badge variant={ticket.priority === 'URGENT' ? 'danger' : 'warning'}>
                      {ticket.priority}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{ticket.ticketNumber} {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.status}</p>
                    </div>
                  </div>
                  <Badge variant={minsLeft < 30 ? 'danger' : 'warning'}>
                    {minsLeft}m left
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>
    </div>
  );
}
