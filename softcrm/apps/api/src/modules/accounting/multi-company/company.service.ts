import { getPrismaClient } from '@softcrm/db';
import { generateId, NotFoundError } from '@softcrm/shared-kernel';

/**
 * List all companies for a tenant.
 */
export async function getCompanies(tenantId: string) {
  const db = getPrismaClient();

  return db.company.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get a single company by ID.
 */
export async function getCompany(tenantId: string, companyId: string) {
  const db = getPrismaClient();

  const company = await db.company.findFirst({
    where: { id: companyId, tenantId },
  });

  if (!company) {
    throw new NotFoundError('Company', companyId);
  }
  return company;
}

/**
 * Create a new company.
 */
export async function createCompany(
  tenantId: string,
  data: {
    name: string;
    code: string;
    baseCurrency?: string;
    fiscalYearEnd?: number;
    address?: Record<string, unknown>;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  return db.company.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      code: data.code,
      ...(data.baseCurrency ? { baseCurrency: data.baseCurrency as never } : {}),
      ...(data.fiscalYearEnd !== undefined ? { fiscalYearEnd: data.fiscalYearEnd } : {}),
      ...(data.address ? { address: data.address as never } : {}),
    },
  });
}

/**
 * Update company fields.
 */
export async function updateCompany(
  tenantId: string,
  companyId: string,
  data: {
    name?: string;
    baseCurrency?: string;
    fiscalYearEnd?: number;
    isActive?: boolean;
    address?: Record<string, unknown>;
  },
) {
  const db = getPrismaClient();

  const existing = await db.company.findFirst({
    where: { id: companyId, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Company', companyId);
  }

  return db.company.update({
    where: { id: companyId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.baseCurrency !== undefined ? { baseCurrency: data.baseCurrency as never } : {}),
      ...(data.fiscalYearEnd !== undefined ? { fiscalYearEnd: data.fiscalYearEnd } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.address !== undefined ? { address: data.address as never } : {}),
    },
  });
}

/**
 * Set a company as the default for the tenant (unsets others).
 */
export async function setDefaultCompany(tenantId: string, companyId: string) {
  const db = getPrismaClient();

  const existing = await db.company.findFirst({
    where: { id: companyId, tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Company', companyId);
  }

  return db.$transaction([
    db.company.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    }),
    db.company.update({
      where: { id: companyId },
      data: { isDefault: true },
    }),
  ]);
}
