/**
 * Marketing module — domain types.
 *
 * Exported interfaces used across the marketing module for type-safe
 * communication between service, repository, and route layers.
 */

// ── Segment types ──────────────────────────────────────────────────────────────

/** Segment with all fields including member count. */
export interface SegmentWithCount {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  criteria: unknown;
  isDynamic: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Campaign types ─────────────────────────────────────────────────────────────

/** Campaign with its optional segment relation loaded. */
export interface CampaignWithSegment {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  segmentId: string | null;
  subjectA: string;
  subjectB: string | null;
  bodyHtml: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  segment: SegmentWithCount | null;
}

/** Campaign with recipients relation loaded. */
export interface CampaignWithRecipients extends CampaignWithSegment {
  recipients: Array<{
    id: string;
    contactId: string;
    variant: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    bouncedAt: Date | null;
    unsubscribedAt: Date | null;
  }>;
}

/** Aggregate campaign engagement metrics. */
export interface CampaignMetrics {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

/** Multi-touch revenue attribution result per campaign. */
export interface AttributionResult {
  campaignId: string;
  campaignName: string;
  dealCount: number;
  firstTouchRevenue: number;
  lastTouchRevenue: number;
  linearRevenue: number;
}

// ── Filter interfaces ──────────────────────────────────────────────────────────

export interface SegmentFilters {
  search?: string;
  isDynamic?: boolean;
}

export interface CampaignFilters {
  status?: string;
  type?: string;
  segmentId?: string;
  search?: string;
}
