import { getPrismaClient } from '@softcrm/db';
import { eventBus } from './event-bus.js';
import { logger } from '../logger.js';
import type { DomainEvent, EventType } from '@softcrm/shared-kernel';

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Outbox relay — polls the outbox table for unpublished events,
 * publishes them to BullMQ, and marks them as published.
 * Runs on a 1-second interval in the same process.
 */
export const outboxRelay = {
  start(pollIntervalMs = 1000): void {
    logger.info(`Outbox relay started (poll every ${pollIntervalMs}ms)`);

    intervalId = setInterval(async () => {
      try {
        await processOutbox();
      } catch (err) {
        logger.error({ err }, 'Outbox relay error');
      }
    }, pollIntervalMs);
  },

  stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info('Outbox relay stopped');
    }
  },
};

async function processOutbox(): Promise<void> {
  // Fetch unpublished events (batch of 50)
  const db = getPrismaClient();
  const events = await db.outbox.findMany({
    where: { publishedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  if (events.length === 0) return;

  for (const row of events) {
    try {
      const payload = row.payload as Record<string, unknown>;
      const event: DomainEvent = {
        id: row.id,
        type: row.eventType as EventType,
        tenantId: (payload['tenantId'] as string) ?? '',
        actorId: (payload['actorId'] as string) ?? '',
        aggregateId: row.aggregateId,
        aggregateType: (payload['aggregateType'] as string) ?? 'Unknown',
        payload: payload['data'] ?? payload,
        correlationId: (payload['correlationId'] as string) ?? row.id,
        timestamp: row.createdAt.toISOString(),
        version: 1,
      };

      await eventBus.publish(event);

      await db.outbox.update({
        where: { id: row.id },
        data: { publishedAt: new Date() },
      });
    } catch (err) {
      logger.error({ err, outboxId: row.id }, 'Failed to publish outbox event');
    }
  }

  logger.debug({ count: events.length }, 'Outbox events processed');
}
