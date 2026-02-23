/**
 * Comms module — domain types.
 *
 * Exported interfaces used across the comms module for type-safe
 * communication between service, repository, and route layers.
 */

// ── Activity types ─────────────────────────────────────────────────────────────

/** Activity with its optional CallLog relation. */
export interface ActivityWithCallLog {
  id: string;
  tenantId: string;
  type: string;
  direction: string;
  contactId: string | null;
  dealId: string | null;
  ticketId: string | null;
  accountId: string | null;
  subject: string | null;
  body: string | null;
  metadata: unknown;
  timestamp: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  callLog?: {
    id: string;
    tenantId: string;
    activityId: string;
    provider: string;
    callSid: string | null;
    fromNumber: string;
    toNumber: string;
    duration: number;
    recordingUrl: string | null;
    status: string;
  } | null;
}

/** Filter parameters for listing activities. */
export interface ActivityFilters {
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  accountId?: string;
  type?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Filter parameters for email templates. */
export interface TemplateFilters {
  search?: string;
  isActive?: boolean;
}

/** Simplified activity for timeline display. */
export interface TimelineEntry {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  body: string | null;
  timestamp: Date;
  createdBy: string;
  contactId: string | null;
  dealId: string | null;
  ticketId: string | null;
  accountId: string | null;
  callLog?: {
    fromNumber: string;
    toNumber: string;
    duration: number;
    status: string;
  } | null;
}
