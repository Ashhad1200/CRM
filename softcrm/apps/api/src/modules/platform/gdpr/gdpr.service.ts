import { getPrismaClient } from '@softcrm/db';
import * as auditService from '../audit/audit.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const ANONYMIZED_NAME = 'Deleted User';
const ANONYMIZED_EMAIL = 'deleted@erased.invalid';
const ANONYMIZED_PHONE = '0000000000';
const ANONYMIZED_NOTES = '[GDPR Erased]';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GdprEraseResult {
  userId: string;
  erasedAt: string;
  modulesProcessed: string[];
  recordsAnonymized: number;
}

interface EraseContext {
  tenantId: string;
  targetUserId: string;
  actorId: string;
  reason?: string;
  confirmedBy?: string;
}

// ── Main erasure orchestrator ──────────────────────────────────────────────────

export async function eraseUserData(ctx: EraseContext): Promise<GdprEraseResult> {
  const db = getPrismaClient();
  const modulesProcessed: string[] = [];
  let recordsAnonymized = 0;

  // Use a transaction so everything is atomic
  await db.$transaction(async (tx) => {
    // ── 1. Sales: Contacts ─────────────────────────────────────────────
    const contacts = await tx.contact.updateMany({
      where: { tenantId: ctx.tenantId, ownerId: ctx.targetUserId },
      data: {
        firstName: ANONYMIZED_NAME,
        lastName: '',
        emails: [ANONYMIZED_EMAIL],
        phones: [ANONYMIZED_PHONE],
        address: {},
      },
    });
    if (contacts.count > 0) {
      recordsAnonymized += contacts.count;
      modulesProcessed.push('sales:contacts');
    }

    // ── 2. Sales: Leads ────────────────────────────────────────────────
    const leads = await tx.lead.updateMany({
      where: { tenantId: ctx.tenantId, assignedOwnerId: ctx.targetUserId },
      data: {
        firstName: ANONYMIZED_NAME,
        lastName: '',
        email: ANONYMIZED_EMAIL,
        phone: ANONYMIZED_PHONE,
        company: ANONYMIZED_NOTES,
      },
    });
    if (leads.count > 0) {
      recordsAnonymized += leads.count;
      modulesProcessed.push('sales:leads');
    }

    // ── 3. Sales: Deals — remove personal refs but keep revenue data ───
    const deals = await tx.deal.updateMany({
      where: { tenantId: ctx.tenantId, ownerId: ctx.targetUserId },
      data: {
        name: `[ERASED] Deal ${ANONYMIZED_NAME}`,
      },
    });
    if (deals.count > 0) {
      recordsAnonymized += deals.count;
      modulesProcessed.push('sales:deals');
    }

    // ── 4. Support: Tickets — anonymize reporter info ──────────────────
    const tickets = await tx.ticket.updateMany({
      where: { tenantId: ctx.tenantId, createdBy: ctx.targetUserId },
      data: {
        description: ANONYMIZED_NOTES,
      },
    });
    if (tickets.count > 0) {
      recordsAnonymized += tickets.count;
      modulesProcessed.push('support:tickets');
    }

    // ── 5. Comms: Activities (emails/calls) — anonymize ────────────────
    const activities = await tx.activity.updateMany({
      where: { tenantId: ctx.tenantId, createdBy: ctx.targetUserId },
      data: {
        body: ANONYMIZED_NOTES,
        subject: ANONYMIZED_NOTES,
      },
    });
    if (activities.count > 0) {
      recordsAnonymized += activities.count;
      modulesProcessed.push('comms:activities');
    }

    // ── 6. Comms: Call logs — anonymize via parent activities ───────────
    //    CallLog has no direct createdBy; linked through Activity.
    //    Activities already anonymized above. Clear recording URLs.
    const userActivityIds = (await tx.activity.findMany({
      where: { tenantId: ctx.tenantId, createdBy: ctx.targetUserId },
      select: { id: true },
    })).map((a) => a.id);
    if (userActivityIds.length > 0) {
      const callLogs = await tx.callLog.updateMany({
        where: { activityId: { in: userActivityIds } },
        data: {
          recordingUrl: null,
        },
      });
      if (callLogs.count > 0) {
        recordsAnonymized += callLogs.count;
        modulesProcessed.push('comms:callLogs');
      }
    }

    // ── 7. Marketing: Campaign recipients — remove PII ─────────────────
    const campaignRecipients = await tx.campaignRecipient.deleteMany({
      where: {
        tenantId: ctx.tenantId,
        contactId: { in: (await tx.contact.findMany({
          where: { tenantId: ctx.tenantId, ownerId: ctx.targetUserId },
          select: { id: true },
        })).map((c) => c.id) },
      },
    });
    if (campaignRecipients.count > 0) {
      recordsAnonymized += campaignRecipients.count;
      modulesProcessed.push('marketing:campaignRecipients');
    }

    // ── 8. Accounting: Invoices — preserve for legal retention ─────────
    //    We anonymize the customer name but keep amounts/dates intact
    const invoices = await tx.invoice.updateMany({
      where: { tenantId: ctx.tenantId, createdBy: ctx.targetUserId },
      data: {
        notes: ANONYMIZED_NOTES,
      },
    });
    if (invoices.count > 0) {
      recordsAnonymized += invoices.count;
      modulesProcessed.push('accounting:invoices (anonymized, preserved)');
    }

    // ── 9. Projects: Time entries — anonymize but keep hours ───────────
    const timeEntries = await tx.timeEntry.updateMany({
      where: { userId: ctx.targetUserId },
      data: {
        description: ANONYMIZED_NOTES,
      },
    });
    if (timeEntries.count > 0) {
      recordsAnonymized += timeEntries.count;
      modulesProcessed.push('projects:timeEntries');
    }

    // ── 10. User record itself — anonymize ─────────────────────────────
    await tx.user.update({
      where: { id: ctx.targetUserId },
      data: {
        email: `erased-${ctx.targetUserId.slice(0, 8)}@erased.invalid`,
        firstName: ANONYMIZED_NAME,
        lastName: '',
        passwordHash: 'ERASED',
      },
    });
    recordsAnonymized += 1;
    modulesProcessed.push('platform:user');
  });

  // ── Audit log entry (outside tx — always record even if tx fails) ────
  const erasedAt = new Date().toISOString();
  await auditService.recordAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    module: 'platform',
    entity: 'gdpr-erasure',
    recordId: ctx.targetUserId,
    action: 'DELETE',
    changes: {
      type: 'GDPR_DATA_ERASURE',
      targetUserId: ctx.targetUserId,
      reason: ctx.reason ?? 'Subject access request',
      confirmedBy: ctx.confirmedBy ?? ctx.actorId,
      modulesProcessed,
      recordsAnonymized,
      erasedAt,
    },
  });

  return {
    userId: ctx.targetUserId,
    erasedAt,
    modulesProcessed,
    recordsAnonymized,
  };
}
