import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

vi.mock('../../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockCreateEmailSync = vi.fn();
const mockFindEmailSync = vi.fn();
const mockFindEmailSyncs = vi.fn();
const mockUpdateEmailSyncStatus = vi.fn();

vi.mock('../repository.js', () => ({
  createEmailSync: (...args: unknown[]) => mockCreateEmailSync(...args),
  findEmailSync: (...args: unknown[]) => mockFindEmailSync(...args),
  findEmailSyncs: (...args: unknown[]) => mockFindEmailSyncs(...args),
  updateEmailSyncStatus: (...args: unknown[]) => mockUpdateEmailSyncStatus(...args),
}));

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  getGmailAuthUrl,
  getOutlookAuthUrl,
  handleGmailCallback,
  handleOutlookCallback,
  fetchNewEmails,
  matchEmailToContact,
} from '../email-sync.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getGmailAuthUrl ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getGmailAuthUrl', () => {
  it('returns a gmail OAuth URL containing tenant and user info', () => {
    const url = getGmailAuthUrl(TENANT_ID, USER_ID);

    expect(url).toContain('accounts.google.com');
    expect(url).toContain(`${TENANT_ID}:${USER_ID}`);
    expect(typeof url).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getOutlookAuthUrl ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getOutlookAuthUrl', () => {
  it('returns an outlook OAuth URL containing tenant and user info', () => {
    const url = getOutlookAuthUrl(TENANT_ID, USER_ID);

    expect(url).toContain('microsoftonline.com');
    expect(url).toContain(`${TENANT_ID}:${USER_ID}`);
    expect(typeof url).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── handleGmailCallback ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleGmailCallback', () => {
  it('creates email sync with Gmail provider', async () => {
    mockCreateEmailSync.mockResolvedValue({ id: 'sync-1', provider: 'GMAIL' });

    await handleGmailCallback(TENANT_ID, USER_ID, 'auth-code-12345');

    expect(mockCreateEmailSync).toHaveBeenCalledWith(
      TENANT_ID,
      USER_ID,
      expect.objectContaining({ provider: 'GMAIL' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── handleOutlookCallback ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleOutlookCallback', () => {
  it('creates email sync with Outlook provider', async () => {
    mockCreateEmailSync.mockResolvedValue({ id: 'sync-1', provider: 'OUTLOOK' });

    await handleOutlookCallback(TENANT_ID, USER_ID, 'auth-code-12345');

    expect(mockCreateEmailSync).toHaveBeenCalledWith(
      TENANT_ID,
      USER_ID,
      expect.objectContaining({ provider: 'OUTLOOK' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── fetchNewEmails ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchNewEmails', () => {
  it('returns empty array (stub)', async () => {
    const result = await fetchNewEmails(TENANT_ID, 'sync-1');

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── matchEmailToContact ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('matchEmailToContact', () => {
  it('returns null (stub)', async () => {
    const result = await matchEmailToContact(TENANT_ID, 'test@example.com');

    expect(result).toBeNull();
  });
});
