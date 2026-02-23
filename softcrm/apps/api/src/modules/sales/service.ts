/**
 * Sales module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ValidationError,
  generateId,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as events from './events.js';

import type {
  ContactFilters,
  LeadFilters,
  DealFilters,
  DealWithRelations,
  QuoteWithLines,
  LeadConversionResult,
} from './types.js';
import type {
  CreateContactInput,
  UpdateContactInput,
  CreateAccountInput,
  UpdateAccountInput,
  CreateLeadInput,
  ConvertLeadInput,
  CreateDealInput,
  UpdateDealInput,
  CreateQuoteInput,
} from './validators.js';
import type { OwnershipScope, Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Contacts ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createContact(
  tenantId: string,
  data: CreateContactInput,
  actorId: string,
) {
  return repo.createContact(tenantId, data, actorId);
}

export async function updateContact(
  tenantId: string,
  id: string,
  data: UpdateContactInput,
  actorId: string,
) {
  return repo.updateContact(tenantId, id, data, actorId);
}

export async function getContacts(
  tenantId: string,
  filters: ContactFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findContacts(tenantId, filters, pagination, ownershipScope);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getContact(tenantId: string, id: string) {
  const contact = await repo.findContact(tenantId, id);
  // repo.findContact already throws NotFoundError
  return contact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Accounts ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAccount(
  tenantId: string,
  data: CreateAccountInput,
  actorId: string,
) {
  return repo.createAccount(tenantId, data, actorId);
}

export async function updateAccount(
  tenantId: string,
  id: string,
  data: UpdateAccountInput,
  actorId: string,
) {
  return repo.updateAccount(tenantId, id, data, actorId);
}

export async function getAccounts(
  tenantId: string,
  filters: repo.AccountFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findAccounts(tenantId, filters, pagination, ownershipScope);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getAccount(tenantId: string, id: string) {
  const account = await repo.findAccount(tenantId, id);
  // repo.findAccount already throws NotFoundError
  return account;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Leads ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate an initial lead score.
 *  - Base: 10
 *  - +10 if company is present
 *  - +5 if phone is present
 *  - +15 if source is REFERRAL or PARTNER
 */
function calculateLeadScore(data: CreateLeadInput): number {
  let score = 10;
  if (data.company) score += 10;
  if (data.phone) score += 5;
  if (data.source === 'REFERRAL' || data.source === 'PARTNER') score += 15;
  return score;
}

export async function captureLead(
  tenantId: string,
  data: CreateLeadInput,
  actorId: string,
) {
  const score = calculateLeadScore(data);

  // Auto-assignment is deferred — leave ownerId null for now.
  // Future: implement round-robin based on sales-role user workload.
  const lead = await repo.createLead(tenantId, data, actorId);

  // Patch score onto the created lead (repo.createLead uses Prisma defaults)
  const db = getPrismaClient();
  await db.lead.update({
    where: { id: lead.id },
    data: { score },
  });

  await events.publishLeadCreated(tenantId, actorId, {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    source: String(lead.source),
  });

  return { ...lead, score };
}

export async function convertLead(
  tenantId: string,
  leadId: string,
  options: ConvertLeadInput,
  actorId: string,
): Promise<LeadConversionResult> {
  const lead = await repo.findLead(tenantId, leadId);
  if (!lead) {
    throw new NotFoundError('Lead', leadId);
  }
  if (lead.status === 'CONVERTED') {
    throw new ValidationError('Lead has already been converted');
  }

  const db = getPrismaClient();

  const result = await db.$transaction(async (tx) => {
    let contactId: string | null = null;
    let accountId: string | null = options.accountId ?? null;
    let dealId: string | null = null;

    // ── Create contact from lead data ──
    if (options.createContact) {
      const contact = await tx.contact.create({
        data: {
          tenantId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          emails: lead.email ? [lead.email] : [],
          phones: lead.phone ? [lead.phone] : [],
          company: lead.company,
          jobTitle: lead.jobTitle,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      contactId = contact.id;
    }

    // ── Resolve or create account ──
    if (!accountId && lead.company) {
      const account = await tx.account.create({
        data: {
          tenantId,
          name: lead.company,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      accountId = account.id;
    }

    // ── Create deal if requested ──
    if (options.createDeal) {
      let pipelineId = options.pipelineId ?? null;
      let stageId: string | null = null;

      if (!pipelineId) {
        // Find the default pipeline
        const defaultPipeline = await tx.pipeline.findFirst({
          where: { tenantId, isDefault: true },
          include: { stages: { orderBy: { order: 'asc' } } },
        });
        if (defaultPipeline) {
          pipelineId = defaultPipeline.id;
          const firstStage = defaultPipeline.stages[0];
          stageId = firstStage?.id ?? null;
        }
      } else {
        // Fetch stages for the specified pipeline
        const pipeline = await tx.pipeline.findFirst({
          where: { id: pipelineId, tenantId },
          include: { stages: { orderBy: { order: 'asc' } } },
        });
        if (pipeline) {
          const firstStage = pipeline.stages[0];
          stageId = firstStage?.id ?? null;
        }
      }

      if (pipelineId && stageId) {
        const dealName =
          options.dealName ?? `${lead.firstName} ${lead.lastName} - Deal`;

        const deal = await tx.deal.create({
          data: {
            tenantId,
            name: dealName,
            pipelineId,
            stageId,
            ownerId: lead.assignedOwnerId,
            accountId,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
        dealId = deal.id;

        // Link contact to deal
        if (contactId) {
          await tx.dealContact.create({
            data: {
              dealId: deal.id,
              contactId,
              isPrimary: true,
            },
          });
        }
      }
    }

    // ── Mark lead as converted ──
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: 'CONVERTED' as never,
        convertedContactId: contactId,
        convertedDealId: dealId,
        convertedAt: new Date(),
        version: { increment: 1 },
        updatedBy: actorId,
      },
    });

    return {
      leadId,
      contactId: contactId ?? '',
      accountId,
      dealId,
    };
  });

  await events.publishLeadConverted(tenantId, actorId, {
    leadId: result.leadId,
    contactId: result.contactId,
    accountId: result.accountId ?? '',
    dealId: result.dealId ?? '',
  });

  return result;
}

export async function getLeads(
  tenantId: string,
  filters: LeadFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findLeads(tenantId, filters, pagination);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getLead(tenantId: string, id: string) {
  const lead = await repo.findLead(tenantId, id);
  if (!lead) {
    throw new NotFoundError('Lead', id);
  }
  return lead;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Deals ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createDeal(
  tenantId: string,
  data: CreateDealInput,
  actorId: string,
) {
  // Pre-compute weighted value from value and the stage's probability
  const db = getPrismaClient();
  const stage = await db.pipelineStage.findFirst({
    where: { id: data.stageId, pipeline: { tenantId } },
  });

  const value = Number(data.value ?? 0);
  const probability = stage ? stage.probability : 0;
  const weightedValue = Math.round(value * probability) / 100;

  const deal = await repo.createDeal(tenantId, data, actorId);

  // Patch weighted / probability values
  await db.deal.update({
    where: { id: deal.id },
    data: {
      probability,
      weightedValue,
    },
  });

  return { ...deal, probability, weightedValue };
}

export async function updateDeal(
  tenantId: string,
  id: string,
  data: UpdateDealInput,
  actorId: string,
) {
  return repo.updateDeal(tenantId, id, data, actorId);
}

export async function getDeals(
  tenantId: string,
  filters: DealFilters,
  pagination: Pagination,
  ownershipScope?: OwnershipScope,
): Promise<PaginatedResult<DealWithRelations>> {
  const { data, total } = await repo.findDeals(tenantId, filters, pagination, ownershipScope);
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getDeal(tenantId: string, id: string): Promise<DealWithRelations> {
  // repo.findDeal throws NotFoundError internally
  return repo.findDeal(tenantId, id);
}

export async function moveDealStage(
  tenantId: string,
  dealId: string,
  newStageId: string,
  actorId: string,
) {
  const deal = await repo.findDeal(tenantId, dealId);

  // Validate the target stage exists and belongs to the same pipeline
  const db = getPrismaClient();
  const newStage = await db.pipelineStage.findFirst({
    where: { id: newStageId, pipelineId: deal.pipelineId },
  });
  if (!newStage) {
    throw new ValidationError(
      `Stage ${newStageId} does not exist in pipeline ${deal.pipelineId}`,
    );
  }

  const dealValue = Number(String(deal.value));
  const newWeightedValue = Math.round(dealValue * newStage.probability) / 100;

  const fromStageName = deal.stage.name;
  const toStageName = newStage.name;

  await repo.updateDealStage(
    tenantId,
    dealId,
    newStageId,
    newStage.probability,
    newWeightedValue,
    actorId,
  );

  // Update lastActivityAt
  await db.deal.update({
    where: { id: dealId },
    data: { lastActivityAt: new Date() },
  });

  await events.publishDealStageChanged(
    tenantId,
    actorId,
    { id: dealId },
    fromStageName,
    toStageName,
  );

  return repo.findDeal(tenantId, dealId);
}

export async function markDealWon(
  tenantId: string,
  dealId: string,
  actorId: string,
) {
  const deal = await repo.findDeal(tenantId, dealId);

  if (deal.wonAt) {
    throw new ValidationError('Deal is already marked as won');
  }
  if (deal.lostAt) {
    throw new ValidationError('Cannot mark a lost deal as won');
  }

  const db = getPrismaClient();
  const dealValue = Number(String(deal.value));

  await db.deal.update({
    where: { id: dealId },
    data: {
      wonAt: new Date(),
      probability: 100,
      weightedValue: dealValue,
      lastActivityAt: new Date(),
      version: { increment: 1 },
      updatedBy: actorId,
    },
  });

  const contactIds = deal.contacts.map((dc) => dc.contactId);

  await events.publishDealWon(
    tenantId,
    actorId,
    {
      id: deal.id,
      value: dealValue,
      currency: deal.currency,
      accountId: deal.accountId,
    },
    contactIds,
  );

  return repo.findDeal(tenantId, dealId);
}

export async function markDealLost(
  tenantId: string,
  dealId: string,
  reason: string,
  actorId: string,
) {
  const deal = await repo.findDeal(tenantId, dealId);

  if (deal.wonAt) {
    throw new ValidationError('Cannot mark a won deal as lost');
  }
  if (deal.lostAt) {
    throw new ValidationError('Deal is already marked as lost');
  }

  const db = getPrismaClient();

  await db.deal.update({
    where: { id: dealId },
    data: {
      lostAt: new Date(),
      lostReason: reason,
      probability: 0,
      weightedValue: 0,
      lastActivityAt: new Date(),
      version: { increment: 1 },
      updatedBy: actorId,
    },
  });

  await events.publishDealLost(tenantId, actorId, {
    id: deal.id,
    lostReason: reason,
  });

  return repo.findDeal(tenantId, dealId);
}

export async function detectRottingDeals(
  tenantId: string,
  thresholdDays: number,
): Promise<DealWithRelations[]> {
  const db = getPrismaClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const deals = await db.deal.findMany({
    where: {
      tenantId,
      wonAt: null,
      lostAt: null,
      OR: [
        { lastActivityAt: { lt: cutoff } },
        { lastActivityAt: null, createdAt: { lt: cutoff } },
      ],
    },
    include: {
      stage: true,
      pipeline: true,
      account: true,
      contacts: { include: { contact: true } },
      quotes: { include: { lines: true } },
    },
  });

  return deals as unknown as DealWithRelations[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Quotes ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createQuote(
  tenantId: string,
  data: CreateQuoteInput,
  actorId: string,
): Promise<QuoteWithLines> {
  // Validate the deal exists
  await repo.findDeal(tenantId, data.dealId);

  // Calculate financial totals from line items
  const lines = data.lines.map((line) => {
    const quantity = line.quantity;
    const unitPrice = line.unitPrice;
    const discount = line.discount ?? 0;
    const taxRate = line.taxRate ?? 0;

    const baseAmount = quantity * unitPrice;
    const discountedAmount = baseAmount * (1 - discount / 100);
    const lineTotal = discountedAmount * (1 + taxRate / 100);

    return {
      productId: line.productId,
      description: line.description,
      quantity,
      unitPrice,
      discount,
      taxRate,
      lineTotal: Math.round(lineTotal * 100) / 100,
      // Keep intermediate values for aggregate calculations
      _discountedAmount: discountedAmount,
      _discountAmount: baseAmount * (discount / 100),
      _taxAmount: discountedAmount * (taxRate / 100),
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l._discountedAmount, 0);
  const taxAmount = lines.reduce((sum, l) => sum + l._taxAmount, 0);
  const discountAmount = lines.reduce((sum, l) => sum + l._discountAmount, 0);
  const total = subtotal + taxAmount;

  const quoteNumber = await repo.getNextQuoteNumber(tenantId);

  // Strip internal calculation properties before persisting
  const persistLines = lines.map(
    ({ _discountedAmount: _d, _discountAmount: _da, _taxAmount: _t, ...rest }) => rest,
  );

  const quote = await repo.createQuote(
    tenantId,
    {
      dealId: data.dealId,
      title: data.title,
      lines: persistLines,
      currency: 'USD', // Default; extend later
      validUntil: data.validUntil,
      notes: data.notes,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      quoteNumber,
    },
    actorId,
  );

  return quote as unknown as QuoteWithLines;
}

export async function getQuotes(
  tenantId: string,
  dealId: string,
): Promise<QuoteWithLines[]> {
  return repo.findQuotes(tenantId, dealId);
}

export async function getQuote(
  tenantId: string,
  id: string,
): Promise<QuoteWithLines> {
  const quote = await repo.findQuote(tenantId, id);
  return quote as unknown as QuoteWithLines;
}

export async function submitForApproval(
  tenantId: string,
  quoteId: string,
  discountThreshold: number,
  actorId: string,
): Promise<QuoteWithLines> {
  const quote = await repo.findQuote(tenantId, quoteId);
  const quoteWithLines = quote as unknown as QuoteWithLines;

  // Check if any line exceeds the discount threshold
  const exceedsThreshold = quoteWithLines.lines.some((line) => {
    const lineDiscount = Number(line.discount);
    return lineDiscount > discountThreshold;
  });

  const approvalStatus = exceedsThreshold ? 'PENDING' : 'APPROVED';

  const updated = await repo.updateQuoteStatus(
    tenantId,
    quoteId,
    quoteWithLines.status, // Keep current status
    approvalStatus,
  );

  return updated as unknown as QuoteWithLines;
}
