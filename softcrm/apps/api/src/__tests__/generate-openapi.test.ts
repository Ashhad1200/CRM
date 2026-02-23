import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

// Verify the Zod-to-JSON-Schema bridge works for our validator types
describe('OpenAPI Generation - Zod Schema Conversion', () => {
  it('converts a simple Zod object to OpenAPI-compatible JSON Schema', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().optional(),
    });

    const result = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
    expect(result).toHaveProperty('required');

    const props = result['properties'] as Record<string, unknown>;
    expect(props).toHaveProperty('name');
    expect(props).toHaveProperty('email');
    expect(props).toHaveProperty('age');

    const required = result['required'] as string[];
    expect(required).toContain('name');
    expect(required).toContain('email');
    expect(required).not.toContain('age');
  });

  it('converts Zod enums to JSON Schema enum', () => {
    const schema = z.enum(['active', 'inactive', 'archived']);
    const result = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'string');
    expect(result).toHaveProperty('enum');
    expect(result['enum']).toEqual(['active', 'inactive', 'archived']);
  });

  it('converts uuid string to format:uuid', () => {
    const schema = z.object({ id: z.string().uuid() });
    const result = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;

    const props = result['properties'] as Record<string, Record<string, unknown>>;
    expect(props['id']).toHaveProperty('format', 'uuid');
    expect(props['id']).toHaveProperty('type', 'string');
  });

  it('handles nested objects', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });

    const result = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;
    const props = result['properties'] as Record<string, Record<string, unknown>>;
    expect(props['address']).toHaveProperty('type', 'object');
    expect(props['address']).toHaveProperty('properties');
  });

  it('handles arrays with item schemas', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const result = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;
    const props = result['properties'] as Record<string, Record<string, unknown>>;
    expect(props['tags']).toHaveProperty('type', 'array');
    expect(props['tags']).toHaveProperty('items');
  });
});

// Verify actual module validators can be imported and converted
describe('OpenAPI Generation - Module Validator Imports', () => {
  it('imports sales validators and converts createContactSchema', async () => {
    const salesV = await import('../modules/sales/validators.js');
    const result = zodToJsonSchema(salesV.createContactSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
    expect(result).toHaveProperty('required');
  });

  it('imports accounting validators and converts createInvoiceSchema', async () => {
    const accountingV = await import('../modules/accounting/validators.js');
    const result = zodToJsonSchema(accountingV.createInvoiceSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports support validators and converts createTicketSchema', async () => {
    const supportV = await import('../modules/support/validators.js');
    const result = zodToJsonSchema(supportV.createTicketSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports inventory validators and converts createProductSchema', async () => {
    const inventoryV = await import('../modules/inventory/validators.js');
    const result = zodToJsonSchema(inventoryV.createProductSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports comms validators and converts createActivitySchema', async () => {
    const commsV = await import('../modules/comms/validators.js');
    const result = zodToJsonSchema(commsV.createActivitySchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports marketing validators and converts createCampaignSchema', async () => {
    const marketingV = await import('../modules/marketing/validators.js');
    const result = zodToJsonSchema(marketingV.createCampaignSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports analytics validators and converts createDashboardSchema', async () => {
    const analyticsV = await import('../modules/analytics/validators.js');
    const result = zodToJsonSchema(analyticsV.createDashboardSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports projects validators and converts createProjectSchema', async () => {
    const projectsV = await import('../modules/projects/validators.js');
    const result = zodToJsonSchema(projectsV.createProjectSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports workflow validators and converts createWorkflowSchema', async () => {
    const workflowsV = await import('../modules/platform/workflows/validators.js');
    const result = zodToJsonSchema(workflowsV.createWorkflowSchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });

  it('imports sync validators and converts pullQuerySchema', async () => {
    const syncV = await import('../modules/sync/validators.js');
    const result = zodToJsonSchema(syncV.pullQuerySchema, { target: 'openApi3' }) as Record<string, unknown>;

    expect(result).toHaveProperty('type', 'object');
    expect(result).toHaveProperty('properties');
  });
});
