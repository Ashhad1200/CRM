import { describe, it, expect } from 'vitest';
import { EventTypes, isValidEventType } from '../events/index.js';
import type { DomainEvent, DealWonPayload } from '../events/index.js';

describe('Events', () => {
  describe('EventTypes registry', () => {
    it('contains all 27 defined events', () => {
      const types = Object.values(EventTypes);
      expect(types).toHaveLength(27);
    });

    it('uses dot-notation convention (noun.verb)', () => {
      for (const type of Object.values(EventTypes)) {
        expect(type).toMatch(/^[a-z]+\.[a-z_]+$/);
      }
    });

    it('contains known events', () => {
      expect(EventTypes.DEAL_WON).toBe('deal.won');
      expect(EventTypes.INVOICE_PAID).toBe('invoice.paid');
      expect(EventTypes.TICKET_CREATED).toBe('ticket.created');
      expect(EventTypes.STOCK_LOW).toBe('stock.low');
    });
  });

  describe('isValidEventType()', () => {
    it('returns true for known event types', () => {
      expect(isValidEventType('deal.won')).toBe(true);
      expect(isValidEventType('invoice.paid')).toBe(true);
    });

    it('returns false for unknown event types', () => {
      expect(isValidEventType('unknown.event')).toBe(false);
      expect(isValidEventType('')).toBe(false);
    });
  });

  describe('DomainEvent type shape', () => {
    it('accepts a well-formed event object', () => {
      const event: DomainEvent<DealWonPayload> = {
        id: '01234567-89ab-7def-8000-000000000001',
        type: EventTypes.DEAL_WON,
        tenantId: 'tenant-1',
        actorId: 'user-1',
        aggregateId: 'deal-1',
        aggregateType: 'Deal',
        correlationId: 'req-1',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          dealId: 'deal-1',
          contactId: 'contact-1',
          accountId: 'account-1',
          amount: { amount: '10000', currency: 'USD' },
          products: [{ productId: 'prod-1', quantity: 2, unitPrice: '5000' }],
        },
      };

      expect(event.type).toBe('deal.won');
      expect(event.payload.dealId).toBe('deal-1');
      expect(event.payload.products).toHaveLength(1);
      expect(event.version).toBe(1);
    });
  });
});
