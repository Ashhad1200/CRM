import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations (must be before vi.mock calls) ────────────────────────────

const mockFindSegmentByName = vi.fn();
const mockCreateSegment = vi.fn();
const mockFindSegment = vi.fn();
const mockFindSegments = vi.fn();
const mockUpdateSegment = vi.fn();
const mockFindCampaign = vi.fn();
const mockCreateCampaign = vi.fn();
const mockFindCampaigns = vi.fn();
const mockUpdateCampaign = vi.fn();
const mockUpdateCampaignStatus = vi.fn();
const mockCreateCampaignRecipients = vi.fn();
const mockFindRecipientById = vi.fn();
const mockUpdateRecipientEvent = vi.fn();
const mockGetCampaignMetrics = vi.fn();
const mockCreateMarketingTouch = vi.fn();
const mockFindTouchesByContact = vi.fn();
const mockUpdateTouchDealId = vi.fn();
const mockFindTouchesWithDeals = vi.fn();
const mockCreateUnsubscribe = vi.fn();

const mockPublishCampaignSent = vi.fn();

vi.mock('../repository.js', () => ({
  findSegmentByName: (...args: unknown[]) => mockFindSegmentByName(...args),
  createSegment: (...args: unknown[]) => mockCreateSegment(...args),
  findSegment: (...args: unknown[]) => mockFindSegment(...args),
  findSegments: (...args: unknown[]) => mockFindSegments(...args),
  updateSegment: (...args: unknown[]) => mockUpdateSegment(...args),
  findCampaign: (...args: unknown[]) => mockFindCampaign(...args),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
  findCampaigns: (...args: unknown[]) => mockFindCampaigns(...args),
  updateCampaign: (...args: unknown[]) => mockUpdateCampaign(...args),
  updateCampaignStatus: (...args: unknown[]) => mockUpdateCampaignStatus(...args),
  createCampaignRecipients: (...args: unknown[]) => mockCreateCampaignRecipients(...args),
  findRecipientById: (...args: unknown[]) => mockFindRecipientById(...args),
  updateRecipientEvent: (...args: unknown[]) => mockUpdateRecipientEvent(...args),
  getCampaignMetrics: (...args: unknown[]) => mockGetCampaignMetrics(...args),
  createMarketingTouch: (...args: unknown[]) => mockCreateMarketingTouch(...args),
  findTouchesByContact: (...args: unknown[]) => mockFindTouchesByContact(...args),
  updateTouchDealId: (...args: unknown[]) => mockUpdateTouchDealId(...args),
  findTouchesWithDeals: (...args: unknown[]) => mockFindTouchesWithDeals(...args),
  createUnsubscribe: (...args: unknown[]) => mockCreateUnsubscribe(...args),
}));

vi.mock('../events.js', () => ({
  publishCampaignSent: (...args: unknown[]) => mockPublishCampaignSent(...args),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    $transaction: (fn: Function) => fn({}),
  }),
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import module under test AFTER mocks ────────────────────────────────────────

import * as svc from '../service.js';

// ── Test constants ──────────────────────────────────────────────────────────────

const T = 'tenant-1';
const ACTOR = 'user-1';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tests ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Segments ─────────────────────────────────────────────────────────────────

describe('Segments', () => {
  describe('createSegment', () => {
    it('creates a segment when name is unique', async () => {
      mockFindSegmentByName.mockResolvedValue(null);
      const created = { id: 'seg-1', name: 'VIP', tenantId: T };
      mockCreateSegment.mockResolvedValue(created);

      const result = await svc.createSegment(T, { name: 'VIP' }, ACTOR);

      expect(mockFindSegmentByName).toHaveBeenCalledWith(T, 'VIP');
      expect(mockCreateSegment).toHaveBeenCalledWith(T, { name: 'VIP' }, ACTOR);
      expect(result).toEqual(created);
    });

    it('throws ValidationError on duplicate segment name', async () => {
      mockFindSegmentByName.mockResolvedValue({ id: 'existing', name: 'VIP' });

      await expect(svc.createSegment(T, { name: 'VIP' }, ACTOR)).rejects.toThrow(
        'Segment with name "VIP" already exists',
      );
      expect(mockCreateSegment).not.toHaveBeenCalled();
    });
  });

  describe('getSegments', () => {
    it('returns paginated result', async () => {
      mockFindSegments.mockResolvedValue({
        data: [{ id: 'seg-1' }, { id: 'seg-2' }],
        total: 2,
      });

      const result = await svc.getSegments(T, {}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [{ id: 'seg-1' }, { id: 'seg-2' }],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getSegment', () => {
    it('returns segment when found', async () => {
      const segment = { id: 'seg-1', name: 'VIP' };
      mockFindSegment.mockResolvedValue(segment);

      const result = await svc.getSegment(T, 'seg-1');

      expect(result).toEqual(segment);
    });

    it('throws NotFoundError when segment not found', async () => {
      mockFindSegment.mockResolvedValue(null);

      await expect(svc.getSegment(T, 'missing')).rejects.toThrow('Segment');
    });
  });

  describe('updateSegment', () => {
    it('updates an existing segment', async () => {
      mockFindSegment.mockResolvedValue({ id: 'seg-1', name: 'VIP' });
      const updated = { id: 'seg-1', name: 'Premium' };
      mockFindSegmentByName.mockResolvedValue(null);
      mockUpdateSegment.mockResolvedValue(updated);

      const result = await svc.updateSegment(T, 'seg-1', { name: 'Premium' });

      expect(mockUpdateSegment).toHaveBeenCalledWith(T, 'seg-1', { name: 'Premium' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when segment not found', async () => {
      mockFindSegment.mockResolvedValue(null);

      await expect(svc.updateSegment(T, 'missing', { name: 'X' })).rejects.toThrow('Segment');
    });

    it('throws ValidationError on duplicate name change', async () => {
      mockFindSegment.mockResolvedValue({ id: 'seg-1', name: 'VIP' });
      mockFindSegmentByName.mockResolvedValue({ id: 'seg-2', name: 'Premium' });

      await expect(svc.updateSegment(T, 'seg-1', { name: 'Premium' })).rejects.toThrow(
        'Segment with name "Premium" already exists',
      );
      expect(mockUpdateSegment).not.toHaveBeenCalled();
    });
  });
});

// ── Campaigns ────────────────────────────────────────────────────────────────

describe('Campaigns', () => {
  describe('buildCampaign', () => {
    it('creates a campaign with segment', async () => {
      mockFindSegment.mockResolvedValue({ id: 'seg-1', name: 'VIP' });
      const campaign = { id: 'camp-1', name: 'Welcome', status: 'DRAFT' };
      mockCreateCampaign.mockResolvedValue(campaign);

      const input = { name: 'Welcome', subjectA: 'Hi', bodyHtml: '<p>Hello</p>', segmentId: 'seg-1' };
      const result = await svc.buildCampaign(T, input, ACTOR);

      expect(mockFindSegment).toHaveBeenCalledWith(T, 'seg-1');
      expect(mockCreateCampaign).toHaveBeenCalledWith(T, input, ACTOR);
      expect(result).toEqual(campaign);
    });

    it('throws NotFoundError when segment not found', async () => {
      mockFindSegment.mockResolvedValue(null);

      const input = { name: 'Welcome', subjectA: 'Hi', bodyHtml: '<p></p>', segmentId: 'missing-seg' };
      await expect(svc.buildCampaign(T, input, ACTOR)).rejects.toThrow('Segment');
      expect(mockCreateCampaign).not.toHaveBeenCalled();
    });
  });

  describe('getCampaigns', () => {
    it('returns paginated result', async () => {
      mockFindCampaigns.mockResolvedValue({
        data: [{ id: 'camp-1' }],
        total: 1,
      });

      const result = await svc.getCampaigns(T, {}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [{ id: 'camp-1' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getCampaign', () => {
    it('returns campaign when found', async () => {
      const campaign = { id: 'camp-1', name: 'Welcome', status: 'DRAFT' };
      mockFindCampaign.mockResolvedValue(campaign);

      const result = await svc.getCampaign(T, 'camp-1');

      expect(result).toEqual(campaign);
    });

    it('throws NotFoundError when campaign not found', async () => {
      mockFindCampaign.mockResolvedValue(null);

      await expect(svc.getCampaign(T, 'missing')).rejects.toThrow('Campaign');
    });
  });

  describe('updateCampaign', () => {
    it('succeeds when campaign is DRAFT', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'DRAFT' });
      const updated = { id: 'camp-1', name: 'Updated', status: 'DRAFT' };
      mockUpdateCampaign.mockResolvedValue(updated);

      const result = await svc.updateCampaign(T, 'camp-1', { name: 'Updated' });

      expect(mockUpdateCampaign).toHaveBeenCalledWith(T, 'camp-1', { name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('throws when campaign is not DRAFT', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'SENT' });

      await expect(svc.updateCampaign(T, 'camp-1', { name: 'X' })).rejects.toThrow(
        'Only DRAFT campaigns can be updated',
      );
    });

    it('throws NotFoundError when campaign not found', async () => {
      mockFindCampaign.mockResolvedValue(null);

      await expect(svc.updateCampaign(T, 'missing', { name: 'X' })).rejects.toThrow('Campaign');
    });
  });
});

// ── Schedule & Send ──────────────────────────────────────────────────────────

describe('Schedule & Send', () => {
  describe('scheduleCampaign', () => {
    it('schedules a DRAFT campaign', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'DRAFT' });
      const sendAt = new Date('2026-03-01');
      const scheduled = { id: 'camp-1', status: 'SCHEDULED', scheduledAt: sendAt };
      mockUpdateCampaignStatus.mockResolvedValue(scheduled);

      const result = await svc.scheduleCampaign(T, 'camp-1', sendAt, ACTOR);

      expect(mockUpdateCampaignStatus).toHaveBeenCalledWith(
        T, 'camp-1', 'SCHEDULED', { scheduledAt: sendAt },
      );
      expect(result).toEqual(scheduled);
    });

    it('throws when campaign is not DRAFT', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'SENT' });

      await expect(
        svc.scheduleCampaign(T, 'camp-1', new Date(), ACTOR),
      ).rejects.toThrow('Only DRAFT campaigns can be scheduled');
    });

    it('throws NotFoundError when campaign not found', async () => {
      mockFindCampaign.mockResolvedValue(null);

      await expect(
        svc.scheduleCampaign(T, 'missing', new Date(), ACTOR),
      ).rejects.toThrow('Campaign');
    });
  });

  describe('sendCampaign', () => {
    it('sends campaign with A/B split, creates recipients, publishes event', async () => {
      const campaign = { id: 'camp-1', name: 'Welcome', type: 'EMAIL', status: 'DRAFT', segmentId: 'seg-1' };
      mockFindCampaign.mockResolvedValue(campaign);
      mockCreateCampaignRecipients.mockResolvedValue(undefined);
      const sentCampaign = { ...campaign, status: 'SENT' };
      mockUpdateCampaignStatus.mockResolvedValue(sentCampaign);
      mockPublishCampaignSent.mockResolvedValue(undefined);

      const contactIds = ['c-1', 'c-2', 'c-3', 'c-4'];
      const result = await svc.sendCampaign(T, 'camp-1', contactIds, ACTOR);

      // Verify recipients were created with A/B split
      expect(mockCreateCampaignRecipients).toHaveBeenCalledWith(
        T,
        'camp-1',
        [
          { contactId: 'c-1', variant: 'A' },
          { contactId: 'c-2', variant: 'A' },
          { contactId: 'c-3', variant: 'B' },
          { contactId: 'c-4', variant: 'B' },
        ],
        expect.anything(), // tx client
      );

      // Verify status updated to SENT
      expect(mockUpdateCampaignStatus).toHaveBeenCalledWith(
        T, 'camp-1', 'SENT', expect.objectContaining({ sentAt: expect.any(Date) }), expect.anything(),
      );

      // Verify event published
      expect(mockPublishCampaignSent).toHaveBeenCalledWith(T, ACTOR, {
        id: 'camp-1',
        name: 'Welcome',
        type: 'EMAIL',
        segmentId: 'seg-1',
      });

      expect(result).toEqual(sentCampaign);
    });

    it('throws ValidationError when contactIds is empty', async () => {
      await expect(
        svc.sendCampaign(T, 'camp-1', [], ACTOR),
      ).rejects.toThrow('contactIds must not be empty');
      expect(mockFindCampaign).not.toHaveBeenCalled();
    });

    it('throws ValidationError when campaign status is wrong', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'SENT' });

      await expect(
        svc.sendCampaign(T, 'camp-1', ['c-1'], ACTOR),
      ).rejects.toThrow('Campaign must be in DRAFT or SCHEDULED status to send');
    });
  });
});

// ── Webhooks ─────────────────────────────────────────────────────────────────

describe('Webhooks', () => {
  describe('processWebhook', () => {
    it('updates delivered/opened/clicked events', async () => {
      const recipient = { id: 'r-1', campaignId: 'camp-1', contactId: 'c-1' };
      mockFindRecipientById.mockResolvedValue(recipient);
      mockUpdateRecipientEvent.mockResolvedValue(undefined);

      await svc.processWebhook(T, 'r-1', 'delivered');

      expect(mockFindRecipientById).toHaveBeenCalledWith(T, 'r-1');
      expect(mockUpdateRecipientEvent).toHaveBeenCalledWith(
        T, 'camp-1', 'c-1', 'deliveredAt',
      );
    });

    it('handles unsubscribe event and creates Unsubscribe record', async () => {
      const recipient = { id: 'r-1', campaignId: 'camp-1', contactId: 'c-1' };
      mockFindRecipientById.mockResolvedValue(recipient);
      mockUpdateRecipientEvent.mockResolvedValue(undefined);
      mockCreateUnsubscribe.mockResolvedValue(undefined);

      await svc.processWebhook(T, 'r-1', 'unsubscribed');

      expect(mockUpdateRecipientEvent).toHaveBeenCalledWith(
        T, 'camp-1', 'c-1', 'unsubscribedAt',
      );
      expect(mockCreateUnsubscribe).toHaveBeenCalledWith(T, 'c-1', 'campaign:camp-1');
    });

    it('throws NotFoundError on unknown recipient', async () => {
      mockFindRecipientById.mockResolvedValue(null);

      await expect(svc.processWebhook(T, 'unknown', 'delivered')).rejects.toThrow(
        'CampaignRecipient',
      );
    });
  });
});

// ── Metrics ──────────────────────────────────────────────────────────────────

describe('Metrics', () => {
  describe('getCampaignMetrics', () => {
    it('delegates to repo and returns metrics', async () => {
      mockFindCampaign.mockResolvedValue({ id: 'camp-1', status: 'SENT' });
      const metrics = { total: 100, delivered: 90, opened: 50, clicked: 20, bounced: 5, unsubscribed: 2, openRate: 0.5, clickRate: 0.2, bounceRate: 0.05 };
      mockGetCampaignMetrics.mockResolvedValue(metrics);

      const result = await svc.getCampaignMetrics(T, 'camp-1');

      expect(mockGetCampaignMetrics).toHaveBeenCalledWith(T, 'camp-1');
      expect(result).toEqual(metrics);
    });

    it('throws NotFoundError when campaign not found', async () => {
      mockFindCampaign.mockResolvedValue(null);

      await expect(svc.getCampaignMetrics(T, 'missing')).rejects.toThrow('Campaign');
    });
  });
});

// ── Touches ──────────────────────────────────────────────────────────────────

describe('Touches', () => {
  describe('recordTouch', () => {
    it('creates marketing touch', async () => {
      const touch = { id: 'touch-1', contactId: 'c-1', campaignId: 'camp-1' };
      mockCreateMarketingTouch.mockResolvedValue(touch);

      const input = { contactId: 'c-1', campaignId: 'camp-1' };
      const result = await svc.recordTouch(T, input, ACTOR);

      expect(mockCreateMarketingTouch).toHaveBeenCalledWith(T, input, ACTOR);
      expect(result).toEqual(touch);
    });
  });
});

// ── Attribution ──────────────────────────────────────────────────────────────

describe('Attribution', () => {
  describe('generateAttributionReport', () => {
    it('returns paginated result with campaign grouping', async () => {
      mockFindTouchesWithDeals.mockResolvedValue([
        {
          id: 't-1',
          campaignId: 'camp-1',
          dealId: 'deal-1',
          timestamp: new Date('2026-01-01'),
          campaign: { name: 'Welcome' },
        },
        {
          id: 't-2',
          campaignId: 'camp-1',
          dealId: 'deal-2',
          timestamp: new Date('2026-01-02'),
          campaign: { name: 'Welcome' },
        },
        {
          id: 't-3',
          campaignId: 'camp-2',
          dealId: 'deal-1',
          timestamp: new Date('2026-01-03'),
          campaign: { name: 'Promo' },
        },
      ]);

      const result = await svc.generateAttributionReport(
        T,
        { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') },
        'first',
        { page: 1, limit: 10 },
      );

      expect(result.data).toHaveLength(2);
      // camp-1 appears in 2 deals, camp-2 in 1 deal → sorted desc by dealCount
      expect(result.data[0]).toMatchObject({
        campaignId: 'camp-1',
        campaignName: 'Welcome',
        dealCount: 2,
      });
      expect(result.data[1]).toMatchObject({
        campaignId: 'camp-2',
        campaignName: 'Promo',
        dealCount: 1,
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('handleDealWon', () => {
    it('links touches to deal with correct touchType ordering', async () => {
      const touches = [
        { id: 't-1', contactId: 'c-1', dealId: null, timestamp: new Date('2026-01-01') },
        { id: 't-2', contactId: 'c-1', dealId: null, timestamp: new Date('2026-01-05') },
        { id: 't-3', contactId: 'c-1', dealId: null, timestamp: new Date('2026-01-10') },
      ];
      mockFindTouchesByContact.mockResolvedValue(touches);
      mockUpdateTouchDealId.mockResolvedValue(undefined);

      await svc.handleDealWon(T, {
        dealId: 'deal-1',
        contactId: 'c-1',
        accountId: 'acc-1',
        amount: { amount: '10000', currency: 'USD' },
      });

      expect(mockUpdateTouchDealId).toHaveBeenCalledTimes(3);
      expect(mockUpdateTouchDealId).toHaveBeenCalledWith(T, 't-1', 'deal-1', 'FIRST');
      expect(mockUpdateTouchDealId).toHaveBeenCalledWith(T, 't-2', 'deal-1', 'MID');
      expect(mockUpdateTouchDealId).toHaveBeenCalledWith(T, 't-3', 'deal-1', 'LAST');
    });

    it('handles no-touches case gracefully', async () => {
      mockFindTouchesByContact.mockResolvedValue([]);

      await svc.handleDealWon(T, {
        dealId: 'deal-1',
        contactId: 'c-1',
        accountId: 'acc-1',
        amount: { amount: '5000', currency: 'USD' },
      });

      expect(mockUpdateTouchDealId).not.toHaveBeenCalled();
    });

    it('skips touches already linked to a deal', async () => {
      const touches = [
        { id: 't-1', contactId: 'c-1', dealId: 'old-deal', timestamp: new Date('2026-01-01') },
        { id: 't-2', contactId: 'c-1', dealId: null, timestamp: new Date('2026-01-05') },
      ];
      mockFindTouchesByContact.mockResolvedValue(touches);
      mockUpdateTouchDealId.mockResolvedValue(undefined);

      await svc.handleDealWon(T, {
        dealId: 'deal-2',
        contactId: 'c-1',
        accountId: 'acc-1',
        amount: { amount: '8000', currency: 'USD' },
      });

      // Only the unlinked touch should be updated, and as single touch → FIRST
      expect(mockUpdateTouchDealId).toHaveBeenCalledTimes(1);
      expect(mockUpdateTouchDealId).toHaveBeenCalledWith(T, 't-2', 'deal-2', 'FIRST');
    });
  });
});
