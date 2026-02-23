import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockCreateFieldDefRepo = vi.fn();
const mockUpsertFieldValue = vi.fn();

vi.mock('../custom-field.repository.js', () => ({
  createFieldDef: (...args: unknown[]) => mockCreateFieldDefRepo(...args),
  upsertFieldValue: (...args: unknown[]) => mockUpsertFieldValue(...args),
  updateFieldDef: vi.fn(),
  deleteFieldDef: vi.fn(),
  getFieldDefs: vi.fn(),
  getFieldValuesByRecord: vi.fn(),
}));

const mockCustomFieldDefFindFirst = vi.fn();

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    customFieldDef: {
      findFirst: mockCustomFieldDefFindFirst,
    },
  }),
}));

import {
  createFieldDef,
  validateFieldValue,
  setFieldValue,
} from '../custom-field.service.js';
import { ValidationError } from '@softcrm/shared-kernel';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createFieldDef ─────────────────────────────────────────────────────────────

describe('createFieldDef', () => {
  it('creates field definition with correct data', async () => {
    mockCustomFieldDefFindFirst.mockResolvedValue(null); // no duplicate
    mockCreateFieldDefRepo.mockResolvedValue({
      id: 'fd-1',
      tenantId: 't1',
      module: 'SALES',
      entity: 'Lead',
      fieldName: 'priority',
      fieldType: 'SELECT',
      label: 'Priority',
      required: false,
      options: ['LOW', 'MED', 'HIGH'],
      sortOrder: 0,
    });

    const result = await createFieldDef('t1', {
      module: 'SALES',
      entity: 'Lead',
      fieldName: 'priority',
      fieldType: 'SELECT',
      label: 'Priority',
      options: ['LOW', 'MED', 'HIGH'],
    });

    expect(mockCreateFieldDefRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        module: 'SALES',
        entity: 'Lead',
        fieldName: 'priority',
        fieldType: 'SELECT',
        label: 'Priority',
      }),
    );
    expect(result.id).toBe('fd-1');
  });
});

// ── validateFieldValue ─────────────────────────────────────────────────────────

describe('validateFieldValue', () => {
  it('NUMBER type rejects non-numeric value', () => {
    const fieldDef = { fieldType: 'NUMBER', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, 'not-a-number')).toThrow(ValidationError);
    expect(() => validateFieldValue(fieldDef, 'not-a-number')).toThrow(
      'Value must be a valid number',
    );
  });

  it('NUMBER type accepts numeric value', () => {
    const fieldDef = { fieldType: 'NUMBER', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, '42.5')).not.toThrow();
  });

  it('DATE type rejects invalid date', () => {
    const fieldDef = { fieldType: 'DATE', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, 'not-a-date')).toThrow(ValidationError);
    expect(() => validateFieldValue(fieldDef, 'not-a-date')).toThrow(
      'Value must be a valid ISO date',
    );
  });

  it('DATE type accepts valid ISO date', () => {
    const fieldDef = { fieldType: 'DATE', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, '2025-06-15')).not.toThrow();
  });

  it('SELECT type rejects value not in options', () => {
    const fieldDef = {
      fieldType: 'SELECT',
      required: false,
      options: ['LOW', 'MED', 'HIGH'],
    };

    expect(() => validateFieldValue(fieldDef, 'CRITICAL')).toThrow(ValidationError);
    expect(() => validateFieldValue(fieldDef, 'CRITICAL')).toThrow(
      'Value must be one of: LOW, MED, HIGH',
    );
  });

  it('SELECT type accepts value in options', () => {
    const fieldDef = {
      fieldType: 'SELECT',
      required: false,
      options: ['LOW', 'MED', 'HIGH'],
    };

    expect(() => validateFieldValue(fieldDef, 'MED')).not.toThrow();
  });

  it('EMAIL type rejects invalid email', () => {
    const fieldDef = { fieldType: 'EMAIL', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, 'not-an-email')).toThrow(ValidationError);
    expect(() => validateFieldValue(fieldDef, 'not-an-email')).toThrow(
      'Value must be a valid email address',
    );
  });

  it('EMAIL type accepts valid email', () => {
    const fieldDef = { fieldType: 'EMAIL', required: false, options: null };

    expect(() => validateFieldValue(fieldDef, 'user@example.com')).not.toThrow();
  });
});

// ── setFieldValue ──────────────────────────────────────────────────────────────

describe('setFieldValue', () => {
  it('calls upsertFieldValue with correct data', async () => {
    mockCustomFieldDefFindFirst.mockResolvedValue({
      id: 'fd-1',
      fieldType: 'TEXT',
      required: false,
      options: null,
    });
    mockUpsertFieldValue.mockResolvedValue({
      id: 'val-1',
      fieldDefId: 'fd-1',
      recordId: 'rec-1',
      value: 'hello world',
    });

    const result = await setFieldValue('fd-1', 'rec-1', 'hello world');

    expect(mockUpsertFieldValue).toHaveBeenCalledWith('fd-1', 'rec-1', 'hello world');
    expect(result.value).toBe('hello world');
  });
});
