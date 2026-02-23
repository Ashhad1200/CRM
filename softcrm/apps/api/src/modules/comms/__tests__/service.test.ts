import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateActivity = vi.fn();
const mockFindActivities = vi.fn();
const mockFindActivity = vi.fn();
const mockGetTimeline = vi.fn();
const mockCreateCallLog = vi.fn();
const mockFindCallLog = vi.fn();
const mockCreateEmailSync = vi.fn();
const mockFindEmailSync = vi.fn();
const mockFindEmailSyncs = vi.fn();
const mockUpdateEmailSyncStatus = vi.fn();
const mockCreateEmailTemplate = vi.fn();
const mockFindEmailTemplates = vi.fn();
const mockFindEmailTemplate = vi.fn();
const mockUpdateEmailTemplate = vi.fn();

vi.mock('../repository.js', () => ({
  createActivity: (...args: unknown[]) => mockCreateActivity(...args),
  findActivities: (...args: unknown[]) => mockFindActivities(...args),
  findActivity: (...args: unknown[]) => mockFindActivity(...args),
  getTimeline: (...args: unknown[]) => mockGetTimeline(...args),
  createCallLog: (...args: unknown[]) => mockCreateCallLog(...args),
  findCallLog: (...args: unknown[]) => mockFindCallLog(...args),
  createEmailSync: (...args: unknown[]) => mockCreateEmailSync(...args),
  findEmailSync: (...args: unknown[]) => mockFindEmailSync(...args),
  findEmailSyncs: (...args: unknown[]) => mockFindEmailSyncs(...args),
  updateEmailSyncStatus: (...args: unknown[]) => mockUpdateEmailSyncStatus(...args),
  createEmailTemplate: (...args: unknown[]) => mockCreateEmailTemplate(...args),
  findEmailTemplates: (...args: unknown[]) => mockFindEmailTemplates(...args),
  findEmailTemplate: (...args: unknown[]) => mockFindEmailTemplate(...args),
  updateEmailTemplate: (...args: unknown[]) => mockUpdateEmailTemplate(...args),
}));

const mockPublishEmailReceived = vi.fn();
const mockPublishCallCompleted = vi.fn();

vi.mock('../events.js', () => ({
  publishEmailReceived: (...args: unknown[]) => mockPublishEmailReceived(...args),
  publishCallCompleted: (...args: unknown[]) => mockPublishCallCompleted(...args),
}));

const mockTx = {};
const mockTransaction = vi.fn((cb: Function) => cb(mockTx));
const mockPrisma = {
  $transaction: mockTransaction,
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createActivity,
  getActivities,
  getActivity,
  getTimeline,
  logCall,
  getCallLog,
  sendEmail,
  renderTemplate,
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  connectEmailSync,
  getEmailSyncs,
  syncEmails,
  disconnectEmailSync,
} from '../service.js';

import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createActivity ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createActivity', () => {
  it('delegates to repository', async () => {
    const input = {
      type: 'EMAIL' as const,
      direction: 'INBOUND' as const,
      contactId: 'contact-1',
      subject: 'Hello',
      body: 'Test body',
    };
    const expected = { id: 'act-1', ...input, tenantId: TENANT_ID };
    mockCreateActivity.mockResolvedValue(expected);

    const result = await createActivity(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateActivity).toHaveBeenCalledWith(TENANT_ID, input, ACTOR_ID);
    expect(result).toEqual(expected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getActivities ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getActivities', () => {
  it('returns paginated activities', async () => {
    const activity = { id: 'act-1', type: 'EMAIL', subject: 'Test' };
    mockFindActivities.mockResolvedValue({ data: [activity], total: 1 });

    const result = await getActivities(TENANT_ID, {}, { page: 1, limit: 20 });

    expect(result).toEqual({
      data: [activity],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(mockFindActivities).toHaveBeenCalledWith(TENANT_ID, {}, { page: 1, limit: 20 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getActivity ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getActivity', () => {
  it('delegates to repository', async () => {
    const activity = { id: 'act-1', type: 'NOTE' };
    mockFindActivity.mockResolvedValue(activity);

    const result = await getActivity(TENANT_ID, 'act-1');

    expect(mockFindActivity).toHaveBeenCalledWith(TENANT_ID, 'act-1');
    expect(result).toEqual(activity);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getTimeline ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTimeline', () => {
  it('returns paginated timeline entries', async () => {
    const activity1 = { id: 'act-1', type: 'EMAIL', createdAt: '2025-01-01' };
    const activity2 = { id: 'act-2', type: 'CALL', createdAt: '2025-01-02' };
    mockGetTimeline.mockResolvedValue({ data: [activity1, activity2], total: 2 });

    const result = await getTimeline(
      TENANT_ID,
      { contactId: 'contact-1' },
      { page: 1, limit: 20 },
    );

    expect(result).toEqual({
      data: [activity1, activity2],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(mockGetTimeline).toHaveBeenCalledWith(
      TENANT_ID,
      { contactId: 'contact-1' },
      { page: 1, limit: 20 },
    );
  });

  it('handles empty timeline', async () => {
    mockGetTimeline.mockResolvedValue({ data: [], total: 0 });

    const result = await getTimeline(TENANT_ID, {}, { page: 1, limit: 20 });

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── logCall ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('logCall', () => {
  const baseCallInput = {
    contactId: 'contact-1',
    fromNumber: '+1111111111',
    toNumber: '+1234567890',
    duration: 120,
    subject: 'Sales call',
    body: 'Discussed pricing',
  };

  it('creates activity and call log in transaction', async () => {
    const activity = { id: 'act-1', type: 'CALL', subject: 'Sales call' };
    const callLog = { id: 'cl-1', activityId: 'act-1', status: 'COMPLETED' };
    mockCreateActivity.mockResolvedValue(activity);
    mockCreateCallLog.mockResolvedValue(callLog);

    const result = await logCall(TENANT_ID, baseCallInput, ACTOR_ID);

    expect(mockCreateActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        type: 'CALL',
        direction: 'OUTBOUND',
        contactId: 'contact-1',
        subject: 'Sales call',
      }),
      ACTOR_ID,
      mockTx,
    );
    expect(mockCreateCallLog).toHaveBeenCalledWith(
      TENANT_ID,
      'act-1',
      expect.objectContaining({
        fromNumber: '+1111111111',
        toNumber: '+1234567890',
        duration: 120,
      }),
      mockTx,
    );
    expect(mockPublishCallCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      callLog,
    );
    expect(result).toEqual({ ...activity, callLog });
  });

  it('defaults to COMPLETED status when not provided', async () => {
    const input = { ...baseCallInput, status: undefined };
    const activity = { id: 'act-1', type: 'CALL' };
    const callLog = { id: 'cl-1', status: 'COMPLETED' };
    mockCreateActivity.mockResolvedValue(activity);
    mockCreateCallLog.mockResolvedValue(callLog);

    await logCall(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateCallLog).toHaveBeenCalledWith(
      TENANT_ID,
      'act-1',
      expect.objectContaining({ status: 'COMPLETED' }),
      mockTx,
    );
  });

  it('generates subject from toNumber when not provided', async () => {
    const input = { ...baseCallInput, subject: undefined };
    const activity = { id: 'act-1', type: 'CALL' };
    const callLog = { id: 'cl-1' };
    mockCreateActivity.mockResolvedValue(activity);
    mockCreateCallLog.mockResolvedValue(callLog);

    await logCall(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ subject: 'Call to +1234567890' }),
      ACTOR_ID,
      mockTx,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getCallLog ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCallLog', () => {
  it('delegates to repository', async () => {
    const callLog = { id: 'cl-1', activityId: 'act-1' };
    mockFindCallLog.mockResolvedValue(callLog);

    const result = await getCallLog(TENANT_ID, 'act-1');

    expect(mockFindCallLog).toHaveBeenCalledWith(TENANT_ID, 'act-1');
    expect(result).toEqual(callLog);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── sendEmail ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('sendEmail', () => {
  it('creates email activity with provided content', async () => {
    const input = {
      contactId: 'contact-1',
      subject: 'Hello',
      body: '<p>Hi there</p>',
    };
    const activity = { id: 'act-1', type: 'EMAIL', direction: 'OUTBOUND', subject: 'Hello' };
    mockCreateActivity.mockResolvedValue(activity);

    const result = await sendEmail(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        type: 'EMAIL',
        direction: 'OUTBOUND',
        contactId: 'contact-1',
        subject: 'Hello',
        body: '<p>Hi there</p>',
      }),
      ACTOR_ID,
    );
    expect(result).toEqual(activity);
  });

  it('renders template when templateId is provided', async () => {
    const template = {
      id: 'tpl-1',
      subject: 'Welcome {{firstName}}',
      bodyHtml: '<p>Hello {{firstName}}, welcome aboard!</p>',
    };
    mockFindEmailTemplate.mockResolvedValue(template);

    const input = {
      contactId: 'contact-1',
      templateId: 'tpl-1',
      mergeContext: { firstName: 'John' },
    };
    const activity = { id: 'act-1', type: 'EMAIL', subject: 'Welcome John' };
    mockCreateActivity.mockResolvedValue(activity);

    await sendEmail(TENANT_ID, input, ACTOR_ID);

    expect(mockFindEmailTemplate).toHaveBeenCalledWith(TENANT_ID, 'tpl-1');
    expect(mockCreateActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        subject: 'Welcome John',
        body: '<p>Hello John, welcome aboard!</p>',
      }),
      ACTOR_ID,
    );
  });

  it('publishes email received event', async () => {
    const input = { contactId: 'contact-1', subject: 'Test', body: 'Body' };
    const activity = { id: 'act-1', type: 'EMAIL' };
    mockCreateActivity.mockResolvedValue(activity);

    await sendEmail(TENANT_ID, input, ACTOR_ID);

    expect(mockPublishEmailReceived).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID, activity);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── renderTemplate ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('renderTemplate', () => {
  it('replaces merge fields in subject and body', () => {
    const template = {
      subject: 'Hi {{name}}',
      bodyHtml: '<p>Hello {{name}}, your order {{orderId}}</p>',
    };
    const context = { name: 'Alice', orderId: '123' };

    const result = renderTemplate(template, context);

    expect(result.subject).toBe('Hi Alice');
    expect(result.bodyHtml).toBe('<p>Hello Alice, your order 123</p>');
  });

  it('handles missing merge context values gracefully', () => {
    const template = {
      subject: 'Hello {{unknown}}',
      bodyHtml: '<p>Dear {{unknown}}</p>',
    };

    const result = renderTemplate(template, {});

    // Unresolved placeholders should remain or be replaced with empty string
    // Based on the implementation, unmatched keys stay as-is since there's no
    // catch-all replacement. The loop only replaces known keys.
    expect(result.subject).toBe('Hello {{unknown}}');
    expect(result.bodyHtml).toBe('<p>Dear {{unknown}}</p>');
  });

  it('handles empty merge context', () => {
    const template = {
      subject: 'No placeholders here',
      bodyHtml: '<p>Static content</p>',
    };

    const result = renderTemplate(template, {});

    expect(result.subject).toBe('No placeholders here');
    expect(result.bodyHtml).toBe('<p>Static content</p>');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Templates ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Email Templates', () => {
  it('createEmailTemplate delegates to repository', async () => {
    const input = {
      name: 'Welcome',
      subject: 'Welcome {{name}}',
      bodyHtml: '<p>Welcome</p>',
      category: 'onboarding',
    };
    const expected = { id: 'tpl-1', ...input };
    mockCreateEmailTemplate.mockResolvedValue(expected);

    const result = await createEmailTemplate(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateEmailTemplate).toHaveBeenCalledWith(TENANT_ID, input, ACTOR_ID);
    expect(result).toEqual(expected);
  });

  it('getEmailTemplates returns paginated result', async () => {
    const template = { id: 'tpl-1', name: 'Welcome' };
    mockFindEmailTemplates.mockResolvedValue({ data: [template], total: 1 });

    const result = await getEmailTemplates(TENANT_ID, {}, { page: 1, limit: 20 });

    expect(result).toEqual({
      data: [template],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(mockFindEmailTemplates).toHaveBeenCalledWith(TENANT_ID, {}, { page: 1, limit: 20 });
  });

  it('getEmailTemplate delegates to repository', async () => {
    const template = { id: 'tpl-1', name: 'Welcome' };
    mockFindEmailTemplate.mockResolvedValue(template);

    const result = await getEmailTemplate(TENANT_ID, 'tpl-1');

    expect(mockFindEmailTemplate).toHaveBeenCalledWith(TENANT_ID, 'tpl-1');
    expect(result).toEqual(template);
  });

  it('updateEmailTemplate passes version for optimistic locking', async () => {
    const input = { name: 'Updated Welcome', version: 2 };
    const expected = { id: 'tpl-1', name: 'Updated Welcome', version: 3 };
    mockUpdateEmailTemplate.mockResolvedValue(expected);

    const result = await updateEmailTemplate(TENANT_ID, 'tpl-1', input, ACTOR_ID);

    expect(mockUpdateEmailTemplate).toHaveBeenCalledWith(TENANT_ID, 'tpl-1', input, 2);
    expect(result).toEqual(expected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Email Sync ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Email Sync', () => {
  it('connectEmailSync creates sync for new provider', async () => {
    mockFindEmailSync.mockResolvedValue(null);
    const syncRecord = { id: 'sync-1', provider: 'GMAIL', status: 'ACTIVE' };
    mockCreateEmailSync.mockResolvedValue(syncRecord);

    const input = { provider: 'GMAIL', accessToken: 'tok-123', refreshToken: 'ref-123' };
    const result = await connectEmailSync(TENANT_ID, ACTOR_ID, input);

    expect(mockFindEmailSync).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID, 'GMAIL');
    expect(mockCreateEmailSync).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID, input);
    expect(result).toEqual(syncRecord);
  });

  it('connectEmailSync rejects duplicate provider', async () => {
    mockFindEmailSync.mockResolvedValue({ id: 'sync-1', provider: 'GMAIL' });

    const input = { provider: 'GMAIL', accessToken: 'tok-123', refreshToken: 'ref-123' };

    await expect(connectEmailSync(TENANT_ID, ACTOR_ID, input)).rejects.toThrow(
      ValidationError,
    );
    expect(mockCreateEmailSync).not.toHaveBeenCalled();
  });

  it('getEmailSyncs delegates to repository', async () => {
    const syncs = [{ id: 'sync-1', provider: 'GMAIL' }];
    mockFindEmailSyncs.mockResolvedValue(syncs);

    const result = await getEmailSyncs(TENANT_ID, ACTOR_ID);

    expect(mockFindEmailSyncs).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID);
    expect(result).toEqual(syncs);
  });

  it('disconnectEmailSync updates status to DISCONNECTED', async () => {
    const sync = { id: 'sync-1', provider: 'GMAIL', status: 'ACTIVE' };
    mockFindEmailSync.mockResolvedValue(sync);
    mockUpdateEmailSyncStatus.mockResolvedValue({ ...sync, status: 'DISCONNECTED' });

    const result = await disconnectEmailSync(TENANT_ID, ACTOR_ID, 'GMAIL');

    expect(mockFindEmailSync).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID, 'GMAIL');
    expect(mockUpdateEmailSyncStatus).toHaveBeenCalledWith('sync-1', 'DISCONNECTED');
    expect(result).toEqual({ ...sync, status: 'DISCONNECTED' });
  });

  it('disconnectEmailSync throws when sync not found', async () => {
    mockFindEmailSync.mockResolvedValue(null);

    await expect(
      disconnectEmailSync(TENANT_ID, ACTOR_ID, 'GMAIL'),
    ).rejects.toThrow(NotFoundError);
    expect(mockUpdateEmailSyncStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── syncEmails ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('syncEmails', () => {
  it('updates lastSyncAt for all user syncs', async () => {
    const sync1 = { id: 'sync-1', provider: 'GMAIL', status: 'ACTIVE' };
    const sync2 = { id: 'sync-2', provider: 'OUTLOOK', status: 'ACTIVE' };
    mockFindEmailSyncs.mockResolvedValue([sync1, sync2]);
    mockUpdateEmailSyncStatus.mockResolvedValue(undefined);

    const result = await syncEmails(TENANT_ID, ACTOR_ID);

    expect(mockFindEmailSyncs).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID);
    expect(mockUpdateEmailSyncStatus).toHaveBeenCalledTimes(2);
    expect(mockUpdateEmailSyncStatus).toHaveBeenCalledWith(
      'sync-1',
      'ACTIVE',
      expect.any(Date),
    );
    expect(mockUpdateEmailSyncStatus).toHaveBeenCalledWith(
      'sync-2',
      'ACTIVE',
      expect.any(Date),
    );
    expect(result).toEqual({ synced: 2 });
  });

  it('throws when no syncs found', async () => {
    mockFindEmailSyncs.mockResolvedValue([]);

    await expect(syncEmails(TENANT_ID, ACTOR_ID)).rejects.toThrow(NotFoundError);
  });
});
