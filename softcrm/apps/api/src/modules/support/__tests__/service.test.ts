import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockGetNextTicketNumber = vi.fn();
const mockCreateTicket = vi.fn();
const mockFindTicket = vi.fn();
const mockFindTickets = vi.fn();
const mockUpdateTicket = vi.fn();
const mockCreateReply = vi.fn();
const mockFindRepliesByTicket = vi.fn();
const mockFindSlaPolicy = vi.fn();
const mockFindBreachedTickets = vi.fn();
const mockCreateCsatSurvey = vi.fn();
const mockFindCsatByTicket = vi.fn();

vi.mock('../repository.js', () => ({
  getNextTicketNumber: (...args: unknown[]) => mockGetNextTicketNumber(...args),
  createTicket: (...args: unknown[]) => mockCreateTicket(...args),
  findTicket: (...args: unknown[]) => mockFindTicket(...args),
  findTickets: (...args: unknown[]) => mockFindTickets(...args),
  updateTicket: (...args: unknown[]) => mockUpdateTicket(...args),
  createReply: (...args: unknown[]) => mockCreateReply(...args),
  findRepliesByTicket: (...args: unknown[]) => mockFindRepliesByTicket(...args),
  findSlaPolicy: (...args: unknown[]) => mockFindSlaPolicy(...args),
  findBreachedTickets: (...args: unknown[]) => mockFindBreachedTickets(...args),
  createCsatSurvey: (...args: unknown[]) => mockCreateCsatSurvey(...args),
  findCsatByTicket: (...args: unknown[]) => mockFindCsatByTicket(...args),
}));

const mockPublishTicketCreated = vi.fn();
const mockPublishTicketResolved = vi.fn();
const mockPublishTicketSlaBreached = vi.fn();

vi.mock('../events.js', () => ({
  publishTicketCreated: (...args: unknown[]) => mockPublishTicketCreated(...args),
  publishTicketResolved: (...args: unknown[]) => mockPublishTicketResolved(...args),
  publishTicketSlaBreached: (...args: unknown[]) => mockPublishTicketSlaBreached(...args),
}));

const mockUserRoleFindMany = vi.fn();
const mockTicketGroupBy = vi.fn();

const mockPrisma = {
  userRole: { findMany: mockUserRoleFindMany },
  ticket: { groupBy: mockTicketGroupBy },
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

vi.mock('../../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createTicket,
  addReply,
  resolveTicket,
  closeTicket,
  escalateTicket,
  reopenTicket,
  getTicket,
  getTickets,
  getTicketReplies,
} from '../service.js';
import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'actor-1';

const sampleTicket = {
  id: 'ticket-1',
  tenantId: TENANT_ID,
  ticketNumber: 1001,
  subject: 'Cannot login',
  description: 'Help me',
  priority: 'MEDIUM',
  status: 'OPEN',
  channel: 'EMAIL',
  contactId: 'contact-1',
  accountId: null,
  assignedAgentId: 'agent-1',
  slaPolicyId: 'sla-1',
  slaDeadline: new Date('2025-12-31'),
  firstResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  tags: [],
  createdBy: ACTOR_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  replies: [],
  slaPolicy: {
    id: 'sla-1',
    name: 'Standard',
    priority: 'MEDIUM',
    firstResponseMinutes: 60,
    resolutionMinutes: 480,
  },
};

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createTicket ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createTicket', () => {
  const input = {
    subject: 'Cannot login',
    description: 'Help me',
    contactId: 'contact-1',
    channel: 'EMAIL' as const,
  };

  beforeEach(() => {
    mockGetNextTicketNumber.mockResolvedValue(1001);
    mockUserRoleFindMany.mockResolvedValue([{ userId: 'agent-1' }, { userId: 'agent-2' }]);
    mockTicketGroupBy.mockResolvedValue([
      { assignedAgentId: 'agent-1', _count: { id: 3 } },
      { assignedAgentId: 'agent-2', _count: { id: 1 } },
    ]);
    mockFindSlaPolicy.mockResolvedValue({
      id: 'sla-1',
      resolutionMinutes: 480,
    });
    mockCreateTicket.mockResolvedValue(sampleTicket);
    mockPublishTicketCreated.mockResolvedValue(undefined);
  });

  it('creates a ticket with default fields', async () => {
    const result = await createTicket(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        id: 'generated-id',
        ticketNumber: 1001,
        subject: 'Cannot login',
        priority: 'MEDIUM',
        createdBy: ACTOR_ID,
      }),
    );
    expect(result).toEqual(sampleTicket);
  });

  it('auto-assigns the agent with fewest open tickets', async () => {
    await createTicket(TENANT_ID, input, ACTOR_ID);

    // agent-2 has 1 open ticket vs agent-1 with 3
    expect(mockCreateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        assignedAgentId: 'agent-2',
      }),
    );
  });

  it('applies SLA policy and computes deadline', async () => {
    await createTicket(TENANT_ID, input, ACTOR_ID);

    expect(mockFindSlaPolicy).toHaveBeenCalledWith(TENANT_ID, 'MEDIUM');
    expect(mockCreateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        slaPolicyId: 'sla-1',
        slaDeadline: expect.any(Date),
      }),
    );
  });

  it('publishes ticket.created event', async () => {
    await createTicket(TENANT_ID, input, ACTOR_ID);

    expect(mockPublishTicketCreated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: sampleTicket.id,
        contactId: sampleTicket.contactId,
        subject: sampleTicket.subject,
        priority: sampleTicket.priority,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── addReply ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('addReply', () => {
  const replyInput = {
    body: 'Here is the fix',
    authorType: 'AGENT' as const,
  };

  const sampleReply = {
    id: 'reply-1',
    ticketId: 'ticket-1',
    authorId: ACTOR_ID,
    authorType: 'AGENT',
    body: 'Here is the fix',
    attachments: null,
    isInternal: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket });
    mockCreateReply.mockResolvedValue(sampleReply);
    mockUpdateTicket.mockResolvedValue({ ...sampleTicket, status: 'IN_PROGRESS' });
  });

  it('adds a reply to the ticket', async () => {
    const result = await addReply(TENANT_ID, 'ticket-1', replyInput, ACTOR_ID);

    expect(mockCreateReply).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({
        body: 'Here is the fix',
        authorId: ACTOR_ID,
      }),
    );
    expect(result).toEqual(sampleReply);
  });

  it('sets firstResponseAt on first agent reply', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, firstResponseAt: null });

    await addReply(TENANT_ID, 'ticket-1', replyInput, ACTOR_ID);

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        firstResponseAt: expect.any(Date),
        status: 'IN_PROGRESS',
      }),
    );
  });

  it('updates status from WAITING_CUSTOMER when agent replies', async () => {
    mockFindTicket.mockResolvedValue({
      ...sampleTicket,
      status: 'WAITING_CUSTOMER',
      firstResponseAt: new Date(),
    });

    await addReply(TENANT_ID, 'ticket-1', replyInput, ACTOR_ID);

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        status: 'IN_PROGRESS',
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── resolveTicket ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('resolveTicket', () => {
  beforeEach(() => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'OPEN' });
    mockUpdateTicket.mockResolvedValue({
      ...sampleTicket,
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });
    mockPublishTicketResolved.mockResolvedValue(undefined);
    mockCreateCsatSurvey.mockResolvedValue(undefined);
  });

  it('resolves an open ticket', async () => {
    const result = await resolveTicket(TENANT_ID, 'ticket-1', ACTOR_ID);

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe('RESOLVED');
  });

  it('publishes ticket.resolved event and creates CSAT survey', async () => {
    await resolveTicket(TENANT_ID, 'ticket-1', ACTOR_ID);

    expect(mockPublishTicketResolved).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: sampleTicket.id,
      }),
    );
    expect(mockCreateCsatSurvey).toHaveBeenCalledWith(TENANT_ID, 'ticket-1');
  });

  it('throws ValidationError if ticket is already RESOLVED', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'RESOLVED' });

    await expect(
      resolveTicket(TENANT_ID, 'ticket-1', ACTOR_ID),
    ).rejects.toThrow(ValidationError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── closeTicket ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('closeTicket', () => {
  it('closes a resolved ticket', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'RESOLVED' });
    mockUpdateTicket.mockResolvedValue({
      ...sampleTicket,
      status: 'CLOSED',
      closedAt: new Date(),
    });

    const result = await closeTicket(TENANT_ID, 'ticket-1', ACTOR_ID);

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        status: 'CLOSED',
        closedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe('CLOSED');
  });

  it('throws ValidationError if ticket is not RESOLVED', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'OPEN' });

    await expect(
      closeTicket(TENANT_ID, 'ticket-1', ACTOR_ID),
    ).rejects.toThrow(ValidationError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── escalateTicket ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('escalateTicket', () => {
  beforeEach(() => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, assignedAgentId: 'agent-1' });
    mockUserRoleFindMany.mockResolvedValue([{ userId: 'agent-2' }, { userId: 'agent-3' }]);
    mockTicketGroupBy.mockResolvedValue([
      { assignedAgentId: 'agent-2', _count: { id: 2 } },
      { assignedAgentId: 'agent-3', _count: { id: 0 } },
    ]);
    mockUpdateTicket.mockResolvedValue({
      ...sampleTicket,
      assignedAgentId: 'agent-3',
      priority: 'URGENT',
      contactId: 'contact-1',
      slaDeadline: sampleTicket.slaDeadline,
    });
    mockPublishTicketSlaBreached.mockResolvedValue(undefined);
  });

  it('escalates and reassigns to agent with fewest tickets', async () => {
    const result = await escalateTicket(TENANT_ID, 'ticket-1', ACTOR_ID, 'SLA breach');

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        priority: 'URGENT',
      }),
    );
    expect(result.priority).toBe('URGENT');
  });

  it('publishes SLA breach event', async () => {
    await escalateTicket(TENANT_ID, 'ticket-1', ACTOR_ID);

    expect(mockPublishTicketSlaBreached).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: sampleTicket.id,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── reopenTicket ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('reopenTicket', () => {
  it('reopens a resolved ticket', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'RESOLVED' });
    mockUpdateTicket.mockResolvedValue({
      ...sampleTicket,
      status: 'OPEN',
      resolvedAt: null,
      closedAt: null,
    });

    const result = await reopenTicket(TENANT_ID, 'ticket-1', ACTOR_ID);

    expect(mockUpdateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({
        status: 'OPEN',
        resolvedAt: null,
        closedAt: null,
      }),
    );
    expect(result.status).toBe('OPEN');
  });

  it('throws ValidationError if ticket is OPEN', async () => {
    mockFindTicket.mockResolvedValue({ ...sampleTicket, status: 'OPEN' });

    await expect(
      reopenTicket(TENANT_ID, 'ticket-1', ACTOR_ID),
    ).rejects.toThrow(ValidationError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getTicket ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTicket', () => {
  it('delegates to repo.findTicket', async () => {
    mockFindTicket.mockResolvedValue(sampleTicket);

    const result = await getTicket(TENANT_ID, 'ticket-1');

    expect(mockFindTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1');
    expect(result).toEqual(sampleTicket);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getTickets ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTickets', () => {
  it('returns paginated tickets', async () => {
    mockFindTickets.mockResolvedValue({
      data: [sampleTicket],
      total: 1,
      page: 1,
    });

    const result = await getTickets(TENANT_ID, {}, { page: 1, limit: 20 });

    expect(mockFindTickets).toHaveBeenCalledWith(TENANT_ID, {}, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('calculates totalPages correctly', async () => {
    mockFindTickets.mockResolvedValue({
      data: [],
      total: 45,
      page: 1,
    });

    const result = await getTickets(TENANT_ID, {}, { page: 1, limit: 20 });

    expect(result.totalPages).toBe(3);
    expect(result.pageSize).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getTicketReplies ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTicketReplies', () => {
  it('validates ticket exists and returns replies', async () => {
    const replies = [
      { id: 'reply-1', ticketId: 'ticket-1', body: 'Reply 1' },
      { id: 'reply-2', ticketId: 'ticket-1', body: 'Reply 2' },
    ];
    mockFindTicket.mockResolvedValue(sampleTicket);
    mockFindRepliesByTicket.mockResolvedValue(replies);

    const result = await getTicketReplies(TENANT_ID, 'ticket-1');

    expect(mockFindTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1');
    expect(mockFindRepliesByTicket).toHaveBeenCalledWith('ticket-1');
    expect(result).toEqual(replies);
  });
});
