# SoftCRM API Reference

> Auto-generated from OpenAPI 3.1 specifications.  
> Run `pnpm generate:openapi` to regenerate from Zod schemas.

## Base URL

```
https://crm.example.com/api/v1
```

## Authentication

All endpoints require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Obtaining a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "s3curePass!"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### Refreshing Tokens

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "<refresh_token>" }
```

---

## Modules

| Module | Prefix | Description |
|--------|--------|-------------|
| [Sales](#sales) | `/api/v1/sales` | Leads, contacts, deals, quotes, pipeline management |
| [Accounting](#accounting) | `/api/v1/accounting` | Chart of accounts, journal entries, invoices, payments, reports |
| [Support](#support) | `/api/v1/support` | Tickets, knowledge base, SLA management |
| [Inventory](#inventory) | `/api/v1/inventory` | Products, purchase orders, sales orders, fulfillment, stock |
| [Communications](#communications) | `/api/v1/comms` | Email sync, call logging, templates, timeline |
| [Marketing](#marketing) | `/api/v1/marketing` | Campaigns, campaign contacts, attribution |
| [Analytics](#analytics) | `/api/v1/analytics` | Dashboards, widgets, reports, snapshots |
| [Projects](#projects) | `/api/v1/projects` | Projects, tasks, time entries |
| [Workflows](#workflows) | `/api/v1/workflows` | Automation rules (triggers, conditions, actions) |
| [Platform](#platform) | `/api/v1/platform` | RBAC, audit logs, custom fields, data sync |

---

## Sales

### Leads

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/sales/leads` | sales:lead:read | List leads (paginated) |
| `POST` | `/sales/leads` | sales:lead:create | Create a new lead |
| `GET` | `/sales/leads/:id` | sales:lead:read | Get lead by ID |
| `PUT` | `/sales/leads/:id` | sales:lead:update | Update lead |
| `DELETE` | `/sales/leads/:id` | sales:lead:delete | Delete lead |
| `POST` | `/sales/leads/:id/convert` | sales:lead:update | Convert lead to contact + deal |

### Contacts

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/sales/contacts` | sales:contact:read | List contacts |
| `POST` | `/sales/contacts` | sales:contact:create | Create contact |
| `GET` | `/sales/contacts/:id` | sales:contact:read | Get contact |
| `PUT` | `/sales/contacts/:id` | sales:contact:update | Update contact |
| `DELETE` | `/sales/contacts/:id` | sales:contact:delete | Delete contact |

### Deals

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/sales/deals` | sales:deal:read | List deals |
| `POST` | `/sales/deals` | sales:deal:create | Create deal |
| `GET` | `/sales/deals/:id` | sales:deal:read | Get deal |
| `PUT` | `/sales/deals/:id` | sales:deal:update | Update deal |
| `DELETE` | `/sales/deals/:id` | sales:deal:delete | Delete deal |
| `POST` | `/sales/deals/:id/move` | sales:deal:update | Move deal to stage |
| `POST` | `/sales/deals/:id/won` | sales:deal:update | Mark deal as won |
| `POST` | `/sales/deals/:id/lost` | sales:deal:update | Mark deal as lost |

### Pipelines

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/sales/pipelines` | sales:pipeline:read | List pipelines |
| `POST` | `/sales/pipelines` | sales:pipeline:create | Create pipeline |
| `GET` | `/sales/pipelines/:id` | sales:pipeline:read | Get pipeline |
| `PUT` | `/sales/pipelines/:id` | sales:pipeline:update | Update pipeline |

### Quotes

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/sales/quotes` | sales:quote:read | List quotes |
| `POST` | `/sales/quotes` | sales:quote:create | Create quote |
| `GET` | `/sales/quotes/:id` | sales:quote:read | Get quote |
| `PUT` | `/sales/quotes/:id` | sales:quote:update | Update quote |
| `POST` | `/sales/quotes/:id/approve` | sales:quote:update | Approve quote |
| `POST` | `/sales/quotes/:id/reject` | sales:quote:update | Reject quote |

---

## Accounting

### Chart of Accounts

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/accounting/accounts` | accounting:account:read | List chart of accounts |
| `POST` | `/accounting/accounts` | accounting:account:create | Create account |
| `GET` | `/accounting/accounts/:id` | accounting:account:read | Get account |
| `PUT` | `/accounting/accounts/:id` | accounting:account:update | Update account |
| `DELETE` | `/accounting/accounts/:id` | accounting:account:delete | Deactivate account |

### Journal Entries

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/accounting/journal-entries` | accounting:journalEntry:read | List journal entries |
| `POST` | `/accounting/journal-entries` | accounting:journalEntry:create | Create manual journal entry |
| `GET` | `/accounting/journal-entries/:id` | accounting:journalEntry:read | Get journal entry |
| `POST` | `/accounting/journal-entries/:id/reverse` | accounting:journalEntry:create | Reverse journal entry |

### Invoices

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/accounting/invoices` | accounting:invoice:read | List invoices |
| `POST` | `/accounting/invoices` | accounting:invoice:create | Create invoice |
| `GET` | `/accounting/invoices/:id` | accounting:invoice:read | Get invoice |
| `PUT` | `/accounting/invoices/:id` | accounting:invoice:update | Update invoice |
| `POST` | `/accounting/invoices/:id/send` | accounting:invoice:update | Send invoice |
| `POST` | `/accounting/invoices/:id/void` | accounting:invoice:update | Void invoice |

### Payments

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/accounting/payments` | accounting:payment:read | List payments |
| `POST` | `/accounting/payments` | accounting:payment:create | Record payment |
| `GET` | `/accounting/payments/:id` | accounting:payment:read | Get payment |

### Reports

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/accounting/reports/trial-balance` | accounting:report:read | Trial balance report |
| `GET` | `/accounting/reports/profit-loss` | accounting:report:read | Profit & Loss statement |
| `GET` | `/accounting/reports/balance-sheet` | accounting:report:read | Balance sheet |

---

## Support

### Tickets

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/support/tickets` | support:ticket:read | List tickets |
| `POST` | `/support/tickets` | support:ticket:create | Create ticket |
| `GET` | `/support/tickets/:id` | support:ticket:read | Get ticket |
| `PUT` | `/support/tickets/:id` | support:ticket:update | Update ticket |
| `POST` | `/support/tickets/:id/assign` | support:ticket:update | Assign ticket |
| `POST` | `/support/tickets/:id/reply` | support:ticket:update | Add reply |
| `POST` | `/support/tickets/:id/resolve` | support:ticket:update | Resolve ticket |

### Knowledge Base

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/support/articles` | support:article:read | List articles |
| `POST` | `/support/articles` | support:article:create | Create article |
| `GET` | `/support/articles/:id` | support:article:read | Get article |
| `PUT` | `/support/articles/:id` | support:article:update | Update article |
| `DELETE` | `/support/articles/:id` | support:article:delete | Delete article |

---

## Inventory

### Products

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/inventory/products` | inventory:product:read | List products |
| `POST` | `/inventory/products` | inventory:product:create | Create product |
| `GET` | `/inventory/products/:id` | inventory:product:read | Get product |
| `PUT` | `/inventory/products/:id` | inventory:product:update | Update product |
| `DELETE` | `/inventory/products/:id` | inventory:product:delete | Delete product |

### Purchase Orders

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/inventory/purchase-orders` | inventory:purchaseOrder:read | List POs |
| `POST` | `/inventory/purchase-orders` | inventory:purchaseOrder:create | Create PO |
| `GET` | `/inventory/purchase-orders/:id` | inventory:purchaseOrder:read | Get PO |
| `POST` | `/inventory/purchase-orders/:id/receive` | inventory:purchaseOrder:update | Receive goods |

### Sales Orders

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/inventory/sales-orders` | inventory:salesOrder:read | List sales orders |
| `POST` | `/inventory/sales-orders` | inventory:salesOrder:create | Create sales order |
| `GET` | `/inventory/sales-orders/:id` | inventory:salesOrder:read | Get sales order |
| `POST` | `/inventory/sales-orders/:id/fulfill` | inventory:salesOrder:update | Fulfill order |

### Stock Movements

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/inventory/stock-movements` | inventory:stockMovement:read | List stock movements |

---

## Communications

### Emails

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/comms/emails` | comms:email:read | List emails |
| `POST` | `/comms/emails/send` | comms:email:create | Send email |
| `POST` | `/comms/emails/sync` | comms:email:create | Sync emails from provider |

### Calls

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/comms/calls` | comms:call:read | List calls |
| `POST` | `/comms/calls` | comms:call:create | Log call |
| `GET` | `/comms/calls/:id` | comms:call:read | Get call details |

### Templates

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/comms/templates` | comms:template:read | List templates |
| `POST` | `/comms/templates` | comms:template:create | Create template |
| `GET` | `/comms/templates/:id` | comms:template:read | Get template |
| `PUT` | `/comms/templates/:id` | comms:template:update | Update template |
| `DELETE` | `/comms/templates/:id` | comms:template:delete | Delete template |

### Timeline

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/comms/timeline/:entityType/:entityId` | comms:timeline:read | Get entity timeline |

---

## Marketing

### Campaigns

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/marketing/campaigns` | marketing:campaign:read | List campaigns |
| `POST` | `/marketing/campaigns` | marketing:campaign:create | Create campaign |
| `GET` | `/marketing/campaigns/:id` | marketing:campaign:read | Get campaign |
| `PUT` | `/marketing/campaigns/:id` | marketing:campaign:update | Update campaign |
| `DELETE` | `/marketing/campaigns/:id` | marketing:campaign:delete | Delete campaign |
| `POST` | `/marketing/campaigns/:id/launch` | marketing:campaign:update | Launch campaign |

### Campaign Contacts

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/marketing/campaigns/:id/contacts` | marketing:campaign:read | List contacts in campaign |
| `POST` | `/marketing/campaigns/:id/contacts` | marketing:campaign:update | Add contacts to campaign |
| `DELETE` | `/marketing/campaigns/:cid/contacts/:contactId` | marketing:campaign:update | Remove contact |

### Attribution

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/marketing/attribution` | marketing:attribution:read | Get attribution report |

---

## Analytics

### Dashboards

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/analytics/dashboards` | analytics:dashboard:read | List dashboards |
| `POST` | `/analytics/dashboards` | analytics:dashboard:create | Create dashboard |
| `GET` | `/analytics/dashboards/:id` | analytics:dashboard:read | Get dashboard |
| `PUT` | `/analytics/dashboards/:id` | analytics:dashboard:update | Update dashboard |
| `DELETE` | `/analytics/dashboards/:id` | analytics:dashboard:delete | Delete dashboard |

### Widgets

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/analytics/dashboards/:id/widgets` | analytics:dashboard:update | Add widget |
| `PUT` | `/analytics/widgets/:id` | analytics:widget:update | Update widget |
| `DELETE` | `/analytics/widgets/:id` | analytics:widget:delete | Delete widget |

### Reports

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/analytics/reports/revenue` | analytics:report:read | Revenue report |
| `GET` | `/analytics/reports/pipeline` | analytics:report:read | Pipeline report |
| `GET` | `/analytics/reports/activity` | analytics:report:read | Activity report |

### Snapshots

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/analytics/snapshots` | analytics:snapshot:create | Create snapshot |

---

## Projects

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/projects` | projects:project:read | List projects |
| `POST` | `/projects` | projects:project:create | Create project |
| `GET` | `/projects/:id` | projects:project:read | Get project |
| `PUT` | `/projects/:id` | projects:project:update | Update project |
| `DELETE` | `/projects/:id` | projects:project:delete | Delete project |
| `GET` | `/projects/:id/tasks` | projects:task:read | List project tasks |
| `POST` | `/projects/:id/tasks` | projects:task:create | Create task |
| `PUT` | `/projects/tasks/:taskId` | projects:task:update | Update task |
| `DELETE` | `/projects/tasks/:taskId` | projects:task:delete | Delete task |
| `POST` | `/projects/tasks/:taskId/time` | projects:timeEntry:create | Log time entry |
| `GET` | `/projects/tasks/:taskId/time` | projects:timeEntry:read | List time entries |

---

## Workflows

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/workflows` | platform:workflow:read | List workflow rules |
| `POST` | `/workflows` | platform:workflow:create | Create workflow rule |
| `GET` | `/workflows/:id` | platform:workflow:read | Get workflow rule |
| `PUT` | `/workflows/:id` | platform:workflow:update | Update workflow rule |
| `DELETE` | `/workflows/:id` | platform:workflow:delete | Delete workflow rule |
| `POST` | `/workflows/:id/toggle` | platform:workflow:update | Enable/disable workflow |

---

## Platform

### RBAC

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/platform/roles` | (auth only) | List roles |
| `POST` | `/platform/roles` | (auth only) | Create role |
| `GET` | `/platform/roles/:id` | (auth only) | Get role |
| `PUT` | `/platform/roles/:id` | (auth only) | Update role |
| `DELETE` | `/platform/roles/:id` | (auth only) | Delete role |
| `GET` | `/platform/permissions` | (auth only) | List permissions matrix |

### Audit Log

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/platform/audit-log` | (auth only) | Query audit log |

### Custom Fields

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/platform/custom-fields` | (auth only) | List custom field definitions |
| `POST` | `/platform/custom-fields` | (auth only) | Create custom field |
| `GET` | `/platform/custom-fields/:id` | (auth only) | Get custom field |
| `PUT` | `/platform/custom-fields/:id` | (auth only) | Update custom field |
| `DELETE` | `/platform/custom-fields/:id` | (auth only) | Delete custom field |

### Data Sync

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/platform/sync/push` | (auth only) | Push offline changes |
| `POST` | `/platform/sync/pull` | (auth only) | Pull server changes |

---

## Common Patterns

### Pagination

All list endpoints support:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

Response format:

```json
{
  "data": [...],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body/params |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate resource |
| 500 | `INTERNAL_ERROR` | Server error |

### Multi-Tenancy

All data is tenant-scoped. The tenant is derived from the JWT. Cross-tenant access is impossible at the database level (row-level filtering on `tenantId`).
