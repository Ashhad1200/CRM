import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock declarations (must be before vi.mock calls) ────────────────────────────

const mockCreateSegment = vi.fn();
const mockGetSegments = vi.fn();
const mockGetSegment = vi.fn();
const mockUpdateSegment = vi.fn();
const mockBuildCampaign = vi.fn();
const mockGetCampaigns = vi.fn();
const mockGetCampaign = vi.fn();
const mockUpdateCampaign = vi.fn();
const mockScheduleCampaign = vi.fn();
const mockSendCampaign = vi.fn();
const mockGetCampaignMetrics = vi.fn();
const mockProcessWebhook = vi.fn();
const mockGenerateAttributionReport = vi.fn();
const mockRecordTouch = vi.fn();

const mockFindUnsubscribes = vi.fn();

vi.mock('../service.js', () => ({
  createSegment: (...args: unknown[]) => mockCreateSegment(...args),
  getSegments: (...args: unknown[]) => mockGetSegments(...args),
  getSegment: (...args: unknown[]) => mockGetSegment(...args),
  updateSegment: (...args: unknown[]) => mockUpdateSegment(...args),
  buildCampaign: (...args: unknown[]) => mockBuildCampaign(...args),
  getCampaigns: (...args: unknown[]) => mockGetCampaigns(...args),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  updateCampaign: (...args: unknown[]) => mockUpdateCampaign(...args),
  scheduleCampaign: (...args: unknown[]) => mockScheduleCampaign(...args),
  sendCampaign: (...args: unknown[]) => mockSendCampaign(...args),
  getCampaignMetrics: (...args: unknown[]) => mockGetCampaignMetrics(...args),
  processWebhook: (...args: unknown[]) => mockProcessWebhook(...args),
  generateAttributionReport: (...args: unknown[]) => mockGenerateAttributionReport(...args),
  recordTouch: (...args: unknown[]) => mockRecordTouch(...args),
}));

vi.mock('../repository.js', () => ({
  findUnsubscribes: (...args: unknown[]) => mockFindUnsubscribes(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: Function) => next(),
}));

// ── Import router AFTER mocks ───────────────────────────────────────────────────

import { marketingRouter } from '../routes.js';

// ── Test app setup ──────────────────────────────────────────────────────────────

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Inject fake user
  app.use((req: any, _res: any, next: Function) => {
    req.user = { tid: 'tenant-1', sub: 'user-1', roles: ['admin'] };
    next();
  });
  app.use('/marketing', marketingRouter);
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tests ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Segments ─────────────────────────────────────────────────────────────────

describe('Segment routes', () => {
  it('GET /marketing/segments → 200', async () => {
    const paginated = { data: [{ id: 'seg-1' }], total: 1, page: 1, pageSize: 10, totalPages: 1 };
    mockGetSegments.mockResolvedValue(paginated);

    const res = await request(createTestApp())
      .get('/marketing/segments')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(mockGetSegments).toHaveBeenCalled();
  });

  it('POST /marketing/segments → 201', async () => {
    const segment = { id: 'seg-1', name: 'VIP' };
    mockCreateSegment.mockResolvedValue(segment);

    const res = await request(createTestApp())
      .post('/marketing/segments')
      .send({ name: 'VIP' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: segment });
    expect(mockCreateSegment).toHaveBeenCalledWith('tenant-1', { name: 'VIP' }, 'user-1');
  });

  it('GET /marketing/segments/:id → 200', async () => {
    const segment = { id: 'seg-1', name: 'VIP' };
    mockGetSegment.mockResolvedValue(segment);

    const res = await request(createTestApp())
      .get('/marketing/segments/seg-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: segment });
    expect(mockGetSegment).toHaveBeenCalledWith('tenant-1', 'seg-1');
  });

  it('PATCH /marketing/segments/:id → 200', async () => {
    const updated = { id: 'seg-1', name: 'Premium' };
    mockUpdateSegment.mockResolvedValue(updated);

    const res = await request(createTestApp())
      .patch('/marketing/segments/seg-1')
      .send({ name: 'Premium' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(mockUpdateSegment).toHaveBeenCalledWith('tenant-1', 'seg-1', { name: 'Premium' });
  });
});

// ── Campaigns ────────────────────────────────────────────────────────────────

describe('Campaign routes', () => {
  it('GET /marketing/campaigns → 200', async () => {
    const paginated = { data: [{ id: 'camp-1' }], total: 1, page: 1, pageSize: 10, totalPages: 1 };
    mockGetCampaigns.mockResolvedValue(paginated);

    const res = await request(createTestApp())
      .get('/marketing/campaigns')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(mockGetCampaigns).toHaveBeenCalled();
  });

  it('POST /marketing/campaigns → 201', async () => {
    const campaign = { id: 'camp-1', name: 'Welcome', status: 'DRAFT' };
    mockBuildCampaign.mockResolvedValue(campaign);

    const res = await request(createTestApp())
      .post('/marketing/campaigns')
      .send({ name: 'Welcome', subjectA: 'Hi', bodyHtml: '<p>Hello</p>' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: campaign });
    expect(mockBuildCampaign).toHaveBeenCalledWith(
      'tenant-1',
      { name: 'Welcome', subjectA: 'Hi', bodyHtml: '<p>Hello</p>' },
      'user-1',
    );
  });

  it('GET /marketing/campaigns/:id → 200', async () => {
    const campaign = { id: 'camp-1', name: 'Welcome' };
    mockGetCampaign.mockResolvedValue(campaign);

    const res = await request(createTestApp())
      .get('/marketing/campaigns/camp-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: campaign });
    expect(mockGetCampaign).toHaveBeenCalledWith('tenant-1', 'camp-1');
  });

  it('PATCH /marketing/campaigns/:id → 200', async () => {
    const updated = { id: 'camp-1', name: 'Updated' };
    mockUpdateCampaign.mockResolvedValue(updated);

    const res = await request(createTestApp())
      .patch('/marketing/campaigns/camp-1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(mockUpdateCampaign).toHaveBeenCalledWith('tenant-1', 'camp-1', { name: 'Updated' });
  });

  it('POST /marketing/campaigns/:id/schedule → 200', async () => {
    const scheduled = { id: 'camp-1', status: 'SCHEDULED' };
    mockScheduleCampaign.mockResolvedValue(scheduled);

    const res = await request(createTestApp())
      .post('/marketing/campaigns/camp-1/schedule')
      .send({ sendAt: '2026-03-01T00:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: scheduled });
    expect(mockScheduleCampaign).toHaveBeenCalled();
  });
});

// ── Send & Metrics ───────────────────────────────────────────────────────────

describe('Send & Metrics routes', () => {
  it('POST /marketing/campaigns/:id/send → 200', async () => {
    const sent = { id: 'camp-1', status: 'SENT' };
    mockSendCampaign.mockResolvedValue(sent);

    const res = await request(createTestApp())
      .post('/marketing/campaigns/camp-1/send')
      .send({ contactIds: ['c-1', 'c-2'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: sent });
    expect(mockSendCampaign).toHaveBeenCalledWith(
      'tenant-1', 'camp-1', ['c-1', 'c-2'], 'user-1',
    );
  });

  it('GET /marketing/campaigns/:id/metrics → 200', async () => {
    const metrics = { total: 100, delivered: 90, opened: 50, clicked: 20 };
    mockGetCampaignMetrics.mockResolvedValue(metrics);

    const res = await request(createTestApp())
      .get('/marketing/campaigns/camp-1/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: metrics });
    expect(mockGetCampaignMetrics).toHaveBeenCalledWith('tenant-1', 'camp-1');
  });
});

// ── Webhooks ─────────────────────────────────────────────────────────────────

describe('Webhook routes', () => {
  it('POST /marketing/webhooks → 200', async () => {
    mockProcessWebhook.mockResolvedValue(undefined);

    const res = await request(createTestApp())
      .post('/marketing/webhooks')
      .send({ recipientId: 'r-1', event: 'delivered' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
    expect(mockProcessWebhook).toHaveBeenCalledWith('tenant-1', 'r-1', 'delivered');
  });
});

// ── Attribution & Touches ────────────────────────────────────────────────────

describe('Attribution & Touches routes', () => {
  it('GET /marketing/attribution → 200', async () => {
    const paginated = {
      data: [{ campaignId: 'camp-1', campaignName: 'Welcome', dealCount: 5 }],
      total: 1, page: 1, pageSize: 10, totalPages: 1,
    };
    mockGenerateAttributionReport.mockResolvedValue(paginated);

    const res = await request(createTestApp())
      .get('/marketing/attribution')
      .query({ page: '1', limit: '10', model: 'first' });

    expect(res.status).toBe(200);
    expect(mockGenerateAttributionReport).toHaveBeenCalled();
  });

  it('POST /marketing/touches → 201', async () => {
    const touch = { id: 'touch-1', contactId: 'c-1', campaignId: 'camp-1' };
    mockRecordTouch.mockResolvedValue(touch);

    const res = await request(createTestApp())
      .post('/marketing/touches')
      .send({ contactId: 'c-1', campaignId: 'camp-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: touch });
    expect(mockRecordTouch).toHaveBeenCalledWith(
      'tenant-1',
      { contactId: 'c-1', campaignId: 'camp-1' },
      'user-1',
    );
  });
});

// ── Unsubscribes ─────────────────────────────────────────────────────────────

describe('Unsubscribe routes', () => {
  it('GET /marketing/unsubscribes → 200', async () => {
    mockFindUnsubscribes.mockResolvedValue({
      data: [{ id: 'unsub-1', contactId: 'c-1' }],
      total: 1,
    });

    const res = await request(createTestApp())
      .get('/marketing/unsubscribes')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: [{ id: 'unsub-1', contactId: 'c-1' }], total: 1 });
    expect(mockFindUnsubscribes).toHaveBeenCalled();
  });
});
