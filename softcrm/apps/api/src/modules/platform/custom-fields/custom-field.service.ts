import { ValidationError, ConflictError } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';
import * as cfRepo from './custom-field.repository.js';
import type { UpdateFieldDefInput } from './custom-field.repository.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_FIELD_TYPES = new Set([
  'TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'URL',
  'EMAIL',
  'PHONE',
  'TEXTAREA',
]);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreateFieldDefInput {
  module: string;
  entity: string;
  fieldName: string;
  fieldType: string;
  label: string;
  required?: boolean;
  options?: unknown;
  sortOrder?: number;
}

interface FieldDefForValidation {
  fieldType: string;
  required: boolean;
  options: unknown;
}

// ── Create field definition ────────────────────────────────────────────────────

export async function createFieldDef(tenantId: string, data: CreateFieldDefInput) {
  if (!VALID_FIELD_TYPES.has(data.fieldType)) {
    throw new ValidationError(`Invalid field type: ${data.fieldType}`);
  }

  // Check for duplicate
  const db = getPrismaClient();
  const existing = await db.customFieldDef.findFirst({
    where: {
      tenantId,
      module: data.module,
      entity: data.entity,
      fieldName: data.fieldName,
    },
  });

  if (existing) {
    throw new ConflictError(
      `Custom field '${data.fieldName}' already exists for ${data.module}.${data.entity}`,
    );
  }

  return cfRepo.createFieldDef({ tenantId, ...data });
}

// ── Update field definition ────────────────────────────────────────────────────

export async function updateFieldDef(
  tenantId: string,
  fieldDefId: string,
  data: UpdateFieldDefInput,
) {
  return cfRepo.updateFieldDef(tenantId, fieldDefId, data);
}

// ── Delete field definition ────────────────────────────────────────────────────

export async function deleteFieldDef(tenantId: string, fieldDefId: string) {
  return cfRepo.deleteFieldDef(tenantId, fieldDefId);
}

// ── Get field definitions ──────────────────────────────────────────────────────

export async function getFieldDefs(tenantId: string, module: string, entity: string) {
  return cfRepo.getFieldDefs(tenantId, module, entity);
}

// ── Set field value ────────────────────────────────────────────────────────────

export async function setFieldValue(
  fieldDefId: string,
  recordId: string,
  value: string,
) {
  // Fetch the def to validate
  const db = getPrismaClient();
  const fieldDef = await db.customFieldDef.findFirst({
    where: { id: fieldDefId },
  });

  if (!fieldDef) {
    throw new ValidationError(`Custom field definition ${fieldDefId} not found`);
  }

  validateFieldValue(fieldDef, value);

  return cfRepo.upsertFieldValue(fieldDefId, recordId, value);
}

// ── Get field values for a record ──────────────────────────────────────────────

export async function getFieldValues(recordId: string) {
  return cfRepo.getFieldValuesByRecord(recordId);
}

// ── Validate field value against its definition ────────────────────────────────

export function validateFieldValue(fieldDef: FieldDefForValidation, value: string): void {
  // Required check
  if (fieldDef.required && (!value || value.trim().length === 0)) {
    throw new ValidationError('Field value is required');
  }

  // Allow empty non-required
  if (!value || value.trim().length === 0) {
    return;
  }

  switch (fieldDef.fieldType) {
    case 'NUMBER': {
      if (isNaN(Number(value))) {
        throw new ValidationError('Value must be a valid number');
      }
      break;
    }
    case 'DATE': {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Value must be a valid ISO date');
      }
      break;
    }
    case 'BOOLEAN': {
      if (value !== 'true' && value !== 'false') {
        throw new ValidationError('Value must be "true" or "false"');
      }
      break;
    }
    case 'SELECT': {
      const options = fieldDef.options as string[] | null;
      if (Array.isArray(options) && !options.includes(value)) {
        throw new ValidationError(`Value must be one of: ${options.join(', ')}`);
      }
      break;
    }
    case 'MULTISELECT': {
      const allowedOptions = fieldDef.options as string[] | null;
      if (Array.isArray(allowedOptions)) {
        const selected = value.split(',').map((v) => v.trim());
        const invalid = selected.filter((v) => !allowedOptions.includes(v));
        if (invalid.length > 0) {
          throw new ValidationError(`Invalid options: ${invalid.join(', ')}`);
        }
      }
      break;
    }
    case 'URL': {
      try {
        new URL(value);
      } catch {
        throw new ValidationError('Value must be a valid URL');
      }
      break;
    }
    case 'EMAIL': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new ValidationError('Value must be a valid email address');
      }
      break;
    }
    case 'PHONE': {
      const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
      if (!phoneRegex.test(value)) {
        throw new ValidationError('Value must be a valid phone number');
      }
      break;
    }
    case 'TEXT':
    case 'TEXTAREA':
      // No additional validation for text types
      break;
    default:
      break;
  }
}
