# Implementation Plan: SoftCRM Enterprise Platform

**Branch**: `001-crm-platform` | **Date**: 2026-02-21 | **Spec**: [specs/crm-platform/spec.md](spec.md)  
**Input**: Feature specification from `specs/crm-platform/spec.md`; user tech-stack directive: React.js + Node.js + PostgreSQL, ORM (Prisma/Drizzle), Tailwind CSS, RBAC, JWT, multi-tenant.

---

## Summary

Build an all-in-one enterprise CRM as a **modular monolith** — ten bounded-context modules (Sales, Marketing, Support, Accounting, Inventory, Projects, Comms, Analytics, Platform, Mobile) running inside a single Node.js deployable but with strict module boundaries enforced by code structure, schema isolation, and an internal event bus. The frontend is a React.js SPA with Tailwind CSS, code-split per module, with real-time updates via WebSocket. PostgreSQL is the primary store with Prisma ORM managing schema-per-module. Multi-tenancy is row-level (`tenant_id` on every table) with RLS policies. Authentication uses JWTs (short-lived access + opaque refresh) with SSO/MFA support.

---

## Technical Context

| Concern | Decision |
|---------|----------|
| **Language / Runtime** | TypeScript 5.x (strict mode) — shared across frontend, backend, shared-kernel |
| **Backend Framework** | Node.js 20 LTS + Express.js (mature, extensible middleware stack) |
| **ORM** | Prisma 6.x — type-safe schema management, migrations, schema-per-module via Prisma `schemas` |
| **Database** | PostgreSQL 16 — primary OLTP store; one database, schema-per-module isolation |
| **Cache / Sessions** | Redis 7 — session store, JWT blacklisting, rate-limit counters, pub/sub for real-time |
| **Search** | Meilisearch (or Elasticsearch) — full-text search across contacts, articles, products |
| **Message Bus** | BullMQ (Redis-backed) — internal async event bus + job queue for background tasks |
| **Frontend Framework** | React 19 + React Router 7 (SPA with route-based code splitting) |
| **Styling** | Tailwind CSS 4 + Radix UI primitives → custom design system package |
| **State Management** | TanStack Query (server state) + Zustand (client state) + WebSocket subscription layer |
| **Real-time** | Socket.IO (WebSocket with fallback) — dashboard live updates, notifications, chat |
| **Mobile** | React Native + Expo — offline storage via WatermelonDB, push via FCM/APNs |
| **Testing** | Vitest (unit/integration) + Playwright (E2E) + Supertest (API) + k6 (load) |
| **API Spec** | OpenAPI 3.1 (spec-first, auto-generated from Zod schemas via `zod-openapi`) |
| **CI/CD** | GitHub Actions — per-module pipelines, test gates, Docker build, deploy to K8s |
| **Infrastructure** | Docker + Kubernetes (Helm charts) + Terraform for cloud resources |
| **Secrets** | Environment variables injected via K8s secrets (vault-backed in production) |
| **Observability** | OpenTelemetry (traces + metrics) → Grafana stack; structured JSON logging via Pino |
| **PDF Generation** | Puppeteer (server-side) for invoices, quotes, reports |
| **Email Delivery** | Transactional: Resend or SendGrid API; Marketing bulk: dedicated sending infrastructure |
| **Object Storage** | S3-compatible (AWS S3 / MinIO) — documents, receipts, attachments |

---

## Constitution Check

| Principle | Status | Implementation |
|-----------|--------|----------------|
| **I. Enterprise Security** | ✅ PASS | JWT + refresh tokens, RBAC middleware, field-level encryption (Prisma middleware), RLS, audit trail, SAST in CI |
| **II. Modular Architecture** | ✅ PASS | 10 modules as directories with barrel exports; schema-per-module in PostgreSQL; event bus for cross-module; no cross-schema joins |
| **III. Strict TDD** | ✅ PASS | Vitest for unit/integration, Playwright for E2E, Supertest for API contracts, coverage gates in CI |
| **IV. Responsive UX** | ✅ PASS | React + Tailwind (mobile-first), React Native for mobile, service worker for offline PWA, WebSocket for real-time |
| **V. Observability** | ✅ PASS | OpenTelemetry + Pino + Grafana; health endpoints per module; correlation IDs |
| **VI. Simplicity** | ✅ PASS | Modular monolith (not microservices) — simplest viable deployment; extract to services only when proven necessary |

---

## Architecture Overview

### Decision: Modular Monolith

The 10 modules run within a **single Node.js process** but are architecturally isolated:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                            │
│  (Express.js — auth middleware, tenant resolution, rate limiting)    │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┤
│Sales │Mktg  │Supp  │Acctg │Inv   │Proj  │Comms │Analy │ Platform   │
│Module│Module │Module│Module│Module│Module│Module│Module│ Module     │
│      │      │      │      │      │      │      │      │            │
│routes│routes│routes│routes│routes│routes│routes│routes│ routes     │
│svc   │svc   │svc   │svc   │svc   │svc   │svc   │svc   │ svc       │
│repo  │repo  │repo  │repo  │repo  │repo  │repo  │repo  │ repo      │
│schema│schema│schema│schema│schema│schema│schema│schema│ schema     │
├──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴────────────┤
│               Shared Infrastructure Layer                           │
│  Event Bus (BullMQ)  |  Auth  |  Audit  |  RBAC  |  Shared Kernel  │
├─────────────────────────────────────────────────────────────────────┤
│                     Data Layer                                      │
│  PostgreSQL (schema-per-module)  |  Redis  |  Meilisearch  |  S3   │
└─────────────────────────────────────────────────────────────────────┘
```

**Why modular monolith over microservices:**
- Single team / small team — microservices add operational overhead (service discovery, distributed tracing complexity, deployment coordination) without proportional benefit.
- All modules share the same PostgreSQL instance — network latency between modules is zero (in-process function calls for synchronous reads).
- Module boundaries are enforced by **code structure** (no cross-module imports except through public barrel exports) and **database** (separate schemas, no cross-schema joins).
- Future extraction: any module can be promoted to an independent service by externalizing its API calls over HTTP and routing its events through a real message broker (Kafka/NATS). The code structure makes this a mechanical refactor, not a rewrite.

### Multi-Tenancy Strategy

**Approach: Shared database, shared schema, row-level isolation.**

```sql
-- Every table includes tenant_id as the first column of the PK
-- PostgreSQL Row-Level Security (RLS) enforces isolation at the DB level

ALTER TABLE sales.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sales.deals
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Application sets the tenant context on every connection
SET app.current_tenant = '<tenant-uuid>';
```

**Implementation:**
1. Tenant resolved from JWT claims (or subdomain for self-service portal).
2. Express middleware sets `app.current_tenant` on the Prisma connection via `$executeRawUnsafe("SET app.current_tenant = ...")` before every request.
3. RLS policies on every table guarantee that even a code bug cannot leak cross-tenant data.
4. Enterprise tier: option for dedicated schema or database (future; not v1).

### Authentication & Authorization

```
┌──────────┐     ┌──────────────┐     ┌───────────┐     ┌──────────┐
│  Client   │────▶│  /auth/login │────▶│   Auth    │────▶│ Identity │
│ (React /  │     │  /auth/sso   │     │  Service  │     │ Provider │
│  Mobile)  │◀────│  /auth/mfa   │◀────│           │     │ (IdP)    │
└──────────┘     └──────────────┘     └───────────┘     └──────────┘
     │                                       │
     │ Bearer: <access_token>                │ Validates
     ▼                                       ▼
┌──────────┐     ┌──────────────┐     ┌───────────┐
│  API      │────▶│  Auth        │────▶│   RBAC    │
│  Request  │     │  Middleware   │     │  Engine   │
└──────────┘     └──────────────┘     └───────────┘
                                           │
                              Checks: module + entity +
                              field + ownership scope
                                           │
                              403 or filtered response
```

**JWT Token Design:**
```typescript
// Access token (short-lived: 15 min)
interface AccessTokenPayload {
  sub: string;         // userId
  tid: string;         // tenantId
  roles: string[];     // role IDs
  iat: number;
  exp: number;         // 15 min
  jti: string;         // unique token ID (for revocation)
}

// Refresh token: opaque string stored in Redis with metadata
// TTL: 7 days (sliding), revocable, single-use (rotation)
```

**RBAC Data Model:**
```
Role ──┬── ModulePermission (module, access_level: none|read|write|admin)
       ├── EntityPermission  (module, entity, scope: own|team|all, actions: CRUD bitmask)
       └── FieldPermission   (module, entity, field, visible: bool, editable: bool)

User ──┬── Role(s)          (many-to-many)
       └── Team(s)          (for "team" ownership scope resolution)
```

**RBAC Middleware (per-request):**
1. Extract `roles[]` from JWT.
2. Load role permissions (cached in Redis, invalidated on role update).
3. Check `ModulePermission` → reject if `none`.
4. Check `EntityPermission` → filter queryset by ownership scope.
5. Check `FieldPermission` → strip hidden fields from response; reject edits to non-editable fields.
6. All checks logged to audit trail on failure (403).

### Event Bus Architecture

```
Producer Module                     BullMQ (Redis)                    Consumer Module
┌──────────┐    publish()    ┌─────────────────────┐   process()   ┌──────────────┐
│  Sales    │───────────────▶│  Queue: crm.events  │─────────────▶│  Accounting  │
│  Service  │                │                     │              │  Listener    │
│           │                │  Job: {             │              │              │
│  emit:    │                │    type: deal.won   │              │  Subscribes: │
│  deal.won │                │    tenantId: ...    │              │  deal.won    │
│           │                │    payload: {...}   │              │  → createInv │
└──────────┘                │    correlationId    │              └──────────────┘
                            │    timestamp        │
                            │  }                  │
                            └─────────────────────┘
                                     │
                                     ├────────────▶ Inventory Listener
                                     ├────────────▶ Projects Listener
                                     └────────────▶ Analytics Listener
```

**Event Contract (TypeScript):**
```typescript
interface DomainEvent<T = unknown> {
  id: string;              // UUID v7 (time-ordered)
  type: string;            // e.g., "deal.won"
  tenantId: string;
  actorId: string;         // userId who triggered
  aggregateId: string;     // e.g., dealId
  aggregateType: string;   // e.g., "Deal"
  payload: T;
  correlationId: string;   // request trace ID
  timestamp: string;       // ISO 8601
  version: number;         // schema version for evolution
}
```

**Guarantees:**
- **At-least-once delivery** with idempotent consumers (idempotency key = `event.id`).
- **Outbox pattern**: events written to an `outbox` table in the same DB transaction as the aggregate mutation, then published by a polling relay. This guarantees no event is lost even if Redis is temporarily down.
- **Dead letter queue**: failed events after 3 retries go to DLQ for manual inspection.

### Real-Time Architecture (WebSocket)

```
┌─────────────┐      Socket.IO       ┌──────────────┐     Redis Pub/Sub    ┌──────────┐
│   React SPA  │◀──────────────────▶│  WS Gateway   │◀──────────────────▶│  Redis    │
│              │                     │  (Express +   │                     │          │
│  useSocket() │   room: tenant:xyz  │   Socket.IO)  │  channel:           │  PubSub  │
│  TanStack    │   room: user:abc    │               │  rt:<tenantId>      │          │
│  Query inval │                     │  Auth: JWT    │                     │          │
└─────────────┘                     └──────────────┘                     └──────────┘
                                           ▲
                                           │ Emit on
                                    BullMQ event completion
                                    (after consumer processes)
```

**Flow:** Module processes event → publishes to Redis channel `rt:<tenantId>` → WS Gateway picks up → broadcasts to all connected clients in that tenant room → TanStack Query invalidation triggers data refetch for affected queries.

---

## Project Structure

### Documentation

```
specs/crm-platform/
├── plan.md                  # This file
├── data-model.md            # Database schema reference (all modules)
├── contracts/               # OpenAPI specs per module
│   ├── sales.openapi.yaml
│   ├── accounting.openapi.yaml
│   ├── support.openapi.yaml
│   ├── marketing.openapi.yaml
│   ├── inventory.openapi.yaml
│   ├── projects.openapi.yaml
│   ├── comms.openapi.yaml
│   ├── analytics.openapi.yaml
│   └── platform.openapi.yaml
└── tasks.md                 # Created by /sp.tasks
```

### Source Code

```
softcrm/
├── package.json                     # Root workspace config (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                       # Turborepo pipeline config
├── docker-compose.yml               # Local dev: postgres, redis, meilisearch
├── .env.example
│
├── packages/
│   ├── shared-kernel/               # Shared types, no business logic
│   │   ├── src/
│   │   │   ├── types/               # UserId, TenantId, Money, Address, etc.
│   │   │   ├── errors/              # Base error classes (AppError, NotFoundError, etc.)
│   │   │   ├── events/              # DomainEvent interface, event type registry
│   │   │   ├── utils/               # Date, currency, validation helpers
│   │   │   └── index.ts             # Barrel export (public API)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                          # Prisma schema + migrations (all modules)
│   │   ├── prisma/
│   │   │   ├── schema/              # Split Prisma schema files per module
│   │   │   │   ├── base.prisma      # Datasource, generator, shared enums
│   │   │   │   ├── platform.prisma  # Tenant, User, Role, Permission, AuditLog
│   │   │   │   ├── sales.prisma     # Contact, Account, Lead, Deal, Quote
│   │   │   │   ├── accounting.prisma# Invoice, JournalEntry, Expense, ChartOfAccounts
│   │   │   │   ├── support.prisma   # Ticket, KBArticle, SLA
│   │   │   │   ├── marketing.prisma # Campaign, Segment, EmailEvent
│   │   │   │   ├── inventory.prisma # Product, PriceBook, StockLevel, Order, PO
│   │   │   │   ├── projects.prisma  # Project, Task, Milestone, TimeEntry
│   │   │   │   ├── comms.prisma     # Activity, EmailSync, CallLog
│   │   │   │   └── analytics.prisma # Dashboard, Widget, Report, Forecast
│   │   │   ├── migrations/          # Prisma migration history
│   │   │   └── seed.ts              # Dev seed data
│   │   ├── src/
│   │   │   ├── client.ts            # Prisma client singleton with RLS middleware
│   │   │   ├── tenant-context.ts    # AsyncLocalStorage-based tenant injection
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                          # Shared design system (React + Tailwind)
│       ├── src/
│       │   ├── tokens/              # Design tokens (colors, spacing, typography)
│       │   ├── primitives/          # Radix-based primitives (Button, Input, Dialog, etc.)
│       │   ├── composites/          # DataTable, Kanban, Timeline, FormBuilder
│       │   ├── layouts/             # Shell, Sidebar, TopNav, MobileNav
│       │   └── index.ts
│       ├── tailwind.config.ts       # Shared Tailwind config with custom theme
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── api/                         # Node.js backend (Express)
│   │   ├── src/
│   │   │   ├── server.ts            # Express app bootstrap, middleware stack
│   │   │   ├── config/              # Env config (validated with Zod)
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts          # JWT verification, token refresh
│   │   │   │   ├── tenant.ts        # Tenant resolution + RLS session set
│   │   │   │   ├── rbac.ts          # Permission check (module/entity/field)
│   │   │   │   ├── audit.ts         # Audit trail capture
│   │   │   │   ├── rate-limit.ts    # Redis-backed rate limiting
│   │   │   │   ├── error-handler.ts # Global error handler
│   │   │   │   ├── correlation.ts   # Request ID / trace propagation
│   │   │   │   └── validate.ts      # Zod request/response validation
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── sales/
│   │   │   │   │   ├── routes.ts        # Express router — /api/v1/sales/*
│   │   │   │   │   ├── controller.ts    # Request/response handling
│   │   │   │   │   ├── service.ts       # Business logic (pure, testable)
│   │   │   │   │   ├── repository.ts    # Prisma queries (data access)
│   │   │   │   │   ├── events.ts        # Event producers (deal.won, etc.)
│   │   │   │   │   ├── listeners.ts     # Event consumers from other modules
│   │   │   │   │   ├── validators.ts    # Zod schemas for request validation
│   │   │   │   │   ├── types.ts         # Module-internal types
│   │   │   │   │   └── __tests__/
│   │   │   │   │       ├── service.test.ts
│   │   │   │   │       ├── repository.test.ts
│   │   │   │   │       └── routes.test.ts
│   │   │   │   │
│   │   │   │   ├── accounting/          # Same structure as sales/
│   │   │   │   │   ├── routes.ts
│   │   │   │   │   ├── controller.ts
│   │   │   │   │   ├── service.ts       # Double-entry engine, tax calc
│   │   │   │   │   ├── repository.ts
│   │   │   │   │   ├── events.ts
│   │   │   │   │   ├── listeners.ts     # Listens: deal.won → create invoice
│   │   │   │   │   ├── validators.ts
│   │   │   │   │   ├── ledger/          # Sub-domain: GL, journal entries
│   │   │   │   │   │   ├── journal-entry.service.ts
│   │   │   │   │   │   ├── chart-of-accounts.service.ts
│   │   │   │   │   │   └── trial-balance.service.ts
│   │   │   │   │   ├── invoicing/       # Sub-domain: invoices, payments
│   │   │   │   │   │   ├── invoice.service.ts
│   │   │   │   │   │   ├── payment.service.ts
│   │   │   │   │   │   └── recurring.service.ts
│   │   │   │   │   ├── expenses/        # Sub-domain: expense management
│   │   │   │   │   │   ├── expense.service.ts
│   │   │   │   │   │   └── approval.service.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │
│   │   │   │   ├── support/             # Same pattern
│   │   │   │   ├── marketing/           # Same pattern
│   │   │   │   ├── inventory/           # Same pattern
│   │   │   │   ├── projects/            # Same pattern
│   │   │   │   ├── comms/               # Same pattern
│   │   │   │   ├── analytics/           # Same pattern
│   │   │   │   └── platform/            # Auth, RBAC, audit, custom fields
│   │   │   │       ├── auth/
│   │   │   │       │   ├── auth.routes.ts
│   │   │   │       │   ├── auth.service.ts    # Login, SSO, MFA, token rotation
│   │   │   │       │   ├── jwt.service.ts     # Token creation/verification
│   │   │   │       │   └── sso.service.ts     # SAML 2.0 / OIDC handlers
│   │   │   │       ├── rbac/
│   │   │   │       │   ├── rbac.routes.ts
│   │   │   │       │   ├── rbac.service.ts    # Role CRUD, permission resolution
│   │   │   │       │   ├── rbac.middleware.ts  # Permission check factory
│   │   │   │       │   └── rbac.cache.ts      # Redis permission cache
│   │   │   │       ├── audit/
│   │   │   │       │   ├── audit.service.ts   # Log writer, chain hash
│   │   │   │       │   └── audit.repository.ts
│   │   │   │       ├── custom-fields/
│   │   │   │       │   ├── custom-field.service.ts
│   │   │   │       │   └── custom-field.repository.ts
│   │   │   │       ├── workflows/
│   │   │   │       │   ├── workflow.service.ts
│   │   │   │       │   ├── workflow.engine.ts  # Rule evaluation + action execution
│   │   │   │       │   └── workflow.repository.ts
│   │   │   │       └── __tests__/
│   │   │   │
│   │   │   ├── infra/
│   │   │   │   ├── event-bus.ts         # BullMQ publish/subscribe abstraction
│   │   │   │   ├── outbox.ts            # Outbox relay (poll + publish)
│   │   │   │   ├── websocket.ts         # Socket.IO setup + Redis adapter
│   │   │   │   ├── queue.ts             # Background job definitions
│   │   │   │   ├── email.ts             # Transactional email (Resend/SendGrid)
│   │   │   │   ├── storage.ts           # S3 abstraction (upload, signed URLs)
│   │   │   │   ├── pdf.ts              # Puppeteer-based PDF generator
│   │   │   │   ├── search.ts            # Meilisearch index management
│   │   │   │   └── telemetry.ts         # OpenTelemetry setup (traces, metrics)
│   │   │   │
│   │   │   └── health.ts               # /health, /ready endpoints
│   │   │
│   │   ├── __tests__/
│   │   │   ├── integration/             # Cross-module integration tests
│   │   │   │   ├── deal-to-invoice.test.ts
│   │   │   │   ├── lead-to-deal.test.ts
│   │   │   │   └── order-fulfillment.test.ts
│   │   │   └── e2e/                     # Full API E2E tests
│   │   │       └── sales-pipeline.test.ts
│   │   │
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                             # React SPA frontend
│   │   ├── src/
│   │   │   ├── main.tsx                 # App entry, providers, router
│   │   │   ├── router.tsx               # Route definitions (lazy-loaded per module)
│   │   │   ├── providers/
│   │   │   │   ├── auth-provider.tsx     # JWT state, refresh, logout
│   │   │   │   ├── tenant-provider.tsx   # Tenant context
│   │   │   │   ├── rbac-provider.tsx     # Permission context, usePermission() hook
│   │   │   │   ├── socket-provider.tsx   # WebSocket connection + event dispatch
│   │   │   │   └── query-provider.tsx    # TanStack Query client config
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts          # Auth state, login/logout
│   │   │   │   ├── use-permission.ts    # RBAC check: usePermission('sales', 'deal', 'update')
│   │   │   │   ├── use-realtime.ts      # Subscribe to WebSocket events
│   │   │   │   ├── use-offline.ts       # Offline detection + queue
│   │   │   │   └── use-i18n.ts          # Internationalization
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── sales/
│   │   │   │   │   ├── pages/           # Pipeline, DealDetail, LeadList, QuoteBuilder
│   │   │   │   │   ├── components/      # KanbanBoard, DealCard, LeadScoreChip
│   │   │   │   │   ├── hooks/           # usePipeline, useDeals, useLeadScore
│   │   │   │   │   ├── api.ts           # TanStack Query hooks for Sales API
│   │   │   │   │   └── routes.tsx       # Lazy route definitions for sales module
│   │   │   │   │
│   │   │   │   ├── accounting/          # Same pattern
│   │   │   │   │   ├── pages/           # InvoiceList, InvoiceDetail, Ledger, Reports
│   │   │   │   │   ├── components/      # InvoiceEditor, JournalTable, ChartOfAccounts
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── api.ts
│   │   │   │   │   └── routes.tsx
│   │   │   │   │
│   │   │   │   ├── support/             # Same pattern
│   │   │   │   ├── marketing/           # Same pattern
│   │   │   │   ├── inventory/           # Same pattern
│   │   │   │   ├── projects/            # Same pattern
│   │   │   │   ├── comms/               # Same pattern
│   │   │   │   ├── analytics/           # Same pattern (charts, report builder)
│   │   │   │   └── platform/            # Admin: roles, custom fields, workflows
│   │   │   │
│   │   │   ├── layouts/
│   │   │   │   ├── app-shell.tsx        # Main layout: sidebar + top bar + content
│   │   │   │   ├── portal-shell.tsx     # Customer portal layout
│   │   │   │   └── auth-layout.tsx      # Login/register/SSO pages
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── api-client.ts        # Fetch wrapper with JWT injection, refresh
│   │   │       ├── socket-client.ts     # Socket.IO client singleton
│   │   │       └── i18n.ts             # i18next config
│   │   │
│   │   ├── public/
│   │   ├── index.html
│   │   ├── tailwind.config.ts           # Extends packages/ui config
│   │   ├── vite.config.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                          # React Native + Expo
│       ├── src/
│       │   ├── navigation/              # Stack/tab navigators
│       │   ├── screens/                 # Per-module screens
│       │   ├── components/              # Mobile-specific components
│       │   ├── hooks/
│       │   │   ├── use-offline-sync.ts  # WatermelonDB sync engine
│       │   │   └── use-gps-checkin.ts
│       │   ├── lib/
│       │   │   ├── offline-db.ts        # WatermelonDB schema + models
│       │   │   ├── sync-engine.ts       # Push/pull sync with conflict resolution
│       │   │   └── ocr.ts              # On-device receipt/card scanning
│       │   └── store/                   # Zustand stores
│       ├── app.json                     # Expo config
│       ├── package.json
│       └── tsconfig.json
│
├── tools/
│   ├── scripts/
│   │   ├── generate-openapi.ts          # Generate OpenAPI from Zod schemas
│   │   ├── seed-dev.ts                  # Seed dev database
│   │   └── migrate.ts                   # Run Prisma migrations
│   └── k8s/
│       ├── helm/                        # Helm chart templates
│       └── terraform/                   # Cloud infrastructure
│
└── tests/
    ├── load/                            # k6 load test scripts
    │   ├── pipeline-flow.js
    │   └── concurrent-users.js
    └── security/                        # Security-specific tests
        ├── rbac-boundary.test.ts
        └── injection.test.ts
```

**Structure Decision:** pnpm workspace monorepo with Turborepo for build orchestration. Three workspace categories: `packages/` (shared libraries), `apps/` (deployable applications), `tools/` (scripts and infrastructure). This supports the constitutional mandate of independent module testing while keeping everything in one repository for development velocity.

---

## Module Internal Architecture (Standard Pattern)

Every backend module follows the identical layered pattern to enforce Constitution Principle VI (convention over configuration):

```
modules/<name>/
├── routes.ts          # Express router — defines API endpoints, applies validation + RBAC
├── controller.ts      # Thin layer: parse request → call service → format response
├── service.ts         # ALL business logic lives here (pure functions, no I/O imports)
├── repository.ts      # ALL Prisma queries live here (single responsibility: data access)
├── events.ts          # Event publisher functions (wraps eventBus.publish)
├── listeners.ts       # Event subscriber registrations (handles events from other modules)
├── validators.ts      # Zod schemas for request/response validation
├── types.ts           # Module-private TypeScript types
└── __tests__/         # Co-located tests
    ├── service.test.ts      # Unit tests (mock repository, pure logic)
    ├── repository.test.ts   # Integration tests (real DB via testcontainers)
    └── routes.test.ts       # API contract tests (supertest)
```

**Rules (enforced by ESLint custom rules):**
- `service.ts` MUST NOT import from `@prisma/client` or any I/O library.
- `repository.ts` MUST NOT contain business logic (no `if` statements on domain rules).
- `routes.ts` MUST NOT call `repository.ts` directly — always through `service.ts`.
- Inter-module communication: only via `events.ts` (async) or by calling another module's `service.ts` public API (sync reads).
- No module may import from another module's `repository.ts`, `types.ts`, or `controller.ts`.

---

## Key Technical Designs

### 1. RBAC Permission Resolution

```typescript
// Permission check flow (per-request)
type PermissionCheck = {
  module: string;      // "sales"
  entity: string;      // "deal"
  action: CrudAction;  // "read" | "create" | "update" | "delete"
  field?: string;      // Optional field-level check
};

// Middleware factory
function requirePermission(check: PermissionCheck) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user.roles;    // From JWT
    const permissions = await rbacCache.resolve(userRoles); // Redis-cached

    // 1. Module-level check
    const moduleAccess = permissions.modules[check.module];
    if (moduleAccess === 'none') return res.status(403).json({ error: 'Forbidden' });

    // 2. Entity-level check (CRUD + ownership scope)
    const entityPerm = permissions.entities[`${check.module}.${check.entity}`];
    if (!entityPerm?.actions.includes(check.action)) return res.status(403).json({ error: 'Forbidden' });

    // 3. Attach ownership filter to request (for repository layer)
    req.ownershipScope = entityPerm.scope; // 'own' | 'team' | 'all'
    req.fieldPermissions = permissions.fields[`${check.module}.${check.entity}`] || {};

    next();
  };
}

// Usage in routes.ts
router.get('/deals', requirePermission({ module: 'sales', entity: 'deal', action: 'read' }), dealController.list);
```

### 2. Audit Trail with Cryptographic Chain

```typescript
// Every mutation passes through audit middleware
interface AuditEntry {
  id: string;               // UUID v7
  tenantId: string;
  actorId: string;
  ip: string;
  userAgent: string;
  module: string;
  entity: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  changes: FieldChange[];   // { field, oldValue, newValue }
  timestamp: string;        // ISO 8601
  previousHash: string;     // Hash of previous audit entry (chain)
  hash: string;             // SHA-256(JSON.stringify(this without hash))
}

// Prisma middleware captures before/after state automatically
// Audit entries written to append-only table (no UPDATE/DELETE grants on audit schema)
```

### 3. Double-Entry Accounting Engine

```typescript
// Core invariant: every transaction produces balanced journal entries
interface JournalEntryLine {
  accountId: string;     // Chart of Accounts reference
  debit: Money;          // { amount: Decimal, currency: string }
  credit: Money;
}

interface JournalEntry {
  id: string;
  date: Date;
  description: string;
  reference: { type: 'invoice' | 'payment' | 'expense' | 'po'; id: string };
  lines: JournalEntryLine[];
  period: string;         // e.g., "2026-03"
  immutable: true;        // Enforced at DB level (no UPDATE trigger)
}

// Validation: sum(debits) === sum(credits) — enforced in service layer AND DB constraint
// Corrections: new reversing entry only, never modify existing
```

### 4. Frontend State Management Strategy

```
┌────────────────────────────────────────────────────┐
│                    React App                        │
│                                                    │
│  ┌──────────────────┐  ┌───────────────────────┐   │
│  │  TanStack Query   │  │   Zustand Stores      │   │
│  │  (Server State)   │  │   (Client State)      │   │
│  │                   │  │                       │   │
│  │  • API data cache │  │  • UI state (sidebar) │   │
│  │  • Background     │  │  • Form drafts        │   │
│  │    refetch         │  │  • Notification queue │   │
│  │  • Optimistic      │  │  • Active filters     │   │
│  │    mutations       │  │  • Offline queue      │   │
│  │  • Pagination      │  │                       │   │
│  └────────┬─────────┘  └───────────────────────┘   │
│           │                                         │
│           │ invalidateQueries()                     │
│           │                                         │
│  ┌────────┴─────────┐                              │
│  │  WebSocket Layer  │  Socket.IO client            │
│  │                   │  Receives: entity.updated,   │
│  │  Listens to       │  dashboard.metric_changed    │
│  │  real-time events │                              │
│  │  → Triggers query │  Room: tenant:<tid>          │
│  │    invalidation   │                              │
│  └──────────────────┘                              │
└────────────────────────────────────────────────────┘
```

**Key patterns:**
- **Optimistic updates**: Mutations update the cache immediately, then reconcile with server response. Rollback on error.
- **WebSocket → Query invalidation**: When a real-time event arrives (e.g., `deal.stage_changed`), the socket layer calls `queryClient.invalidateQueries(['deals'])` to trigger automatic refetch of stale data.
- **Module code splitting**: Each module's routes are lazy-loaded via `React.lazy()`. Only the active module's JS is loaded.

### 5. Offline-First Mobile Sync

```
┌─────────────────────┐         ┌──────────────────┐
│   React Native App   │         │   API Server      │
│                      │  PUSH   │                   │
│  WatermelonDB        │────────▶│ /sync/push        │
│  (SQLite)            │         │ Applies changes   │
│                      │  PULL   │ Returns conflicts │
│  Sync Engine:        │◀────────│ /sync/pull        │
│  - Track dirty rows  │         │ Returns changes   │
│  - Timestamp-based   │         │ since lastSyncAt  │
│  - Conflict detect   │         │                   │
└─────────────────────┘         └──────────────────┘
```

**Sync protocol:**
1. **Pull**: Client sends `lastPulledAt` timestamp. Server returns all records modified after that timestamp (scoped to user's assigned data per RBAC).
2. **Push**: Client sends locally created/updated/deleted records. Server applies them; if a conflict is detected (server version newer), it returns the conflict for client-side resolution UI.
3. Sync runs on connectivity change (online) + periodic background (every 5 min when online).

---

## Database Schema Design (High-Level)

### Schema Isolation

```sql
-- One PostgreSQL database, multiple schemas
CREATE SCHEMA platform;    -- Tenants, Users, Roles, Permissions, AuditLogs
CREATE SCHEMA sales;       -- Contacts, Accounts, Leads, Deals, Quotes
CREATE SCHEMA accounting;  -- Invoices, JournalEntries, Expenses, ChartOfAccounts
CREATE SCHEMA support;     -- Tickets, KBArticles, SLAs
CREATE SCHEMA marketing;   -- Campaigns, Segments, EmailEvents
CREATE SCHEMA inventory;   -- Products, PriceBooks, StockLevels, Orders, POs
CREATE SCHEMA projects;    -- Projects, Tasks, Milestones, TimeEntries
CREATE SCHEMA comms;       -- Activities, EmailSyncs, CallLogs
CREATE SCHEMA analytics;   -- Dashboards, Widgets, Reports, Forecasts

-- Every table has tenant_id + RLS
-- Cross-schema references use UUID foreign keys only (no JOINs in application code)
```

### Core Entity Relationships

```
platform.tenant ──┐
                   ├──▶ platform.user ──▶ platform.user_role ──▶ platform.role
                   │                                               ├── module_permissions
                   │                                               ├── entity_permissions
                   │                                               └── field_permissions
                   │
sales.contact ◀────┤    (tenant_id FK implicit via RLS)
sales.account ◀────┤
sales.lead ────────┤──▶ Converts to: contact + account + deal
sales.deal ────────┤──▶ sales.deal_contact (M2M)
sales.quote ───────┤──▶ sales.quote_line_item ──▶ inventory.product (UUID ref)
                   │
accounting.invoice ◀───── deal.won event (auto-created)
accounting.invoice_line ──▶ inventory.product (UUID ref)
accounting.journal_entry ──▶ accounting.journal_line ──▶ accounting.account (CoA)
accounting.expense ───────▶ projects.project (UUID ref)
                   │
support.ticket ────┤──▶ sales.contact (UUID ref)
                   │
marketing.campaign ┤──▶ marketing.campaign_contact (M2M, UUID ref to sales.contact)
                   │
projects.project ──┤──▶ sales.deal (UUID ref)
projects.task ─────┤──▶ platform.user (UUID ref)
projects.time_entry┤──▶ accounting (billable hours, UUID ref)
                   │
comms.activity ────┘──▶ Polymorphic: contact_id, deal_id, ticket_id (UUID refs)
```

### Prisma Schema Conventions

```prisma
// In every model:
model Deal {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  // ... domain fields ...
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdBy String   @map("created_by") @db.Uuid
  updatedBy String   @map("updated_by") @db.Uuid
  version   Int      @default(1)  // Optimistic locking

  @@map("deals")
  @@schema("sales")
  @@index([tenantId])
}
```

**Conventions:**
- All PKs: UUID v7 (time-ordered for index performance).
- All tables: `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- Optimistic locking via `version` column (incremented on update; stale version → `409 Conflict`).
- Cross-module references: UUID value only (no Prisma `@relation` across schemas). Resolved via API calls or read-model projections.
- `@@map` for snake_case DB names; camelCase in TypeScript.

---

## API Design Standards

### URL Convention

```
/api/v1/{module}/{entity}               # Collection
/api/v1/{module}/{entity}/{id}          # Individual resource
/api/v1/{module}/{entity}/{id}/{sub}    # Sub-resource

Examples:
GET    /api/v1/sales/deals               # List deals (filtered by RBAC scope)
POST   /api/v1/sales/deals               # Create deal
GET    /api/v1/sales/deals/:id           # Get deal by ID
PATCH  /api/v1/sales/deals/:id           # Update deal (partial)
DELETE /api/v1/sales/deals/:id           # Soft-delete deal

POST   /api/v1/sales/deals/:id/convert  # Action: convert lead to deal
GET    /api/v1/sales/deals/:id/timeline  # Sub-resource: activity timeline

GET    /api/v1/accounting/invoices
POST   /api/v1/accounting/invoices/:id/send   # Action: send invoice
POST   /api/v1/accounting/invoices/:id/void   # Action: void invoice
```

### Standard Response Envelope

```typescript
// Success (single)
{
  "data": { ... },
  "meta": { "requestId": "...", "timestamp": "..." }
}

// Success (list)
{
  "data": [ ... ],
  "meta": {
    "requestId": "...",
    "timestamp": "...",
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "total": 142,
      "totalPages": 6
    }
  }
}

// Error
{
  "error": {
    "code": "DEAL_NOT_FOUND",
    "message": "Deal with ID xyz not found",
    "details": [ ... ],    // Validation errors array if applicable
    "requestId": "..."
  }
}
```

### Request Validation (Zod)

```typescript
// validators.ts in each module
import { z } from 'zod';

export const createDealSchema = z.object({
  name: z.string().min(1).max(255),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  value: z.number().positive(),
  currency: z.string().length(3),    // ISO 4217
  contactIds: z.array(z.string().uuid()).min(1),
  accountId: z.string().uuid(),
  expectedCloseDate: z.string().datetime(),
  customFields: z.record(z.unknown()).optional(),
});

// OpenAPI generated from these schemas via zod-openapi
```

---

## Middleware Pipeline (Request Lifecycle)

```
Incoming Request
      │
      ▼
┌─── correlation.ts ────┐  Assign x-request-id, propagate trace context
│                        │
├─── rate-limit.ts ──────┤  Redis-backed: 1000 req/min per API key
│                        │
├─── auth.ts ────────────┤  Verify JWT, reject if expired/invalid/revoked
│                        │
├─── tenant.ts ──────────┤  Extract tenantId from JWT, SET app.current_tenant
│                        │
├─── rbac.ts ────────────┤  Check module/entity/field permissions
│                        │
├─── validate.ts ────────┤  Zod schema validation on req.body/query/params
│                        │
├─── [Controller] ───────┤  Business logic via service → repository
│                        │
├─── audit.ts ───────────┤  Post-response: log mutation to audit trail
│                        │
├─── error-handler.ts ───┤  Catch all errors → standard error envelope
│                        │
└─── telemetry ──────────┘  Record latency, status code, module/entity tags
```

---

## Deployment Architecture

```
                    ┌─────────────────────────┐
                    │      CDN (CloudFront)    │
                    │   Static: web, assets    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Load Balancer (ALB)   │
                    │    TLS termination       │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
    ┌─────────▼──────┐ ┌────────▼───────┐ ┌────────▼───────┐
    │  API Pod (K8s)  │ │  API Pod (K8s) │ │  API Pod (K8s) │
    │  Node.js        │ │  Node.js       │ │  Node.js       │
    │  All 10 modules │ │  All 10 modules│ │  All 10 modules│
    │  + Socket.IO    │ │  + Socket.IO   │ │  + Socket.IO   │
    └──────┬──────────┘ └──────┬─────────┘ └──────┬─────────┘
           │                   │                   │
    ┌──────▼───────────────────▼───────────────────▼──────┐
    │                 Shared Data Layer                     │
    │                                                      │
    │  PostgreSQL 16       Redis 7          Meilisearch    │
    │  (RDS / Aurora)      (ElastiCache)    (self-hosted)  │
    │  Primary + Replica   Cluster mode     Search index   │
    │                                                      │
    │  S3                  BullMQ queues                   │
    │  (Documents, PDFs)   (via Redis)                     │
    └──────────────────────────────────────────────────────┘
```

**Scaling strategy:**
- API pods scale horizontally (stateless). Socket.IO uses Redis adapter for multi-pod broadcasting.
- PostgreSQL read replica for Analytics/reporting heavy queries.
- BullMQ workers can run as separate pod(s) for background jobs (email sending, PDF generation, bulk import).
- Future: extract high-throughput modules (Analytics, Comms) into independent services if needed.

---

## Security Architecture Summary

| Layer | Mechanism |
|-------|-----------|
| **Network** | TLS 1.3 everywhere; VPC isolation; security groups restrict DB/Redis access |
| **Authentication** | JWT (15 min) + opaque refresh (7 day, single-use rotation) |
| **Authorization** | RBAC middleware (module → entity → field → ownership) |
| **Data Isolation** | PostgreSQL RLS with `SET app.current_tenant` per request |
| **Encryption at Rest** | PostgreSQL: AWS RDS encryption (AES-256); S3: SSE-S3 |
| **Field-Level Encryption** | Prisma middleware encrypts PII/financial fields before write, decrypts on read |
| **Audit** | Append-only table, cryptographic chain, no UPDATE/DELETE grants |
| **Input Validation** | Zod schemas on every endpoint; parameterized queries (Prisma) |
| **Rate Limiting** | Redis sliding window: 1000 req/min external, unlimited internal |
| **Secrets** | K8s secrets from vault; rotated; never logged |
| **CI Security** | SAST (Semgrep), dependency scan (Snyk/npm audit), secret detection (gitleaks) |
| **Headers** | Helmet.js: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |

---

## Testing Strategy

| Layer | Tool | Scope | Target |
|-------|------|-------|--------|
| **Unit** | Vitest | Service layer (pure logic), validators, domain helpers | ≥80% coverage per module |
| **Integration** | Vitest + Testcontainers | Repository layer with real PostgreSQL + Redis | All CRUD + edge cases |
| **API Contract** | Vitest + Supertest | Full request → response per endpoint | Every route, auth/RBAC test |
| **E2E** | Playwright | Browser-based user journeys | P1 user stories |
| **Load** | k6 | API capacity under concurrent load | 500 users, p95 < 200ms |
| **Security** | Custom + Semgrep | RBAC boundary, injection, auth flows | All module/entity combinations |
| **Accounting** | Vitest | Trial balance invariant (debits = credits) for all tx types | 100% financial paths |

**Test execution in CI:**
```
Unit tests (parallel per module) → 
Integration tests (sequentially, shared testcontainer) → 
API contract tests → 
Security boundary tests → 
E2E (critical paths only on PR, full suite on main) → 
Load tests (nightly / pre-release)
```

---

## Implementation Phasing (Recommended Build Order)

The modules have dependencies that dictate build order. Platform is the foundation; Sales is the first vertical; Accounting is the key differentiator.

### Phase 0: Foundation (Weeks 1-3)

| Component | Deliverable |
|-----------|-------------|
| **Monorepo scaffolding** | pnpm workspace, Turborepo, Docker Compose, CI pipeline skeleton |
| **Shared kernel** | Types (UserId, TenantId, Money), error classes, event interface |
| **DB package** | Prisma config, base schema (platform tables), RLS setup, migrations |
| **API skeleton** | Express app, middleware pipeline (auth stub, tenant, RBAC stub, audit stub, error handler, telemetry) |
| **Web skeleton** | Vite + React + Router + Tailwind + TanStack Query + Zustand, auth context |
| **Design system v0** | Button, Input, Select, Dialog, DataTable, Toast from Radix + Tailwind |
| **Auth (Platform)** | Login, JWT issuance, refresh, basic RBAC (module-level), SSO stub |

### Phase 1: Sales MVP (Weeks 4-7)

| Component | Deliverable |
|-----------|-------------|
| **Platform RBAC** | Full module + entity + field + ownership permission model |
| **Platform Audit** | Prisma middleware, append-only log, chain hash |
| **Platform Custom Fields** | EAV or JSONB storage, dynamic form rendering |
| **Sales: Contacts & Accounts** | CRUD, list with filters/sort, timeline, import |
| **Sales: Leads** | Capture, scoring (rule-based), assignment, conversion |
| **Sales: Deals & Pipeline** | Kanban board, stage transitions, deal detail, rotting alerts |
| **Sales: Quotes (CPQ)** | Quote builder, line items, discount, tax, PDF generation |
| **Event Bus** | BullMQ setup, outbox pattern, first events (deal.won) |
| **WebSocket** | Socket.IO setup, Redis adapter, pipeline board live updates |

### Phase 2: Accounting & Inventory (Weeks 8-12)

| Component | Deliverable |
|-----------|-------------|
| **Accounting: Chart of Accounts** | Default chart, CRUD, account types |
| **Accounting: Invoicing** | Auto-create from deal.won, line items, PDF, email send |
| **Accounting: Journal Entries** | Double-entry engine, immutable entries, reversals |
| **Accounting: Payments** | Manual recording, partial payments, AR tracking |
| **Accounting: Expenses** | Submission, OCR (receipt), approval workflow, auto-JE |
| **Accounting: Reports** | P&L, Balance Sheet, Trial Balance, AR/AP Aging |
| **Inventory: Products** | Catalog, price books, stock levels |
| **Inventory: Orders** | Sales orders from deals, POs, fulfillment, stock adjustment |
| **Inventory → Accounting** | JE on receipt (Inventory ↑, AP ↑) and fulfillment (COGS ↑, Inv ↓) |

### Phase 3: Support & Comms (Weeks 13-16)

| Component | Deliverable |
|-----------|-------------|
| **Support: Ticketing** | Multi-channel creation, assignment, SLA timers, escalation |
| **Support: Knowledge Base** | Article CRUD, search (Meilisearch), suggestion in ticket view |
| **Support: Self-Service Portal** | Customer login, ticket submission, KB access, invoice viewing |
| **Support: CSAT** | Survey trigger on resolution, scoring, analytics event |
| **Comms: Email Sync** | Gmail/Outlook 2-way sync, contact matching, timeline entry |
| **Comms: VoIP** | Twilio click-to-call, duration tracking, recording |
| **Comms: Templates** | Merge fields, send from CRM, open/click tracking |
| **Comms: Timeline** | Unified activity timeline on Contact/Account/Deal |

### Phase 4: Marketing & Analytics (Weeks 17-20)

| Component | Deliverable |
|-----------|-------------|
| **Marketing: Segmentation** | Dynamic segments from contact/deal attributes |
| **Marketing: Campaigns** | Email builder, A/B testing, scheduled sends, compliance |
| **Marketing: Attribution** | Multi-touch attribution (first, last, linear), revenue credit |
| **Analytics: Dashboards** | Real-time dashboard with configurable widgets, WebSocket updates |
| **Analytics: Report Builder** | Drag-and-drop, grouping, aggregation, export |
| **Analytics: AI Forecasting** | Revenue prediction model (linear regression / gradient boost on historical deals) |
| **Analytics: Lead Scoring AI** | ML-based scoring combining demographics + behavior |

### Phase 5: Projects & Mobile (Weeks 21-24)

| Component | Deliverable |
|-----------|-------------|
| **Projects: Boards** | Kanban, tasks, milestones, template-based creation |
| **Projects: Time Tracking** | Per-task logging, billable flag, Accounting integration |
| **Projects: Client Portal** | Project progress, milestones, comments (no internal data) |
| **Platform: Workflow Builder** | No-code: triggers, conditions, cross-module actions |
| **Mobile: Core app** | React Native + Expo, navigation, auth, basic CRUD |
| **Mobile: Offline sync** | WatermelonDB, sync engine, conflict resolution |
| **Mobile: GPS + OCR** | Check-in, receipt scanning, business card scanning |

### Phase 6: Hardening & Launch (Weeks 25-28)

| Component | Deliverable |
|-----------|-------------|
| **Performance optimization** | Query optimization, Redis caching, CDN, code splitting audit |
| **Load testing** | k6 tests for 500 concurrent users, all performance budgets verified |
| **Security audit** | Penetration test, RBAC boundary test suite, SAST clean |
| **Compliance** | GDPR data erasure flow, audit log integrity verification, tax compliance |
| **i18n** | String extraction, RTL testing, multi-currency formatting |
| **Documentation** | API docs (OpenAPI), admin guide, deployment runbook |
| **Monitoring** | Grafana dashboards, SLO-based alerts, runbooks |

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Accounting engine correctness | Critical — financial data errors | Medium | TDD with exhaustive double-entry invariant tests; hire/consult financial domain expert; start single-currency |
| Prisma multi-schema support maturity | High — could block schema isolation | Low | Prisma's `multiSchema` preview is stable since v5.x; fallback: raw SQL for cross-schema, or knex for Accounting module |
| BullMQ at-least-once → duplicate processing | Medium — double invoices | Medium | Idempotency keys on all event consumers; outbox table deduplication |
| Real-time at scale (Socket.IO + Redis) | Medium — degraded dashboard UX | Low | Redis adapter handles multi-pod; rate-limit event broadcasts; batch dashboard updates |
| Offline sync conflicts on mobile | Medium — data loss perception | Low | LWW + manual override UI; sync small batches; comprehensive conflict test suite |
| Monorepo build times | Medium — developer friction | Medium | Turborepo caching; affected-only CI; parallel module builds |

---

## Complexity Tracking

No constitutional violations detected. The following complexities are **justified**:

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| 10 schema namespaces in one DB | Module isolation per Constitution II | Single schema would allow cross-module joins, violating bounded contexts |
| RBAC at 3 levels (module/entity/field) | Constitution I mandates field-level security | Module-only RBAC would not protect PII or financial fields from unauthorized roles |
| Outbox pattern for events | Guarantees no lost events on publish failure | Direct publish (fire-and-forget) risks lost events during Redis outage |
| Dual state management (TanStack + Zustand) | Server state semantics differ from client UI state | Single store (Redux) would mix caching concerns with UI state, adding complexity |

---

**📋 Architectural decision detected: Prisma vs. Drizzle ORM — Prisma chosen for type safety, migration tooling, and multi-schema preview support. Document? Run `/sp.adr orm-selection`.**

**📋 Architectural decision detected: BullMQ (Redis) vs. Kafka vs. RabbitMQ for internal event bus — BullMQ chosen for simplicity in monolith; Kafka reserved for future extraction. Document? Run `/sp.adr event-bus-selection`.**

**📋 Architectural decision detected: Modular monolith vs. microservices — monolith chosen for v1 due to team size and operational simplicity. Document? Run `/sp.adr modular-monolith-vs-microservices`.**
