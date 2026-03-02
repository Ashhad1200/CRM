/**
 * Support module — live chat service.
 *
 * Real-time chat session management, agent routing, and transcript storage.
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Chat Sessions ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createChatSession(
  tenantId: string,
  data: {
    visitorId: string;
    visitorName?: string;
    visitorEmail?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const db = getPrismaClient();

  // Auto-assign agent (fewest active sessions)
  const agents = await db.chatSession.groupBy({
    by: ['agentId'],
    where: { tenantId, status: 'ACTIVE', agentId: { not: null } },
    _count: { id: true },
  });

  // For now, pick the agent with fewest sessions (simple round-robin)
  const agentId = agents.length > 0
    ? agents.sort((a, b) => a._count.id - b._count.id)[0]!.agentId
    : null;

  return db.chatSession.create({
    data: {
      id: generateId(),
      tenantId,
      visitorId: data.visitorId,
      visitorName: data.visitorName,
      visitorEmail: data.visitorEmail,
      agentId,
      status: agentId ? 'ACTIVE' : 'WAITING',
      metadata: (data.metadata ?? null) as never,
    },
  });
}

export async function assignAgent(
  tenantId: string,
  sessionId: string,
  agentId: string,
) {
  const db = getPrismaClient();
  return db.chatSession.update({
    where: { id: sessionId, tenantId },
    data: { agentId, status: 'ACTIVE' },
  });
}

export async function closeSession(
  tenantId: string,
  sessionId: string,
  rating?: number,
) {
  const db = getPrismaClient();
  return db.chatSession.update({
    where: { id: sessionId, tenantId },
    data: { status: 'CLOSED', closedAt: new Date(), rating },
  });
}

export async function getActiveSessions(
  tenantId: string,
  agentId?: string,
) {
  const db = getPrismaClient();
  return db.chatSession.findMany({
    where: {
      tenantId,
      status: { in: ['WAITING', 'ACTIVE'] },
      ...(agentId ? { agentId } : {}),
    },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getWaitingSessions(tenantId: string) {
  const db = getPrismaClient();
  return db.chatSession.findMany({
    where: { tenantId, status: 'WAITING' },
    orderBy: { startedAt: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Messages ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendMessage(
  tenantId: string,
  sessionId: string,
  data: {
    senderType: 'visitor' | 'agent' | 'system';
    senderId?: string;
    content: string;
    metadata?: Record<string, unknown>;
  },
) {
  const db = getPrismaClient();

  // Verify session exists and is active
  const session = await db.chatSession.findFirst({
    where: { id: sessionId, tenantId, status: { in: ['WAITING', 'ACTIVE'] } },
  });
  if (!session) throw new Error('Chat session not found or closed');

  return db.chatMessage.create({
    data: {
      id: generateId(),
      chatSessionId: sessionId,
      senderType: data.senderType,
      senderId: data.senderId,
      content: data.content,
      metadata: (data.metadata ?? null) as never,
    },
  });
}

export async function getSessionMessages(
  tenantId: string,
  sessionId: string,
  cursor?: string,
  limit = 50,
) {
  const db = getPrismaClient();

  // Verify access
  const session = await db.chatSession.findFirst({
    where: { id: sessionId, tenantId },
  });
  if (!session) throw new Error('Chat session not found');

  return db.chatMessage.findMany({
    where: {
      chatSessionId: sessionId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

export async function getTranscript(tenantId: string, sessionId: string) {
  const db = getPrismaClient();

  const session = await db.chatSession.findFirst({
    where: { id: sessionId, tenantId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session) throw new Error('Chat session not found');

  return session;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Metrics ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getChatMetrics(
  tenantId: string,
  from?: Date,
  to?: Date,
) {
  const db = getPrismaClient();
  const where = {
    tenantId,
    ...(from || to ? { startedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [total, active, waiting, closed, avgRating] = await Promise.all([
    db.chatSession.count({ where }),
    db.chatSession.count({ where: { ...where, status: 'ACTIVE' } }),
    db.chatSession.count({ where: { ...where, status: 'WAITING' } }),
    db.chatSession.count({ where: { ...where, status: 'CLOSED' } }),
    db.chatSession.aggregate({
      where: { ...where, rating: { not: null } },
      _avg: { rating: true },
    }),
  ]);

  return {
    total,
    active,
    waiting,
    closed,
    averageRating: avgRating._avg.rating ?? null,
  };
}
