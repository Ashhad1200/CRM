import { useParams, Link } from 'react-router';
import { useCampaign, useCampaignMetrics } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  SENDING: 'bg-blue-100 text-blue-800',
  SENT: 'bg-green-100 text-green-800',
  PAUSED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function RateBar({ label, rate }: { label: string; rate: number }) {
  const pct = Math.min(100, Math.max(0, rate));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaignData, isLoading, error } = useCampaign(id ?? '');
  const { data: metricsData, isLoading: metricsLoading } = useCampaignMetrics(id ?? '');

  const campaign = campaignData?.data;
  const metrics = metricsData?.data;

  if (isLoading) return <p className="text-sm text-gray-500">Loading campaign...</p>;
  if (error) return <p className="text-sm text-red-600">Error: {(error as Error).message}</p>;
  if (!campaign) return <p className="text-sm text-gray-500">Campaign not found.</p>;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/marketing/campaigns"
        className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back to campaigns
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {campaign.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          <span>
            <span className="font-medium">Type:</span> {campaign.type}
          </span>
          {campaign.segment && (
            <span>
              <span className="font-medium">Segment:</span> {campaign.segment.name}
            </span>
          )}
          {campaign.scheduledAt && (
            <span>
              <span className="font-medium">Scheduled:</span>{' '}
              {new Date(campaign.scheduledAt).toLocaleString()}
            </span>
          )}
          {campaign.sentAt && (
            <span>
              <span className="font-medium">Sent:</span>{' '}
              {new Date(campaign.sentAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      {metricsLoading && <p className="text-sm text-gray-500">Loading metrics...</p>}
      {metrics && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total Sent" value={metrics.total} />
            <MetricCard
              label="Delivered"
              value={`${metrics.delivered}`}
              sub={metrics.total > 0 ? `${((metrics.delivered / metrics.total) * 100).toFixed(1)}%` : '—'}
            />
            <MetricCard label="Open Rate" value={`${metrics.openRate.toFixed(1)}%`} sub={`${metrics.opened} opened`} />
            <MetricCard label="Click Rate" value={`${metrics.clickRate.toFixed(1)}%`} sub={`${metrics.clicked} clicked`} />
            <MetricCard label="Bounce Rate" value={`${metrics.bounceRate.toFixed(1)}%`} sub={`${metrics.bounced} bounced`} />
            <MetricCard label="Unsubscribed" value={metrics.unsubscribed} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Engagement Rates</h2>
            <RateBar label="Open Rate" rate={metrics.openRate} />
            <RateBar label="Click Rate" rate={metrics.clickRate} />
            <RateBar label="Bounce Rate" rate={metrics.bounceRate} />
          </div>
        </>
      )}
    </div>
  );
}
