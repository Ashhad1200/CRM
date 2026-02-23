/**
 * Comms module — email sync service (stubbed).
 *
 * Provides stubbed implementations for OAuth flows and email fetching.
 * Real implementations would integrate with Gmail API and Microsoft Graph.
 */

import { logger } from '../../logger.js';
import * as repo from './repository.js';

// ── Gmail OAuth ────────────────────────────────────────────────────────────────

/**
 * Get the Gmail OAuth consent URL.
 * TODO: Real implementation would use Google OAuth2 client to generate
 * the consent URL with appropriate scopes (gmail.readonly, gmail.send).
 */
export function getGmailAuthUrl(tenantId: string, userId: string): string {
  logger.info({ tenantId, userId }, 'Generating Gmail OAuth URL (stub)');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=STUB&redirect_uri=STUB&scope=gmail.readonly+gmail.send&state=${tenantId}:${userId}&response_type=code`;
}

/**
 * Handle the Gmail OAuth callback — exchange code for tokens.
 * TODO: Real implementation would:
 * 1. Exchange `code` for access + refresh tokens via Google OAuth2
 * 2. Create or update the EmailSync record
 * 3. Trigger initial fetch of recent emails
 */
export async function handleGmailCallback(
  tenantId: string,
  userId: string,
  code: string,
): Promise<void> {
  logger.info(
    { tenantId, userId, codeLength: code.length },
    'Handling Gmail OAuth callback (stub)',
  );

  // Stub: In production, exchange `code` for real tokens
  await repo.createEmailSync(tenantId, userId, {
    provider: 'GMAIL',
    accessToken: `stub-gmail-access-${code.slice(0, 8)}`,
    refreshToken: `stub-gmail-refresh-${code.slice(0, 8)}`,
  });
}

// ── Outlook OAuth ──────────────────────────────────────────────────────────────

/**
 * Get the Outlook/Microsoft OAuth consent URL.
 * TODO: Real implementation would use MSAL (Microsoft Authentication Library)
 * to generate consent URL with Mail.Read, Mail.Send scopes.
 */
export function getOutlookAuthUrl(tenantId: string, userId: string): string {
  logger.info({ tenantId, userId }, 'Generating Outlook OAuth URL (stub)');
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=STUB&redirect_uri=STUB&scope=Mail.Read+Mail.Send&state=${tenantId}:${userId}&response_type=code`;
}

/**
 * Handle the Outlook OAuth callback — exchange code for tokens.
 * TODO: Real implementation would:
 * 1. Exchange `code` for access + refresh tokens via MSAL
 * 2. Create or update the EmailSync record
 * 3. Trigger initial fetch of recent emails
 */
export async function handleOutlookCallback(
  tenantId: string,
  userId: string,
  code: string,
): Promise<void> {
  logger.info(
    { tenantId, userId, codeLength: code.length },
    'Handling Outlook OAuth callback (stub)',
  );

  // Stub: In production, exchange `code` for real tokens
  await repo.createEmailSync(tenantId, userId, {
    provider: 'OUTLOOK',
    accessToken: `stub-outlook-access-${code.slice(0, 8)}`,
    refreshToken: `stub-outlook-refresh-${code.slice(0, 8)}`,
  });
}

// ── Email Fetching ─────────────────────────────────────────────────────────────

/**
 * Fetch new emails from the configured provider.
 * TODO: Real implementation would:
 * 1. Load the EmailSync record for credentials
 * 2. Call Gmail API (users.messages.list) or Microsoft Graph (/me/messages)
 * 3. Parse email headers, body, and attachments
 * 4. Create Activity records for each new email
 * 5. Match emails to contacts via `matchEmailToContact`
 */
export async function fetchNewEmails(
  _tenantId: string,
  _emailSyncId: string,
): Promise<unknown[]> {
  logger.info({ _emailSyncId }, 'Fetching new emails (stub — returns empty)');
  return [];
}

/**
 * Match an email sender to an existing contact.
 * TODO: Real implementation would query the Contact model by email address
 * and return the matching contact ID.
 */
export async function matchEmailToContact(
  _tenantId: string,
  _fromEmail: string,
): Promise<string | null> {
  logger.info({ _fromEmail }, 'Matching email to contact (stub — returns null)');
  return null;
}
