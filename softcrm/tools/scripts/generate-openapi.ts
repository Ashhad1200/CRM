/**
 * generate-openapi.ts — Extracts route + Zod schema metadata and produces
 * OpenAPI 3.1 YAML files per module under specs/crm-platform/contracts/.
 *
 * Usage:  npx tsx tools/scripts/generate-openapi.ts
 *
 * Design: static analysis is impractical on dynamic Express routers,
 * so we maintain a declarative route registry and reference Zod schemas
 * to emit JSON Schema via zod-to-json-schema.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

// ── Module validator imports ────────────────────────────────────────────

import * as salesV from '../../apps/api/src/modules/sales/validators.js';
import * as accountingV from '../../apps/api/src/modules/accounting/validators.js';
import * as supportV from '../../apps/api/src/modules/support/validators.js';
import * as inventoryV from '../../apps/api/src/modules/inventory/validators.js';
import * as commsV from '../../apps/api/src/modules/comms/validators.js';
import * as marketingV from '../../apps/api/src/modules/marketing/validators.js';
import * as analyticsV from '../../apps/api/src/modules/analytics/validators.js';
import * as projectsV from '../../apps/api/src/modules/projects/validators.js';
import * as workflowsV from '../../apps/api/src/modules/platform/workflows/validators.js';
import * as syncV from '../../apps/api/src/modules/sync/validators.js';

// ── Types ───────────────────────────────────────────────────────────────

interface RouteSpec {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  summary: string;
  tags: string[];
  requestBody?: ZodTypeAny;
  queryParams?: ZodTypeAny;
  pathParams?: ZodTypeAny;
  responses?: Record<string, { description: string }>;
}

interface ModuleSpec {
  title: string;
  basePath: string;
  routes: RouteSpec[];
}

// ── Route registries ────────────────────────────────────────────────────

const modules: Record<string, ModuleSpec> = {
  sales: {
    title: 'Sales API',
    basePath: '/api/v1/sales',
    routes: [
      { method: 'get', path: '/contacts', summary: 'List contacts', tags: ['Contacts'], queryParams: salesV.listContactsQuerySchema },
      { method: 'post', path: '/contacts', summary: 'Create contact', tags: ['Contacts'], requestBody: salesV.createContactSchema },
      { method: 'get', path: '/contacts/{id}', summary: 'Get contact', tags: ['Contacts'], pathParams: salesV.uuidParamSchema },
      { method: 'patch', path: '/contacts/{id}', summary: 'Update contact', tags: ['Contacts'], requestBody: salesV.updateContactSchema, pathParams: salesV.uuidParamSchema },
      { method: 'delete', path: '/contacts/{id}', summary: 'Delete contact', tags: ['Contacts'], pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/accounts', summary: 'List accounts', tags: ['Accounts'] },
      { method: 'post', path: '/accounts', summary: 'Create account', tags: ['Accounts'], requestBody: salesV.createAccountSchema },
      { method: 'get', path: '/accounts/{id}', summary: 'Get account', tags: ['Accounts'], pathParams: salesV.uuidParamSchema },
      { method: 'patch', path: '/accounts/{id}', summary: 'Update account', tags: ['Accounts'], requestBody: salesV.updateAccountSchema, pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/leads', summary: 'List leads', tags: ['Leads'], queryParams: salesV.listLeadsQuerySchema },
      { method: 'post', path: '/leads', summary: 'Create lead', tags: ['Leads'], requestBody: salesV.createLeadSchema },
      { method: 'get', path: '/leads/{id}', summary: 'Get lead', tags: ['Leads'], pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/leads/{id}/convert', summary: 'Convert lead', tags: ['Leads'], requestBody: salesV.convertLeadSchema, pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/deals', summary: 'List deals', tags: ['Deals'], queryParams: salesV.listDealsQuerySchema },
      { method: 'post', path: '/deals', summary: 'Create deal', tags: ['Deals'], requestBody: salesV.createDealSchema },
      { method: 'get', path: '/deals/{id}', summary: 'Get deal', tags: ['Deals'], pathParams: salesV.uuidParamSchema },
      { method: 'patch', path: '/deals/{id}', summary: 'Update deal', tags: ['Deals'], requestBody: salesV.updateDealSchema, pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/deals/{id}/stage', summary: 'Move deal stage', tags: ['Deals'], requestBody: salesV.moveDealStageSchema, pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/deals/{id}/won', summary: 'Mark deal won', tags: ['Deals'], pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/deals/{id}/lost', summary: 'Mark deal lost', tags: ['Deals'], pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/deals/{id}/quotes', summary: 'List quotes for deal', tags: ['Quotes'], pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/deals/{id}/quotes', summary: 'Create quote', tags: ['Quotes'], requestBody: salesV.createQuoteSchema, pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/quotes/{id}', summary: 'Get quote', tags: ['Quotes'], pathParams: salesV.uuidParamSchema },
      { method: 'post', path: '/quotes/{id}/approve', summary: 'Approve quote', tags: ['Quotes'], pathParams: salesV.uuidParamSchema },
      { method: 'get', path: '/pipelines', summary: 'List pipelines', tags: ['Pipelines'] },
      { method: 'get', path: '/pipelines/{id}', summary: 'Get pipeline', tags: ['Pipelines'], pathParams: salesV.uuidParamSchema },
    ],
  },
  accounting: {
    title: 'Accounting API',
    basePath: '/api/v1/accounting',
    routes: [
      { method: 'get', path: '/chart-of-accounts', summary: 'List accounts', tags: ['Chart of Accounts'] },
      { method: 'post', path: '/chart-of-accounts', summary: 'Create account', tags: ['Chart of Accounts'], requestBody: accountingV.createChartOfAccountSchema },
      { method: 'patch', path: '/chart-of-accounts/{id}', summary: 'Update account', tags: ['Chart of Accounts'] },
      { method: 'get', path: '/invoices', summary: 'List invoices', tags: ['Invoices'] },
      { method: 'post', path: '/invoices', summary: 'Create invoice', tags: ['Invoices'], requestBody: accountingV.createInvoiceSchema },
      { method: 'get', path: '/invoices/{id}', summary: 'Get invoice', tags: ['Invoices'] },
      { method: 'patch', path: '/invoices/{id}', summary: 'Update invoice', tags: ['Invoices'] },
      { method: 'post', path: '/invoices/{id}/send', summary: 'Send invoice', tags: ['Invoices'] },
      { method: 'post', path: '/invoices/{id}/void', summary: 'Void invoice', tags: ['Invoices'] },
      { method: 'post', path: '/invoices/{id}/payments', summary: 'Record payment', tags: ['Payments'], requestBody: accountingV.recordPaymentSchema },
      { method: 'get', path: '/journal-entries', summary: 'List journal entries', tags: ['Journal Entries'] },
      { method: 'post', path: '/journal-entries', summary: 'Create journal entry', tags: ['Journal Entries'], requestBody: accountingV.createManualJournalEntrySchema },
      { method: 'get', path: '/expenses', summary: 'List expenses', tags: ['Expenses'] },
      { method: 'post', path: '/expenses', summary: 'Create expense', tags: ['Expenses'], requestBody: accountingV.createExpenseSchema },
      { method: 'get', path: '/reports/profit-loss', summary: 'Profit & Loss report', tags: ['Reports'] },
      { method: 'get', path: '/reports/balance-sheet', summary: 'Balance Sheet report', tags: ['Reports'] },
      { method: 'get', path: '/reports/trial-balance', summary: 'Trial Balance report', tags: ['Reports'] },
      { method: 'get', path: '/reports/ar-aging', summary: 'AR Aging report', tags: ['Reports'] },
    ],
  },
  support: {
    title: 'Support API',
    basePath: '/api/v1/support',
    routes: [
      { method: 'get', path: '/tickets', summary: 'List tickets', tags: ['Tickets'] },
      { method: 'post', path: '/tickets', summary: 'Create ticket', tags: ['Tickets'], requestBody: supportV.createTicketSchema },
      { method: 'get', path: '/tickets/{id}', summary: 'Get ticket', tags: ['Tickets'] },
      { method: 'post', path: '/tickets/{id}/reply', summary: 'Reply to ticket', tags: ['Tickets'], requestBody: supportV.addReplySchema },
      { method: 'post', path: '/tickets/{id}/resolve', summary: 'Resolve ticket', tags: ['Tickets'] },
      { method: 'post', path: '/tickets/{id}/close', summary: 'Close ticket', tags: ['Tickets'] },
      { method: 'post', path: '/tickets/{id}/escalate', summary: 'Escalate ticket', tags: ['Tickets'] },
      { method: 'get', path: '/kb/articles', summary: 'List KB articles', tags: ['Knowledge Base'] },
      { method: 'post', path: '/kb/articles', summary: 'Create KB article', tags: ['Knowledge Base'], requestBody: supportV.createArticleSchema },
      { method: 'get', path: '/kb/articles/{id}', summary: 'Get KB article', tags: ['Knowledge Base'] },
      { method: 'patch', path: '/kb/articles/{id}', summary: 'Update KB article', tags: ['Knowledge Base'] },
      { method: 'get', path: '/kb/categories', summary: 'List categories', tags: ['Knowledge Base'] },
      { method: 'post', path: '/kb/categories', summary: 'Create category', tags: ['Knowledge Base'], requestBody: supportV.createCategorySchema },
    ],
  },
  inventory: {
    title: 'Inventory API',
    basePath: '/api/v1/inventory',
    routes: [
      { method: 'get', path: '/products', summary: 'List products', tags: ['Products'] },
      { method: 'post', path: '/products', summary: 'Create product', tags: ['Products'], requestBody: inventoryV.createProductSchema },
      { method: 'get', path: '/products/{id}', summary: 'Get product', tags: ['Products'] },
      { method: 'put', path: '/products/{id}', summary: 'Update product', tags: ['Products'], requestBody: inventoryV.updateProductSchema },
      { method: 'get', path: '/warehouses', summary: 'List warehouses', tags: ['Warehouses'] },
      { method: 'post', path: '/warehouses', summary: 'Create warehouse', tags: ['Warehouses'], requestBody: inventoryV.createWarehouseSchema },
      { method: 'post', path: '/stock/adjust', summary: 'Adjust stock', tags: ['Stock'], requestBody: inventoryV.adjustStockSchema },
      { method: 'post', path: '/stock/reserve', summary: 'Reserve stock', tags: ['Stock'], requestBody: inventoryV.reserveStockSchema },
      { method: 'get', path: '/stock/low', summary: 'Low stock alerts', tags: ['Stock'] },
      { method: 'get', path: '/orders', summary: 'List orders', tags: ['Orders'] },
      { method: 'post', path: '/orders', summary: 'Create order', tags: ['Orders'], requestBody: inventoryV.createSalesOrderSchema },
      { method: 'get', path: '/orders/{id}', summary: 'Get order', tags: ['Orders'] },
      { method: 'post', path: '/orders/{id}/fulfill', summary: 'Fulfill order', tags: ['Orders'] },
      { method: 'get', path: '/purchase-orders', summary: 'List purchase orders', tags: ['Purchase Orders'] },
      { method: 'post', path: '/purchase-orders', summary: 'Create purchase order', tags: ['Purchase Orders'], requestBody: inventoryV.createPurchaseOrderSchema },
    ],
  },
  comms: {
    title: 'Communications API',
    basePath: '/api/v1/comms',
    routes: [
      { method: 'get', path: '/activities', summary: 'List activities', tags: ['Activities'] },
      { method: 'post', path: '/activities', summary: 'Create activity', tags: ['Activities'], requestBody: commsV.createActivitySchema },
      { method: 'get', path: '/activities/{id}', summary: 'Get activity', tags: ['Activities'] },
      { method: 'get', path: '/timeline', summary: 'Get timeline', tags: ['Timeline'] },
      { method: 'post', path: '/calls', summary: 'Log call', tags: ['Calls'], requestBody: commsV.logCallSchema },
      { method: 'get', path: '/email-templates', summary: 'List email templates', tags: ['Email Templates'] },
      { method: 'post', path: '/email-templates', summary: 'Create email template', tags: ['Email Templates'], requestBody: commsV.createTemplateSchema },
      { method: 'post', path: '/emails/send', summary: 'Send email', tags: ['Emails'], requestBody: commsV.sendEmailSchema },
    ],
  },
  marketing: {
    title: 'Marketing API',
    basePath: '/api/v1/marketing',
    routes: [
      { method: 'get', path: '/segments', summary: 'List segments', tags: ['Segments'] },
      { method: 'post', path: '/segments', summary: 'Create segment', tags: ['Segments'], requestBody: marketingV.createSegmentSchema },
      { method: 'get', path: '/segments/{id}', summary: 'Get segment', tags: ['Segments'] },
      { method: 'patch', path: '/segments/{id}', summary: 'Update segment', tags: ['Segments'] },
      { method: 'get', path: '/campaigns', summary: 'List campaigns', tags: ['Campaigns'] },
      { method: 'post', path: '/campaigns', summary: 'Create campaign', tags: ['Campaigns'], requestBody: marketingV.createCampaignSchema },
      { method: 'get', path: '/campaigns/{id}', summary: 'Get campaign', tags: ['Campaigns'] },
      { method: 'patch', path: '/campaigns/{id}', summary: 'Update campaign', tags: ['Campaigns'] },
      { method: 'post', path: '/campaigns/{id}/schedule', summary: 'Schedule campaign', tags: ['Campaigns'] },
      { method: 'get', path: '/attribution', summary: 'Get attribution data', tags: ['Attribution'] },
      { method: 'post', path: '/touches', summary: 'Record touch', tags: ['Attribution'], requestBody: marketingV.recordTouchSchema },
    ],
  },
  analytics: {
    title: 'Analytics API',
    basePath: '/api/v1/analytics',
    routes: [
      { method: 'get', path: '/dashboards', summary: 'List dashboards', tags: ['Dashboards'] },
      { method: 'post', path: '/dashboards', summary: 'Create dashboard', tags: ['Dashboards'], requestBody: analyticsV.createDashboardSchema },
      { method: 'get', path: '/dashboards/{id}', summary: 'Get dashboard', tags: ['Dashboards'] },
      { method: 'patch', path: '/dashboards/{id}', summary: 'Update dashboard', tags: ['Dashboards'] },
      { method: 'delete', path: '/dashboards/{id}', summary: 'Delete dashboard', tags: ['Dashboards'] },
      { method: 'post', path: '/dashboards/{id}/widgets', summary: 'Add widget', tags: ['Dashboards'], requestBody: analyticsV.addWidgetSchema },
      { method: 'get', path: '/reports', summary: 'List reports', tags: ['Reports'] },
      { method: 'post', path: '/reports', summary: 'Create report', tags: ['Reports'], requestBody: analyticsV.createReportSchema },
      { method: 'get', path: '/reports/{id}', summary: 'Get report', tags: ['Reports'] },
      { method: 'post', path: '/reports/{id}/run', summary: 'Run report', tags: ['Reports'] },
      { method: 'get', path: '/forecast', summary: 'Get forecast', tags: ['AI'] },
      { method: 'get', path: '/anomalies', summary: 'Get anomalies', tags: ['AI'] },
      { method: 'get', path: '/pipeline-metrics', summary: 'Pipeline metrics', tags: ['Metrics'] },
    ],
  },
  projects: {
    title: 'Projects API',
    basePath: '/api/v1/projects',
    routes: [
      { method: 'get', path: '/templates', summary: 'List templates', tags: ['Templates'] },
      { method: 'post', path: '/templates', summary: 'Create template', tags: ['Templates'], requestBody: projectsV.createTemplateSchema },
      { method: 'get', path: '/', summary: 'List projects', tags: ['Projects'] },
      { method: 'post', path: '/', summary: 'Create project', tags: ['Projects'], requestBody: projectsV.createProjectSchema },
      { method: 'get', path: '/{id}', summary: 'Get project', tags: ['Projects'] },
      { method: 'patch', path: '/{id}', summary: 'Update project', tags: ['Projects'], requestBody: projectsV.updateProjectSchema },
      { method: 'delete', path: '/{id}', summary: 'Delete project', tags: ['Projects'] },
      { method: 'post', path: '/{id}/tasks', summary: 'Create task', tags: ['Tasks'], requestBody: projectsV.createTaskSchema },
      { method: 'get', path: '/{id}/tasks', summary: 'List tasks', tags: ['Tasks'] },
      { method: 'post', path: '/{id}/time-entries', summary: 'Log time', tags: ['Time Entries'], requestBody: projectsV.logTimeSchema },
      { method: 'get', path: '/{id}/time-entries', summary: 'List time entries', tags: ['Time Entries'] },
      { method: 'get', path: '/{id}/progress', summary: 'Get progress', tags: ['Projects'] },
    ],
  },
  workflows: {
    title: 'Workflows API',
    basePath: '/api/v1/platform/workflows',
    routes: [
      { method: 'get', path: '/', summary: 'List workflows', tags: ['Workflows'] },
      { method: 'post', path: '/', summary: 'Create workflow', tags: ['Workflows'], requestBody: workflowsV.createWorkflowSchema },
      { method: 'get', path: '/{id}', summary: 'Get workflow', tags: ['Workflows'] },
      { method: 'patch', path: '/{id}', summary: 'Update workflow', tags: ['Workflows'], requestBody: workflowsV.updateWorkflowSchema },
      { method: 'delete', path: '/{id}', summary: 'Delete workflow', tags: ['Workflows'] },
      { method: 'post', path: '/{id}/activate', summary: 'Activate workflow', tags: ['Workflows'] },
      { method: 'post', path: '/{id}/deactivate', summary: 'Deactivate workflow', tags: ['Workflows'] },
      { method: 'get', path: '/{id}/executions', summary: 'List executions', tags: ['Workflows'] },
    ],
  },
  sync: {
    title: 'Sync API',
    basePath: '/api/v1/sync',
    routes: [
      { method: 'get', path: '/pull', summary: 'Pull changes since timestamp', tags: ['Sync'], queryParams: syncV.pullQuerySchema },
      { method: 'post', path: '/push', summary: 'Push local changes', tags: ['Sync'], requestBody: syncV.pushBodySchema },
    ],
  },
};

// ── OpenAPI generation ──────────────────────────────────────────────────

function zodSchemaToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;
}

function buildPathItem(route: RouteSpec): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    summary: route.summary,
    tags: route.tags,
    responses: route.responses ?? {
      '200': { description: 'Success' },
      '400': { description: 'Validation error' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
    },
    security: [{ bearerAuth: [] }],
  };

  // Path params
  const paramMatches = route.path.match(/\{(\w+)\}/g);
  if (paramMatches) {
    operation['parameters'] = paramMatches.map((m) => ({
      name: m.replace(/[{}]/g, ''),
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }));
  }

  // Query params
  if (route.queryParams) {
    const qs = zodSchemaToJsonSchema(route.queryParams);
    const props = (qs['properties'] ?? {}) as Record<string, unknown>;
    const required = (qs['required'] ?? []) as string[];
    const queryParams = Object.entries(props).map(([name, schema]) => ({
      name,
      in: 'query',
      required: required.includes(name),
      schema,
    }));
    operation['parameters'] = [...((operation['parameters'] as unknown[]) ?? []), ...queryParams];
  }

  // Request body
  if (route.requestBody) {
    operation['requestBody'] = {
      required: true,
      content: { 'application/json': { schema: zodSchemaToJsonSchema(route.requestBody) } },
    };
  }

  return { [route.method]: operation };
}

function generateModuleSpec(name: string, spec: ModuleSpec): Record<string, unknown> {
  const paths: Record<string, unknown> = {};

  for (const route of spec.routes) {
    const fullPath = `${spec.basePath}${route.path}`;
    const existing = (paths[fullPath] ?? {}) as Record<string, unknown>;
    paths[fullPath] = { ...existing, ...buildPathItem(route) };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: spec.title,
      version: '1.0.0',
      description: `SoftCRM ${spec.title} — auto-generated from Zod validators.`,
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
}

// ── YAML serialisation (minimal, no external dep) ───────────────────────

function toYaml(obj: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes('"') || obj.startsWith('{') || obj.startsWith('[')) {
      return JSON.stringify(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => {
      const val = toYaml(item, indent + 2);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return `${pad}- ${val.trimStart()}`;
      }
      return `${pad}- ${val}`;
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries.map(([key, value]) => {
      const val = toYaml(value, indent + 2);
      if (typeof value === 'object' && value !== null) {
        return `${pad}${key}:\n${val}`;
      }
      return `${pad}${key}: ${val}`;
    }).join('\n');
  }
  return String(obj);
}

// ── Main ────────────────────────────────────────────────────────────────

const outDir = resolve(import.meta.dirname ?? __dirname, '../../specs/crm-platform/contracts');
mkdirSync(outDir, { recursive: true });

let totalPaths = 0;
for (const [name, spec] of Object.entries(modules)) {
  const openApiDoc = generateModuleSpec(name, spec);
  const yamlContent = toYaml(openApiDoc);
  const outPath = resolve(outDir, `${name}.openapi.yaml`);
  writeFileSync(outPath, yamlContent, 'utf-8');
  const pathCount = Object.keys(openApiDoc['paths'] as Record<string, unknown>).length;
  totalPaths += pathCount;
  console.log(`  ✓ ${name}: ${pathCount} paths → ${outPath}`);
}

console.log(`\nGenerated ${Object.keys(modules).length} specs with ${totalPaths} total paths in ${outDir}`);
