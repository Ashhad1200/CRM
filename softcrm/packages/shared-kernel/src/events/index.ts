/**
 * Domain Event interface and event type registry.
 *
 * All inter-module communication happens through domain events published
 * to the BullMQ event bus. Events are persisted via the outbox pattern
 * for guaranteed at-least-once delivery.
 */

// ── Domain Event Interface ─────────────────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  /** UUID v7 (time-ordered, globally unique) */
  readonly id: string;
  /** Event type discriminator (e.g., "deal.won") */
  readonly type: EventType;
  /** Tenant this event belongs to */
  readonly tenantId: string;
  /** User who triggered the event */
  readonly actorId: string;
  /** ID of the aggregate that changed */
  readonly aggregateId: string;
  /** Type of the aggregate (e.g., "Deal", "Invoice") */
  readonly aggregateType: string;
  /** Event-specific payload data */
  readonly payload: T;
  /** Correlation ID for tracing across modules */
  readonly correlationId: string;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Schema version for event evolution */
  readonly version: number;
}

// ── Event Type Registry ────────────────────────────────────────────────────────
// All 19 events from the spec cross-module integration map.

export const EventTypes = {
  // Sales events
  LEAD_CREATED: 'lead.created',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_CONVERTED: 'lead.converted',
  DEAL_CREATED: 'deal.created',
  DEAL_STAGE_CHANGED: 'deal.stage_changed',
  DEAL_WON: 'deal.won',
  DEAL_LOST: 'deal.lost',
  QUOTE_ACCEPTED: 'quote.accepted',
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',

  // Accounting events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  PAYMENT_RECEIVED: 'payment.received',

  // Support events
  TICKET_CREATED: 'ticket.created',
  TICKET_RESOLVED: 'ticket.resolved',
  TICKET_SLA_BREACHED: 'ticket.sla_breached',

  // Inventory events
  STOCK_LOW: 'stock.low',
  ORDER_FULFILLED: 'order.fulfilled',

  // Comms events
  EMAIL_RECEIVED: 'email.received',
  CALL_COMPLETED: 'call.completed',

  // Marketing events
  CAMPAIGN_SENT: 'campaign.sent',

  // Analytics events
  DASHBOARD_METRICS_UPDATED: 'dashboard.metrics_updated',

  // Projects events
  PROJECT_CREATED: 'project.created',
  MILESTONE_COMPLETED: 'milestone.completed',
  TIME_LOGGED: 'time.logged',

  // Workflow events
  WORKFLOW_EXECUTED: 'workflow.executed',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// ── Event Payload Types ────────────────────────────────────────────────────────

export interface DealWonPayload {
  dealId: string;
  contactId: string;
  accountId: string;
  amount: { amount: string; currency: string };
  products: Array<{ productId: string; quantity: number; unitPrice: string }>;
}

export interface DealStageChangedPayload {
  dealId: string;
  fromStage: string;
  toStage: string;
}

export interface LeadConvertedPayload {
  leadId: string;
  contactId: string;
  accountId: string;
  dealId: string;
}

export interface InvoicePaidPayload {
  invoiceId: string;
  dealId: string;
  amount: { amount: string; currency: string };
  paymentMethod: string;
}

export interface TicketCreatedPayload {
  ticketId: string;
  contactId: string;
  subject: string;
  priority: string;
}

export interface StockLowPayload {
  productId: string;
  currentLevel: number;
  reorderPoint: number;
  sku: string;
}

// ── Helper to create events ────────────────────────────────────────────────────

export type CreateEventInput<T> = Omit<DomainEvent<T>, 'id' | 'timestamp' | 'version'> & {
  version?: number;
};

/**
 * Validate that a value is a known EventType.
 */
export function isValidEventType(type: string): type is EventType {
  return Object.values(EventTypes).includes(type as EventType);
}
