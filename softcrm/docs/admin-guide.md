# SoftCRM Administration Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Role & Permission Setup](#role--permission-setup)
3. [Custom Fields](#custom-fields)
4. [Workflow Automation](#workflow-automation)
5. [Multi-Tenancy](#multi-tenancy)
6. [Audit Logging](#audit-logging)

---

## Getting Started

### First-Time Setup

1. **Seed the database** — creates default roles, permissions, and a Super Admin user:
   ```bash
   cd packages/db
   pnpm run seed
   ```

2. **Login as Super Admin** — use the seeded credentials:
   ```
   Email:    admin@softcrm.local
   Password: (set in .env SEED_ADMIN_PASSWORD)
   ```

3. **Create tenant users** — via the Users section in the admin panel or API:
   ```http
   POST /api/v1/auth/register
   { "email": "...", "password": "...", "name": "..." }
   ```

4. **Assign roles** — assign one or more roles to each user.

---

## Role & Permission Setup

### Default Roles

SoftCRM ships with 9 built-in roles:

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **Super Admin** | All modules | Full CRUD on everything |
| **Sales Rep** | Sales | Own leads/contacts/deals/quotes |
| **Sales Manager** | Sales | Team-wide sales access |
| **Accountant** | Accounting | Full accounting module |
| **Support Agent** | Support | Own tickets + KB read |
| **Marketing Manager** | Marketing | Campaigns, attribution |
| **Inventory Manager** | Inventory | Products, POs, SOs, stock |
| **Project Manager** | Projects | Projects, tasks, time |
| **Read-Only** | All modules | Read-only across all modules |

### Permission Model

Permissions follow a **3-tier hierarchy**:

```
Module Level    → e.g., "Can access Sales module"
  Entity Level  → e.g., "Can create Leads"
    Scope Level → e.g., "Own records only" vs "Team" vs "All"
```

#### Permission Object Structure

```json
{
  "module": "sales",
  "entity": "lead",
  "action": "create",
  "scope": "own"
}
```

**Modules:** `platform`, `sales`, `accounting`, `support`, `marketing`, `inventory`, `projects`, `comms`, `analytics`

**Actions:** `create`, `read`, `update`, `delete`

**Scopes:** `own` (only own records), `team` (team members' records), `all` (entire tenant)

### Creating a Custom Role

```http
POST /api/v1/platform/roles
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Field Sales Rep",
  "description": "Sales rep with limited comms access",
  "permissions": [
    { "module": "sales", "entity": "lead", "action": "create", "scope": "own" },
    { "module": "sales", "entity": "lead", "action": "read", "scope": "own" },
    { "module": "sales", "entity": "lead", "action": "update", "scope": "own" },
    { "module": "sales", "entity": "contact", "action": "read", "scope": "team" },
    { "module": "sales", "entity": "deal", "action": "read", "scope": "own" },
    { "module": "sales", "entity": "deal", "action": "update", "scope": "own" },
    { "module": "comms", "entity": "email", "action": "read", "scope": "own" },
    { "module": "comms", "entity": "call", "action": "create", "scope": "own" }
  ]
}
```

### Modifying Role Permissions

```http
PUT /api/v1/platform/roles/:roleId
{
  "permissions": [ ... ]
}
```

> **Security Note:** Changes take effect on next token refresh. Users with cached JWTs will use old permissions until token expiry (15 min default).

---

## Custom Fields

Custom fields allow tenants to extend any entity without schema changes.

### Supported Field Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Short text (max 255) | "Referral Source" |
| `textarea` | Long text | "Internal Notes" |
| `number` | Integer or decimal | "Employee Count" |
| `date` | ISO date | "Contract Start" |
| `select` | Single option from list | "Industry" |
| `multiselect` | Multiple options | "Tags" |
| `checkbox` | Boolean | "VIP Customer" |

### Creating a Custom Field

```http
POST /api/v1/platform/custom-fields
{
  "entityType": "contact",
  "fieldName": "industry",
  "fieldType": "select",
  "label": "Industry",
  "required": false,
  "options": ["Technology", "Healthcare", "Finance", "Manufacturing", "Other"]
}
```

### Reading Custom Field Values

Custom field values appear in the `customFields` property of entities:

```json
{
  "id": "uuid-...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "customFields": {
    "industry": "Technology",
    "employee_count": 250
  }
}
```

### Entities Supporting Custom Fields

- `lead`, `contact`, `deal`, `quote` (Sales)
- `ticket` (Support)
- `product` (Inventory)
- `project`, `task` (Projects)

---

## Workflow Automation

The no-code workflow builder allows admins to create event-driven automations.

### Workflow Structure

```
TRIGGER  →  CONDITIONS (optional)  →  ACTIONS
```

### Available Triggers

| Trigger | Description |
|---------|-------------|
| `lead.created` | New lead is created |
| `lead.converted` | Lead is converted to contact + deal |
| `deal.stage_changed` | Deal moves to a new stage |
| `deal.won` | Deal is marked as won |
| `deal.lost` | Deal is marked as lost |
| `ticket.created` | New support ticket |
| `ticket.resolved` | Ticket is resolved |
| `invoice.created` | Invoice is generated |
| `invoice.overdue` | Invoice passes due date |
| `contact.updated` | Contact record is modified |

### Available Actions

| Action | Parameters |
|--------|-----------|
| `send_email` | `templateId`, `to` (field reference) |
| `create_task` | `title`, `assigneeId`, `dueInDays` |
| `update_field` | `entity`, `field`, `value` |
| `assign_owner` | `userId` or `roundRobin: true` |
| `create_notification` | `message`, `level` |
| `webhook` | `url`, `method`, `headers` |

### Example: Auto-assign new leads by round-robin

```http
POST /api/v1/workflows
{
  "name": "Round-Robin Lead Assignment",
  "trigger": "lead.created",
  "conditions": [],
  "actions": [
    {
      "type": "assign_owner",
      "config": { "roundRobin": true, "teamRole": "Sales Rep" }
    },
    {
      "type": "create_notification",
      "config": {
        "message": "New lead assigned to you: {{lead.name}}",
        "level": "info"
      }
    }
  ],
  "active": true
}
```

### Example: Escalate overdue tickets

```json
{
  "name": "Escalate Overdue Tickets",
  "trigger": "ticket.created",
  "conditions": [
    { "field": "priority", "operator": "eq", "value": "critical" }
  ],
  "actions": [
    {
      "type": "create_task",
      "config": {
        "title": "Urgent: {{ticket.subject}}",
        "assigneeId": "{{ticket.assigneeId}}",
        "dueInDays": 0
      }
    },
    {
      "type": "send_email",
      "config": {
        "templateId": "escalation-template",
        "to": "{{ticket.assignee.email}}"
      }
    }
  ],
  "active": true
}
```

### Workflow Management

```http
# Enable/disable workflow
POST /api/v1/workflows/:id/toggle
{ "active": false }

# View execution history (via audit log)
GET /api/v1/platform/audit-log?entity=workflow&entityId=:id
```

---

## Multi-Tenancy

SoftCRM uses **row-level multi-tenancy**: all records include a `tenantId` column that is automatically set from the JWT claims.

### Key Principles

- **Automatic filtering** — Every database query automatically includes `WHERE tenantId = ?`
- **Cross-tenant isolation** — It is impossible to read/write data from another tenant
- **Tenant context** — Derived from JWT, not URL or headers (tamper-proof)

### Tenant Provisioning

Tenants are created during the initial registration flow. Each tenant gets:
- A unique tenant ID (UUID)
- Default roles and permissions (copied from seed templates)
- An admin user account

---

## Audit Logging

Every state-changing operation is recorded in the audit log.

### Querying the Audit Log

```http
GET /api/v1/platform/audit-log?entity=deal&action=update&from=2024-01-01&to=2024-06-30&page=1&limit=50
```

### Audit Entry Structure

```json
{
  "id": "uuid-...",
  "userId": "uuid-...",
  "userName": "John Doe",
  "action": "update",
  "entity": "deal",
  "entityId": "uuid-...",
  "changes": {
    "stage": { "from": "Proposal", "to": "Negotiation" }
  },
  "ipAddress": "192.168.1.1",
  "timestamp": "2024-06-15T10:30:00Z"
}
```

### Retention

Audit logs are retained for 365 days in production. Older entries are archived to S3.
