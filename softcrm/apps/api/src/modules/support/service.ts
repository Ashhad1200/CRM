/**
 * Support module — ticket service (business-logic layer).
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';

import type {
  TicketFilters,
  PaginationInput,
} from './types.js';
import type {
  CreateTicketInput,
  AddReplyInput,
} from './validators.js';
import { logger } from '../../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Ticket CRUD ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new support ticket.
 *
 * - Auto-assigns an agent via round-robin (fewest open tickets).
 * - Looks up SLA policy by priority and computes slaDeadline.
 * - Publishes `ticket.created` event.
 */
export async function createTicket(
  tenantId: string,
  data: CreateTicketInput,
  actorId: string,
) {
  const db = getPrismaClient();
  const ticketId = generateId();
  const ticketNumber = await repo.getNextTicketNumber(tenantId);
  const priority = data.priority ?? 'MEDIUM';

  // ── Auto-assign agent (round-robin: fewest open tickets) ─────────────────
  let assignedAgentId: string | null = null;
  try {
    const agents = await db.userRole.findMany({
      where: {
        role: { modulePermissions: { some: { module: 'support' } } },
        user: { tenantId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (agents.length > 0) {
      const agentIds = agents.map((a) => a.userId);

      // Count open tickets per agent
      const openCounts = await db.ticket.groupBy({
        by: ['assignedAgentId'],
        where: {
          tenantId,
          assignedAgentId: { in: agentIds },
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL'] as never },
        },
        _count: { id: true },
      });

      const countMap = new Map(
        openCounts.map((c) => [c.assignedAgentId, c._count.id]),
      );

      // Pick agent with fewest open tickets (default 0 for unassigned agents)
      let minCount = Infinity;
      for (const agentId of agentIds) {
        const count = countMap.get(agentId) ?? 0;
        if (count < minCount) {
          minCount = count;
          assignedAgentId = agentId;
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Auto-assign failed, ticket will be unassigned');
  }

  // ── SLA policy lookup ────────────────────────────────────────────────────
  let slaPolicyId: string | null = null;
  let slaDeadline: Date | null = null;

  const slaPolicy = await repo.findSlaPolicy(tenantId, priority);
  if (slaPolicy) {
    slaPolicyId = slaPolicy.id;
    slaDeadline = new Date(Date.now() + slaPolicy.resolutionMinutes * 60_000);
  }

  // ── Create the ticket ────────────────────────────────────────────────────
  const ticket = await repo.createTicket(tenantId, {
    ...data,
    id: ticketId,
    ticketNumber,
    priority,
    assignedAgentId,
    slaPolicyId,
    slaDeadline,
    createdBy: actorId,
  });

  // ── Publish event ────────────────────────────────────────────────────────
  await events.publishTicketCreated(tenantId, actorId, {
    id: ticket.id,
    contactId: ticket.contactId,
    subject: ticket.subject,
    priority: ticket.priority,
  });

  return ticket;
}

/**
 * Add a reply to a ticket.
 *
 * - If authorType is AGENT and firstResponseAt is null, sets firstResponseAt.
 * - Updates ticket status to IN_PROGRESS.
 */
export async function addReply(
  tenantId: string,
  ticketId: string,
  data: AddReplyInput,
  actorId: string,
) {
  const ticket = await repo.findTicket(tenantId, ticketId);

  const reply = await repo.createReply(ticketId, {
    ...data,
    authorId: actorId,
  });

  // If this is an agent reply and first response hasn't been recorded
  const authorType = data.authorType ?? 'AGENT';
  if (authorType === 'AGENT' && !ticket.firstResponseAt) {
    await repo.updateTicket(tenantId, ticketId, {
      firstResponseAt: new Date(),
      status: 'IN_PROGRESS',
    });
  } else if (authorType === 'AGENT' && ticket.status === 'WAITING_CUSTOMER') {
    await repo.updateTicket(tenantId, ticketId, {
      status: 'IN_PROGRESS',
    });
  }

  return reply;
}

/**
 * Resolve a ticket.
 *
 * - Validates ticket is not already RESOLVED or CLOSED.
 * - Sets resolvedAt, status = RESOLVED.
 * - Publishes ticket.resolved event.
 * - Creates a CSAT survey record.
 */
export async function resolveTicket(
  tenantId: string,
  ticketId: string,
  actorId: string,
) {
  const ticket = await repo.findTicket(tenantId, ticketId);

  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    throw new ValidationError(`Ticket is already ${ticket.status}`);
  }

  const now = new Date();
  const updated = await repo.updateTicket(tenantId, ticketId, {
    status: 'RESOLVED',
    resolvedAt: now,
  });

  // Publish event
  await events.publishTicketResolved(tenantId, actorId, {
    id: updated.id,
    contactId: updated.contactId,
    subject: updated.subject,
    resolvedAt: now,
  });

  // Create CSAT survey
  try {
    await repo.createCsatSurvey(tenantId, ticketId);
  } catch (err) {
    // CSAT survey might already exist (unique constraint); log and continue
    logger.warn({ err, ticketId }, 'Failed to create CSAT survey');
  }

  return updated;
}

/**
 * Close a ticket.
 *
 * - Validates ticket is RESOLVED.
 * - Sets closedAt, status = CLOSED.
 */
export async function closeTicket(
  tenantId: string,
  ticketId: string,
  _actorId: string,
) {
  const ticket = await repo.findTicket(tenantId, ticketId);

  if (ticket.status !== 'RESOLVED') {
    throw new ValidationError('Ticket must be RESOLVED before closing');
  }

  return repo.updateTicket(tenantId, ticketId, {
    status: 'CLOSED',
    closedAt: new Date(),
  });
}

/**
 * Escalate a ticket.
 *
 * - Reassigns to the next available agent (fewest open tickets, excluding current).
 * - Publishes ticket.sla_breached event.
 */
export async function escalateTicket(
  tenantId: string,
  ticketId: string,
  actorId: string,
  _reason?: string,
) {
  const db = getPrismaClient();
  const ticket = await repo.findTicket(tenantId, ticketId);

  // Find next agent (fewest open tickets, excluding current assignee)
  let newAgentId: string | null = null;
  try {
    const agents = await db.userRole.findMany({
      where: {
        role: { modulePermissions: { some: { module: 'support' } } },
        user: { tenantId },
        ...(ticket.assignedAgentId
          ? { userId: { not: ticket.assignedAgentId } }
          : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (agents.length > 0) {
      const agentIds = agents.map((a) => a.userId);
      const openCounts = await db.ticket.groupBy({
        by: ['assignedAgentId'],
        where: {
          tenantId,
          assignedAgentId: { in: agentIds },
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL'] as never },
        },
        _count: { id: true },
      });

      const countMap = new Map(
        openCounts.map((c) => [c.assignedAgentId, c._count.id]),
      );

      let minCount = Infinity;
      for (const agentId of agentIds) {
        const count = countMap.get(agentId) ?? 0;
        if (count < minCount) {
          minCount = count;
          newAgentId = agentId;
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Escalation re-assign failed');
  }

  const updated = await repo.updateTicket(tenantId, ticketId, {
    assignedAgentId: newAgentId,
    priority: 'URGENT',
  });

  await events.publishTicketSlaBreached(tenantId, actorId, {
    id: updated.id,
    contactId: updated.contactId,
    subject: updated.subject,
    slaDeadline: updated.slaDeadline,
  });

  return updated;
}

/**
 * Reopen a resolved or closed ticket.
 *
 * - Validates ticket is RESOLVED or CLOSED.
 * - Resets status to OPEN, clears resolvedAt/closedAt.
 */
export async function reopenTicket(
  tenantId: string,
  ticketId: string,
  _actorId: string,
) {
  const ticket = await repo.findTicket(tenantId, ticketId);

  if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
    throw new ValidationError('Only RESOLVED or CLOSED tickets can be reopened');
  }

  return repo.updateTicket(tenantId, ticketId, {
    status: 'OPEN',
    resolvedAt: null,
    closedAt: null,
  });
}

/**
 * Check for SLA breaches and auto-escalate.
 *
 * Finds tickets past their SLA deadline that are still open/in-progress.
 */
export async function checkSlaBreaches(tenantId: string, actorId: string) {
  const breached = await repo.findBreachedTickets(tenantId);
  const results: string[] = [];

  for (const ticket of breached) {
    try {
      await escalateTicket(tenantId, ticket.id, actorId);
      results.push(ticket.id);
    } catch (err) {
      logger.warn({ err, ticketId: ticket.id }, 'Failed to escalate breached ticket');
    }
  }

  return { escalated: results.length, ticketIds: results };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Ticket Queries ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Get a single ticket with replies and SLA policy. */
export async function getTicket(tenantId: string, id: string) {
  return repo.findTicket(tenantId, id);
}

/** Get tickets with filters and pagination. */
export async function getTickets(
  tenantId: string,
  filters: TicketFilters,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findTickets(tenantId, filters, pagination);
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

/** Get replies for a ticket. */
export async function getTicketReplies(tenantId: string, ticketId: string) {
  // Validate ticket exists/belongs to tenant
  await repo.findTicket(tenantId, ticketId);
  return repo.findRepliesByTicket(ticketId);
}
