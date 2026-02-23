import { createHash } from 'node:crypto';
import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AppendAuditLogInput {
  tenantId: string;
  actorId: string;
  ip?: string;
  userAgent?: string;
  module: string;
  entity: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: Record<string, unknown>;
  previousHash?: string;
}

export interface AuditLogFilters {
  tenantId: string;
  module?: string;
  entity?: string;
  recordId?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
}

// ── Hash computation ───────────────────────────────────────────────────────────

function computeHash(data: AppendAuditLogInput): string {
  const payload = JSON.stringify({
    tenantId: data.tenantId,
    actorId: data.actorId,
    ip: data.ip,
    userAgent: data.userAgent,
    module: data.module,
    entity: data.entity,
    recordId: data.recordId,
    action: data.action,
    changes: data.changes,
    previousHash: data.previousHash,
  });
  return createHash('sha256').update(payload).digest('hex');
}

// ── Append (insert-only) ───────────────────────────────────────────────────────

export async function appendAuditLog(data: AppendAuditLogInput) {
  const db = getPrismaClient();
  const hash = computeHash(data);

  const auditLog = await db.auditLog.create({
    data: {
      id: generateId(),
      tenantId: data.tenantId,
      actorId: data.actorId,
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null,
      module: data.module,
      entity: data.entity,
      recordId: data.recordId,
      action: data.action,
      changes: data.changes as object,
      previousHash: data.previousHash ?? null,
      hash,
    },
  });

  return auditLog;
}

// ── Query audit logs with filters & pagination ─────────────────────────────────

export async function findAuditLogs(
  filters: AuditLogFilters,
  pagination: AuditLogPagination,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId: filters.tenantId };

  if (filters.module) {
    where['module'] = filters.module;
  }
  if (filters.entity) {
    where['entity'] = filters.entity;
  }
  if (filters.recordId) {
    where['recordId'] = filters.recordId;
  }
  if (filters.actorId) {
    where['actorId'] = filters.actorId;
  }
  if (filters.startDate || filters.endDate) {
    const timestampFilter: Record<string, Date> = {};
    if (filters.startDate) {
      timestampFilter['gte'] = filters.startDate;
    }
    if (filters.endDate) {
      timestampFilter['lte'] = filters.endDate;
    }
    where['timestamp'] = timestampFilter;
  }

  const [data, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return { data, total };
}

// ── Get last audit log for hash chaining ───────────────────────────────────────

export async function getLastAuditLog(tenantId: string) {
  const db = getPrismaClient();

  return db.auditLog.findFirst({
    where: { tenantId },
    orderBy: { timestamp: 'desc' },
  });
}
