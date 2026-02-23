import { getPrismaClient } from '@softcrm/db';
import { generateId, NotFoundError } from '@softcrm/shared-kernel';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreateFieldDefInput {
  tenantId: string;
  module: string;
  entity: string;
  fieldName: string;
  fieldType: string;
  label: string;
  required?: boolean;
  options?: unknown;
  sortOrder?: number;
}

export interface UpdateFieldDefInput {
  label?: string;
  required?: boolean;
  options?: unknown;
  sortOrder?: number;
}

// ── Create field definition ────────────────────────────────────────────────────

export async function createFieldDef(data: CreateFieldDefInput) {
  const db = getPrismaClient();

  return db.customFieldDef.create({
    data: {
      id: generateId(),
      tenantId: data.tenantId,
      module: data.module,
      entity: data.entity,
      fieldName: data.fieldName,
      fieldType: data.fieldType as never,
      label: data.label,
      required: data.required ?? false,
      options: data.options ?? undefined,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

// ── Update field definition ────────────────────────────────────────────────────

export async function updateFieldDef(
  tenantId: string,
  fieldDefId: string,
  data: UpdateFieldDefInput,
) {
  const db = getPrismaClient();

  const existing = await db.customFieldDef.findFirst({
    where: { id: fieldDefId, tenantId },
  });

  if (!existing) {
    throw new NotFoundError(`Custom field definition ${fieldDefId} not found`);
  }

  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) {
    updateData['label'] = data.label;
  }
  if (data.required !== undefined) {
    updateData['required'] = data.required;
  }
  if (data.options !== undefined) {
    updateData['options'] = data.options;
  }
  if (data.sortOrder !== undefined) {
    updateData['sortOrder'] = data.sortOrder;
  }

  return db.customFieldDef.update({
    where: { id: fieldDefId },
    data: updateData,
  });
}

// ── Delete field definition (cascades to values) ───────────────────────────────

export async function deleteFieldDef(tenantId: string, fieldDefId: string) {
  const db = getPrismaClient();

  const existing = await db.customFieldDef.findFirst({
    where: { id: fieldDefId, tenantId },
  });

  if (!existing) {
    throw new NotFoundError(`Custom field definition ${fieldDefId} not found`);
  }

  await db.customFieldDef.delete({
    where: { id: fieldDefId },
  });
}

// ── Get field definitions ──────────────────────────────────────────────────────

export async function getFieldDefs(tenantId: string, module: string, entity: string) {
  const db = getPrismaClient();

  return db.customFieldDef.findMany({
    where: { tenantId, module, entity },
    orderBy: { sortOrder: 'asc' },
  });
}

// ── Get a single field definition ──────────────────────────────────────────────

export async function getFieldDefById(tenantId: string, fieldDefId: string) {
  const db = getPrismaClient();

  const def = await db.customFieldDef.findFirst({
    where: { id: fieldDefId, tenantId },
  });

  if (!def) {
    throw new NotFoundError(`Custom field definition ${fieldDefId} not found`);
  }

  return def;
}

// ── Upsert field value ─────────────────────────────────────────────────────────

export async function upsertFieldValue(
  fieldDefId: string,
  recordId: string,
  value: string,
) {
  const db = getPrismaClient();

  return db.customFieldValue.upsert({
    where: {
      fieldDefId_recordId: { fieldDefId, recordId },
    },
    update: { value },
    create: {
      id: generateId(),
      fieldDefId,
      recordId,
      value,
    },
  });
}

// ── Get field values for a record (with defs) ──────────────────────────────────

export async function getFieldValuesByRecord(recordId: string) {
  const db = getPrismaClient();

  return db.customFieldValue.findMany({
    where: { recordId },
    include: { fieldDef: true },
  });
}
