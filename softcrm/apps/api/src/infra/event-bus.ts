import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import type { DomainEvent } from '@softcrm/shared-kernel';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';

const QUEUE_NAME = 'crm.events';

let _queue: Queue | null = null;
let _connectionRedis: Redis | null = null;

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    ...(parsed.password ? { password: parsed.password } : {}),
  };
}

function getConnectionOpts(): ConnectionOptions {
  return { ...parseRedisUrl(getConfig().REDIS_URL), maxRetriesPerRequest: null };
}

function getRedisInstance(): Redis {
  if (!_connectionRedis) {
    _connectionRedis = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return _connectionRedis;
}

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, { connection: getConnectionOpts() });
  }
  return _queue;
}

type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;
const handlers = new Map<string, EventHandler[]>();

/**
 * Event bus powered by BullMQ.
 * - publish: adds a job to the queue
 * - subscribe: registers a handler for an event type
 * - startWorker: starts processing events (call once at boot)
 */
export const eventBus = {
  /**
   * Publish a domain event to the event bus.
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const queue = getQueue();
    await queue.add(event.type, event, {
      jobId: event.id, // Deduplication by event ID
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });
    logger.debug({ eventId: event.id, type: event.type }, 'Event published');
  },

  /**
   * Subscribe to a specific event type.
   */
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): void {
    const existing = handlers.get(eventType) ?? [];
    existing.push(handler as EventHandler);
    handlers.set(eventType, existing);
    logger.debug({ eventType }, 'Event handler registered');
  },

  /**
   * Start the BullMQ worker to process events.
   */
  startWorker(): Worker {
    const idempotencyRedis = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: null });

    const worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const event = job.data as DomainEvent;

        // Idempotency check
        const idemKey = `idem:${event.id}`;
        const alreadyProcessed = await idempotencyRedis.set(idemKey, '1', 'EX', 86400, 'NX');
        if (!alreadyProcessed) {
          logger.warn({ eventId: event.id }, 'Duplicate event — skipping');
          return;
        }

        const eventHandlers = handlers.get(event.type) ?? [];
        if (eventHandlers.length === 0) {
          logger.debug({ eventType: event.type }, 'No handlers for event type');
          return;
        }

        for (const handler of eventHandlers) {
          try {
            await handler(event);
          } catch (err) {
            logger.error({ err, eventId: event.id, eventType: event.type }, 'Event handler failed');
            throw err; // Let BullMQ retry
          }
        }
      },
      {
        connection: getConnectionOpts(),
        concurrency: 5,
      },
    );

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Event job failed');
    });

    logger.info('Event bus worker started');
    return worker;
  },

  /** Graceful shutdown. */
  async shutdown(): Promise<void> {
    await _queue?.close();
    _connectionRedis?.disconnect();
  },
};
