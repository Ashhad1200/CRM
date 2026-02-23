import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock service layer ─────────────────────────────────────────────────────────

const mockCreateActivity = vi.fn();
const mockGetActivities = vi.fn();
const mockGetActivity = vi.fn();
const mockGetTimeline = vi.fn();
const mockLogCall = vi.fn();
const mockGetCallLog = vi.fn();
const mockSendEmail = vi.fn();
const mockGetEmailTemplates = vi.fn();
const mockCreateEmailTemplate = vi.fn();
const mockGetEmailTemplate = vi.fn();
const mockUpdateEmailTemplate = vi.fn();
const mockGetEmailSyncs = vi.fn();
const mockConnectEmailSync = vi.fn();
const mockDisconnectEmailSync = vi.fn();
const mockSyncEmails = vi.fn();

vi.mock('../service.js', () => ({
  createActivity: (...args: unknown[]) => mockCreateActivity(...args),
  getActivities: (...args: unknown[]) => mockGetActivities(...args),
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
  getTimeline: (...args: unknown[]) => mockGetTimeline(...args),
  logCall: (...args: unknown[]) => mockLogCall(...args),
  getCallLog: (...args: unknown[]) => mockGetCallLog(...args),
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  getEmailTemplates: (...args: unknown[]) => mockGetEmailTemplates(...args),
  createEmailTemplate: (...args: unknown[]) => mockCreateEmailTemplate(...args),
  getEmailTemplate: (...args: unknown[]) => mockGetEmailTemplate(...args),
  updateEmailTemplate: (...args: unknown[]) => mockUpdateEmailTemplate(...args),
  getEmailSyncs: (...args: unknown[]) => mockGetEmailSyncs(...args),
  connectEmailSync: (...args: unknown[]) => mockConnectEmailSync(...args),
  disconnectEmailSync: (...args: unknown[]) => mockDisconnectEmailSync(...args),
  syncEmails: (...args: unknown[]) => mockSyncEmails(...args),
}));

const mockGetGmailAuthUrl = vi.fn();
const mockGetOutlookAuthUrl = vi.fn();
const mockHandleGmailCallback = vi.fn();
const mockHandleOutlookCallback = vi.fn();

vi.mock('../email-sync.service.js', () => ({
  getGmailAuthUrl: (...args: unknown[]) => mockGetGmailAuthUrl(...args),
  getOutlookAuthUrl: (...args: unknown[]) => mockGetOutlookAuthUrl(...args),
  handleGmailCallback: (...args: unknown[]) => mockHandleGmailCallback(...args),
  handleOutlookCallback: (...args: unknown[]) => mockHandleOutlookCallback(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
  tenantContext: { getStore: vi.fn() },
}));

// ── Import router (after mocks) ────────────────────────────────────────────────

import { commsRouter } from '../routes.js';

// ── Test app setup ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { tid: TENANT_ID, sub: ACTOR_ID, email: 'test@test.com', roles: ['admin'] };
    next();
  });
  app.use('/comms', commsRouter);
  return app;
}

const app = createApp();

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Activity routes ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /comms/activities', () => {
  it('returns 200 with paginated activities', async () => {
    mockGetActivities.mockResolvedValue({
      data: [{ id: 'act-1', type: 'EMAIL' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/comms/activities')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual([{ id: 'act-1', type: 'EMAIL' }]);
    expect(mockGetActivities).toHaveBeenCalled();
  });
});

describe('POST /comms/activities', () => {
  it('returns 201 with created activity', async () => {
    const activity = { id: 'act-1', type: 'NOTE', subject: 'Follow up' };
    mockCreateActivity.mockResolvedValue(activity);

    const res = await request(app)
      .post('/comms/activities')
      .send({ type: 'NOTE', direction: 'OUTBOUND', subject: 'Follow up' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: activity });
    expect(mockCreateActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

describe('GET /comms/activities/:id', () => {
  it('returns 200 with activity detail', async () => {
    const activity = { id: 'act-1', type: 'EMAIL', subject: 'Hello' };
    mockGetActivity.mockResolvedValue(activity);

    const res = await request(app).get('/comms/activities/act-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: activity });
    expect(mockGetActivity).toHaveBeenCalledWith(TENANT_ID, 'act-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Timeline routes ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /comms/timeline', () => {
  it('returns 200 with timeline entries', async () => {
    mockGetTimeline.mockResolvedValue({
      data: [{ id: 'act-1' }, { id: 'act-2' }],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/comms/timeline')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetTimeline).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Call routes ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /comms/calls', () => {
  it('returns 201 with created call log', async () => {
    const result = { id: 'act-1', type: 'CALL', callLog: { id: 'cl-1' } };
    mockLogCall.mockResolvedValue(result);

    const res = await request(app)
      .post('/comms/calls')
      .send({
        contactId: 'contact-1',
        fromNumber: '+1111111111',
        toNumber: '+1234567890',
        duration: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: result });
    expect(mockLogCall).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

describe('GET /comms/calls/:activityId', () => {
  it('returns 200 with call log', async () => {
    const callLog = { id: 'cl-1', activityId: 'act-1', toNumber: '+1234567890' };
    mockGetCallLog.mockResolvedValue(callLog);

    const res = await request(app).get('/comms/calls/act-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: callLog });
    expect(mockGetCallLog).toHaveBeenCalledWith(TENANT_ID, 'act-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Template routes ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /comms/email-templates', () => {
  it('returns 200 with paginated templates', async () => {
    mockGetEmailTemplates.mockResolvedValue({
      data: [{ id: 'tpl-1', name: 'Welcome' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/comms/email-templates')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetEmailTemplates).toHaveBeenCalled();
  });
});

describe('POST /comms/email-templates', () => {
  it('returns 201 with created template', async () => {
    const template = { id: 'tpl-1', name: 'Welcome', subject: 'Welcome!' };
    mockCreateEmailTemplate.mockResolvedValue(template);

    const res = await request(app)
      .post('/comms/email-templates')
      .send({ name: 'Welcome', subject: 'Welcome!', bodyHtml: '<p>Hi</p>' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: template });
    expect(mockCreateEmailTemplate).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

describe('GET /comms/email-templates/:id', () => {
  it('returns 200 with template detail', async () => {
    const template = { id: 'tpl-1', name: 'Welcome', subject: 'Welcome!' };
    mockGetEmailTemplate.mockResolvedValue(template);

    const res = await request(app).get('/comms/email-templates/tpl-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: template });
    expect(mockGetEmailTemplate).toHaveBeenCalledWith(TENANT_ID, 'tpl-1');
  });
});

describe('PATCH /comms/email-templates/:id', () => {
  it('returns 200 with updated template', async () => {
    const template = { id: 'tpl-1', name: 'Updated', version: 2 };
    mockUpdateEmailTemplate.mockResolvedValue(template);

    const res = await request(app)
      .patch('/comms/email-templates/tpl-1')
      .send({ name: 'Updated', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: template });
    expect(mockUpdateEmailTemplate).toHaveBeenCalledWith(
      TENANT_ID,
      'tpl-1',
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Send Email route ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /comms/emails/send', () => {
  it('returns 201 with sent email activity', async () => {
    const activity = { id: 'act-1', type: 'EMAIL', direction: 'OUTBOUND' };
    mockSendEmail.mockResolvedValue(activity);

    const res = await request(app)
      .post('/comms/emails/send')
      .send({ contactId: 'contact-1', subject: 'Hey', body: '<p>Hello</p>' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: activity });
    expect(mockSendEmail).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Sync routes ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /comms/email-sync', () => {
  it('returns 200 with email syncs', async () => {
    const syncs = [{ id: 'sync-1', provider: 'GMAIL', status: 'ACTIVE' }];
    mockGetEmailSyncs.mockResolvedValue(syncs);

    const res = await request(app).get('/comms/email-sync');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: syncs });
    expect(mockGetEmailSyncs).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID);
  });
});

describe('POST /comms/email-sync/connect', () => {
  it('returns 201 with connected sync', async () => {
    const sync = { id: 'sync-1', provider: 'GMAIL', status: 'ACTIVE' };
    mockConnectEmailSync.mockResolvedValue(sync);

    const res = await request(app)
      .post('/comms/email-sync/connect')
      .send({ provider: 'GMAIL', accessToken: 'tok', refreshToken: 'ref' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: sync });
    expect(mockConnectEmailSync).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.any(Object),
    );
  });
});

describe('GET /comms/email-sync/gmail/auth-url', () => {
  it('returns 200 with Gmail OAuth URL', async () => {
    mockGetGmailAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?state=tenant-1:user-1');

    const res = await request(app).get('/comms/email-sync/gmail/auth-url');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { url: expect.stringContaining('google.com') } });
    expect(mockGetGmailAuthUrl).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID);
  });
});

describe('GET /comms/email-sync/outlook/auth-url', () => {
  it('returns 200 with Outlook OAuth URL', async () => {
    mockGetOutlookAuthUrl.mockReturnValue('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=tenant-1:user-1');

    const res = await request(app).get('/comms/email-sync/outlook/auth-url');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { url: expect.stringContaining('microsoftonline.com') } });
    expect(mockGetOutlookAuthUrl).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID);
  });
});
