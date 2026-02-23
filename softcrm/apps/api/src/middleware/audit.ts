import type { Request, Response, NextFunction } from 'express';
import { recordAudit } from '../modules/platform/audit/audit.service.js';
import { logger } from '../logger.js';

/**
 * Audit middleware — intercepts responses to auto-record mutations.
 * Overrides res.json() to capture response bodies on success,
 * then asynchronously logs audit entries for POST/PUT/PATCH/DELETE.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only intercept mutating methods
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  let responseBody: unknown = undefined;

  // Override res.json to capture response body
  res.json = function captureJson(body?: unknown): Response {
    responseBody = body;
    return originalJson(body);
  };

  // After response finishes, record the audit log
  res.on('finish', () => {
    void (async () => {
      try {
        const statusCode = res.statusCode;

        // Only audit successful mutations
        if (statusCode < 200 || statusCode >= 300) {
          return;
        }

        // Must have an authenticated user
        if (!req.user) {
          return;
        }

        // Extract module/entity from URL pattern: /api/v1/:module/:entity/...
        const segments = req.originalUrl.split('?')[0]?.split('/').filter(Boolean) ?? [];
        // Expected: ['api', 'v1', module, entity, ...]
        const moduleSegment = segments[2];
        const entitySegment = segments[3];

        if (!moduleSegment || !entitySegment) {
          return;
        }

        // Determine action and changes
        let action: 'CREATE' | 'UPDATE' | 'DELETE';
        let changes: Record<string, unknown>;

        if (method === 'POST' && statusCode === 201) {
          action = 'CREATE';
          changes = (typeof responseBody === 'object' && responseBody !== null)
            ? responseBody as Record<string, unknown>
            : {};
        } else if ((method === 'PUT' || method === 'PATCH') && statusCode === 200) {
          action = 'UPDATE';
          changes = (typeof req.body === 'object' && req.body !== null)
            ? req.body as Record<string, unknown>
            : {};
        } else if (method === 'DELETE' && statusCode === 204) {
          action = 'DELETE';
          changes = {};
        } else {
          return;
        }

        // Try to extract recordId from URL (last UUID-like segment or from response)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let recordId: string | undefined;

        // Check URL segments for a UUID (e.g., /api/v1/sales/contacts/:id)
        for (let i = segments.length - 1; i >= 0; i--) {
          const seg = segments[i];
          if (seg && uuidPattern.test(seg)) {
            recordId = seg;
            break;
          }
        }

        // For creates, try to get id from response body
        if (!recordId && action === 'CREATE' && typeof responseBody === 'object' && responseBody !== null) {
          const body = responseBody as Record<string, unknown>;
          const data = body['data'] as Record<string, unknown> | undefined;
          const id = data?.['id'] ?? body['id'];
          if (typeof id === 'string') {
            recordId = id;
          }
        }

        if (!recordId) {
          return;
        }

        await recordAudit({
          tenantId: req.user.tid,
          actorId: req.user.sub,
          ip: req.ip ?? undefined,
          userAgent: req.headers['user-agent'] ?? undefined,
          module: moduleSegment,
          entity: entitySegment,
          recordId,
          action,
          changes,
        });
      } catch (err) {
        // Never let audit failures break the response
        logger.error({ err }, 'Audit middleware: failed to record audit log');
      }
    })();
  });

  next();
}
