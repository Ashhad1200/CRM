/**
 * Workflow Builder module — event listeners.
 *
 * Subscribes to ALL domain events so that active workflows whose trigger
 * matches an event type are automatically evaluated and executed.
 *
 * WORKFLOW_EXECUTED events are explicitly skipped to prevent infinite
 * recursive loops.
 */

import { eventBus } from '../../../infra/event-bus.js';
import { EventTypes } from '@softcrm/shared-kernel';
import { logger } from '../../../logger.js';
import * as svc from './workflow.service.js';

/**
 * Register workflow listeners for all domain event types.
 * Call once during application bootstrap.
 */
export function registerWorkflowListeners(): void {
  const allEventTypes = Object.values(EventTypes);

  for (const eventType of allEventTypes) {
    // Skip WORKFLOW_EXECUTED to prevent infinite loops
    if (eventType === EventTypes.WORKFLOW_EXECUTED) {
      continue;
    }

    eventBus.subscribe(eventType, async (event) => {
      try {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const correlationId = event.correlationId ?? event.id;

        await svc.evaluateWorkflowsForEvent(
          event.tenantId,
          event.type,
          payload,
          correlationId,
        );
      } catch (error) {
        logger.error(
          { eventType, eventId: event.id, error },
          'Workflow listener failed to evaluate workflows for event',
        );
      }
    });
  }

  logger.info(
    { subscribedCount: allEventTypes.length - 1 },
    'Workflow listeners registered for all domain events (excluding WORKFLOW_EXECUTED)',
  );
}
