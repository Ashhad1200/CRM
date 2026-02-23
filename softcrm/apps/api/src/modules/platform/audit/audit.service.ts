import { createHash } from 'node:crypto';
import { getPrismaClient } from '@softcrm/db';
import * as auditRepo from './audit.repository.js';
import type { AuditLogFilters, AuditLogPagination } from './audit.repository.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RecordAuditParams {
  tenantId: string;
  actorId: string;
  ip?: string;
  userAgent?: string;
  module: string;
  entity: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: Record<string, unknown>;
}

export interface ChainVerificationResult {
  valid: boolean;
  brokenAt?: string;
}

// ── Record a new audit entry ───────────────────────────────────────────────────

export async function recordAudit(params: RecordAuditParams) {
  const lastLog = await auditRepo.getLastAuditLog(params.tenantId);
  const previousHash = lastLog?.hash ?? undefined;

  return auditRepo.appendAuditLog({
    ...params,
    previousHash,
  });
}

// ── Get audit logs ─────────────────────────────────────────────────────────────

export async function getAuditLog(
  tenantId: string,
  filters: Omit<AuditLogFilters, 'tenantId'>,
  pagination: AuditLogPagination,
) {
  return auditRepo.findAuditLogs({ tenantId, ...filters }, pagination);
}

// ── Verify chain integrity ─────────────────────────────────────────────────────

export async function verifyChain(
  tenantId: string,
  startId?: string,
  endId?: string,
): Promise<ChainVerificationResult> {
  const db = getPrismaClient();

  // Build the where clause for the range
  const where: Record<string, unknown> = { tenantId };

  if (startId || endId) {
    // Fetch boundary timestamps to filter by range
    if (startId) {
      const startLog = await db.auditLog.findFirst({
        where: { id: startId, tenantId },
        select: { timestamp: true },
      });
      if (startLog) {
        where['timestamp'] = { ...(where['timestamp'] as Record<string, unknown> ?? {}), gte: startLog.timestamp };
      }
    }
    if (endId) {
      const endLog = await db.auditLog.findFirst({
        where: { id: endId, tenantId },
        select: { timestamp: true },
      });
      if (endLog) {
        const existing = (where['timestamp'] as Record<string, unknown>) ?? {};
        where['timestamp'] = { ...existing, lte: endLog.timestamp };
      }
    }
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]!;

    const payload = JSON.stringify({
      tenantId: log.tenantId,
      actorId: log.actorId,
      ip: log.ip,
      userAgent: log.userAgent,
      module: log.module,
      entity: log.entity,
      recordId: log.recordId,
      action: log.action,
      changes: log.changes,
      previousHash: log.previousHash,
    });

    const expectedHash = createHash('sha256').update(payload).digest('hex');

    if (log.hash !== expectedHash) {
      return { valid: false, brokenAt: log.id };
    }

    // Verify chain link: each log's previousHash should match prior log's hash
    if (i > 0) {
      const prevLog = logs[i - 1]!;
      if (log.previousHash !== prevLog.hash) {
        return { valid: false, brokenAt: log.id };
      }
    }
  }

  return { valid: true };
}

// ── Export audit log as CSV ────────────────────────────────────────────────────

export async function exportAuditLogCsv(
  tenantId: string,
  filters: Omit<AuditLogFilters, 'tenantId'>,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId };

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

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });

  const header = 'timestamp,actor,module,entity,recordId,action,changes';
  const rows = logs.map((log) => {
    const changesStr = JSON.stringify(log.changes).replace(/"/g, '""');
    return [
      log.timestamp.toISOString(),
      log.actorId ?? '',
      log.module,
      log.entity,
      log.recordId,
      log.action,
      `"${changesStr}"`,
    ].join(',');
  });

  return [header, ...rows].join('\n');
}
