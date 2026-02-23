# Tasks: SoftCRM Enterprise Platform

**Input**: [specs/crm-platform/plan.md](plan.md), [specs/crm-platform/spec.md](spec.md)  
**Prerequisites**: plan.md ✅, spec.md ✅, constitution.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US10) or Foundation (FND)
- Exact file paths relative to `softcrm/` monorepo root

---

## Phase 1: Setup (Monorepo Scaffolding)

**Purpose**: Initialize the pnpm monorepo with Turborepo, Docker Compose, and CI skeleton.

- [ ] T001 Create monorepo root: `package.json` (pnpm workspaces), `pnpm-workspace.yaml` (packages/\*, apps/\*), `turbo.json` (build/test/lint pipelines), `.npmrc`, root `tsconfig.base.json`
- [ ] T002 [P] Create `docker-compose.yml` with PostgreSQL 16, Redis 7, Meilisearch services; `.env.example` with all required env vars
- [ ] T003 [P] Create `.github/workflows/ci.yml`: lint → unit test → integration test → build; per-package caching via Turborepo
- [ ] T004 [P] Configure root linting: `.eslintrc.cjs` (TypeScript strict), `.prettierrc`, `lint-staged` + Husky pre-commit hook
- [ ] T005 [P] Create `.gitignore`, `.editorconfig`, `README.md` with quickstart instructions

**Checkpoint**: `pnpm install` succeeds; `docker compose up -d` starts PG + Redis + Meilisearch; CI runs on push.

---

## Phase 2: Foundation — Shared Packages (Blocking Prerequisites)

**Purpose**: Build shared-kernel, db package, and UI design system that ALL modules depend on.

**⚠️ CRITICAL**: No module implementation can begin until this phase is complete.

### 2A: Shared Kernel (`packages/shared-kernel/`)

- [ ] T006 [P] [FND] Initialize `packages/shared-kernel/package.json` and `tsconfig.json`; create barrel export at `src/index.ts`
- [ ] T007 [P] [FND] Create value-object types in `src/types/`: `UserId`, `TenantId`, `Money` (amount: Decimal + currency: string), `Address`, `PhoneNumber`, `EmailAddress`, `DateRange`, `Pagination`, `SortOrder`
- [ ] T008 [P] [FND] Create base error classes in `src/errors/`: `AppError` (abstract), `NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`, `UnauthorizedError` — each with `code`, `statusCode`, `details`
- [ ] T009 [P] [FND] Create domain event interface in `src/events/`: `DomainEvent<T>` (id, type, tenantId, actorId, aggregateId, aggregateType, payload, correlationId, timestamp, version); event type registry enum for all 19 events from spec
- [ ] T010 [P] [FND] Create utility functions in `src/utils/`: `generateId()` (UUID v7), `slugify()`, `formatMoney()`, `parseDateRange()`, `assertNever()`, `paginate()`
- [ ] T011 [FND] Write unit tests for shared-kernel: `src/__tests__/money.test.ts` (arithmetic, currency mismatch), `src/__tests__/errors.test.ts` (serialization), `src/__tests__/events.test.ts` (type validation)

### 2B: Database Package (`packages/db/`)

- [ ] T012 [FND] Initialize `packages/db/package.json`, `tsconfig.json`; install Prisma 6.x as dev dep, `@prisma/client` as dep
- [ ] T013 [FND] Create `prisma/schema/base.prisma`: datasource (postgresql, env `DATABASE_URL`), generator (client, multiSchema preview), shared enums (`Currency`, `ApprovalStatus`, `Priority`)
- [ ] T014 [FND] Create `prisma/schema/platform.prisma`: models `Tenant`, `User`, `Role`, `ModulePermission`, `EntityPermission`, `FieldPermission`, `UserRole` (M2M), `Team`, `UserTeam` (M2M), `AuditLog`, `RefreshToken`, `CustomFieldDef`, `CustomFieldValue` — all with `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `version`; `@@schema("platform")`
- [ ] T015 [FND] Create `src/client.ts`: Prisma client singleton with `$extends` for RLS middleware (executes `SET app.current_tenant` before every query); `src/tenant-context.ts`: `AsyncLocalStorage` wrapper to get/set current tenant ID; `src/index.ts` barrel export
- [ ] T016 [FND] Create initial migration: `prisma/migrations/` via `prisma migrate dev --name init_platform`; create SQL for PostgreSQL schemas (`CREATE SCHEMA platform; ... sales; accounting; support; marketing; inventory; projects; comms; analytics;`) and RLS policies on platform tables
- [ ] T017 [FND] Create `prisma/seed.ts`: seed default tenant, admin user (hashed password), default roles (Super Admin, Sales Rep, Accountant, Support Agent, Marketing Manager, Inventory Manager, Project Manager, Read-Only), and default Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses with standard sub-accounts)
- [ ] T018 [FND] Write integration tests: `src/__tests__/client.test.ts` (tenant isolation via RLS — insert as tenant A, verify tenant B cannot read), `src/__tests__/seed.test.ts` (seed runs without error, roles exist)

### 2C: Design System (`packages/ui/`)

- [ ] T019 [P] [FND] Initialize `packages/ui/package.json`, `tsconfig.json`; install React 19, Tailwind CSS 4, Radix UI primitives, `class-variance-authority`
- [ ] T020 [P] [FND] Create design tokens in `src/tokens/`: colors (brand, semantic, neutral), spacing scale, typography (font families, sizes, weights), border-radius, shadows, z-index scale — exported as Tailwind config plugin
- [ ] T021 [P] [FND] Create `tailwind.config.ts`: extends tokens, configures content paths for packages and apps consumers
- [ ] T022 [FND] Create primitive components in `src/primitives/`: `Button` (variants: primary/secondary/ghost/destructive, sizes: sm/md/lg, loading state), `Input` (text/number/date/email, error state), `Select` (Radix-based, searchable), `Checkbox`, `RadioGroup`, `Textarea`, `Badge`, `Avatar`, `Tooltip`
- [ ] T023 [FND] Create composite components in `src/composites/`: `Dialog` (Radix, sizes), `DropdownMenu`, `Toast` (Radix toast provider + imperative `toast()` function), `Tabs`, `Accordion`
- [ ] T024 [FND] Create layout components in `src/layouts/`: `Shell` (sidebar + topbar + content slot), `Sidebar` (collapsible, nav items with icon + label + badge), `TopNav` (breadcrumb + search + user menu + notifications), `MobileNav` (bottom tab bar)
- [ ] T025 [FND] Create `DataTable` composite in `src/composites/data-table.tsx`: TanStack Table integration with sorting, filtering, column visibility, pagination, row selection, bulk actions toolbar — generic `<DataTable<T>>` accepting column definitions
- [ ] T026 [FND] Create `KanbanBoard` composite in `src/composites/kanban.tsx`: drag-and-drop columns (via `@dnd-kit/core`), card slots, column headers with count/sum, `onCardMove(cardId, fromCol, toCol)` callback
- [ ] T027 [P] [FND] Create `FormBuilder` composite in `src/composites/form-builder.tsx`: renders form fields from a schema definition (supports custom fields), integrates React Hook Form + Zod validation
- [ ] T028 [FND] Write component tests: `src/__tests__/button.test.tsx`, `src/__tests__/data-table.test.tsx`, `src/__tests__/kanban.test.tsx` — render + interaction tests with Vitest + Testing Library

**Checkpoint**: `packages/shared-kernel`, `packages/db`, `packages/ui` all build and pass tests. `pnpm turbo build` succeeds for all packages.

---

## Phase 3: Foundation — API & Web Skeletons (Blocking Prerequisites)

**Purpose**: Create the Express API server with full middleware pipeline and the React SPA shell with auth flow.

### 3A: API Server (`apps/api/`)

- [ ] T029 [FND] Initialize `apps/api/package.json` with Express.js, cors, helmet, compression, cookie-parser, Pino (logger), dotenv, Zod, Socket.IO; `tsconfig.json` extending root
- [ ] T030 [FND] Create `src/config/index.ts`: Zod-validated environment config (PORT, DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, MEILISEARCH_URL, S3_BUCKET, SENDGRID_API_KEY, TWILIO_*, PLAID_*); typed `Config` object
- [ ] T031 [FND] Create `src/server.ts`: Express app factory function — registers middleware in order (correlation → rate-limit → auth → tenant → RBAC → validate → routes → audit → error-handler); starts HTTP server + Socket.IO attach; graceful shutdown handler (SIGTERM)
- [ ] T032 [FND] Create `src/middleware/correlation.ts`: generate `x-request-id` (UUID v7) if not present in headers; attach to `req.requestId`; set on Pino child logger
- [ ] T033 [P] [FND] Create `src/middleware/rate-limit.ts`: Redis sliding-window rate limiter (1000 req/min per API key or IP); returns `429` with `Retry-After` header
- [ ] T034 [FND] Create `src/middleware/auth.ts`: verify JWT from `Authorization: Bearer` header; decode payload into `req.user` (`{ userId, tenantId, roles, jti }`); check token not in Redis blacklist; skip for public routes (`/auth/login`, `/auth/register`, `/health`)
- [ ] T035 [FND] Create `src/middleware/tenant.ts`: extract `tenantId` from `req.user.tid`; execute `SET app.current_tenant` on Prisma connection via AsyncLocalStorage; reject if tenant not found or suspended
- [ ] T036 [FND] Create `src/middleware/validate.ts`: factory function `validate(schema: ZodSchema)` that validates `req.body`, `req.query`, `req.params` against provided Zod schemas; returns `400` with structured validation errors
- [ ] T037 [FND] Create `src/middleware/error-handler.ts`: global error handler — catches `AppError` subclasses → maps to HTTP status + error envelope; catches unknown errors → `500` + generic message; logs full error with Pino; includes `requestId` in response
- [ ] T038 [FND] Create `src/health.ts`: `GET /health` (200 if process alive), `GET /ready` (200 if DB + Redis connections healthy, 503 otherwise)
- [ ] T039 [FND] Create `src/infra/event-bus.ts`: BullMQ-backed publish/subscribe abstraction — `eventBus.publish(event: DomainEvent)` and `eventBus.subscribe(eventType, handler)` with idempotency check (event.id in Redis SET); configure 3 retries + DLQ
- [ ] T040 [FND] Create `src/infra/outbox.ts`: outbox relay — poll `platform.outbox` table every 1s for unpublished events, publish to BullMQ, mark as published; runs as background interval in the same process
- [ ] T041 [P] [FND] Create `src/infra/websocket.ts`: Socket.IO setup with Redis adapter; JWT auth on connection handshake; join tenant room `tenant:<tenantId>` and user room `user:<userId>`; `broadcastToTenant(tenantId, event)` helper
- [ ] T042 [P] [FND] Create `src/infra/email.ts`: transactional email abstraction — `sendEmail({ to, subject, html, from? })` wrapping Resend/SendGrid API; template rendering with Handlebars
- [ ] T043 [P] [FND] Create `src/infra/storage.ts`: S3 abstraction — `uploadFile(key, buffer, contentType)`, `getSignedUrl(key, expiresIn)`, `deleteFile(key)` using AWS SDK v3
- [ ] T044 [P] [FND] Create `src/infra/pdf.ts`: Puppeteer PDF generator — `generatePdf(htmlString): Promise<Buffer>`; accepts HTML template string, returns PDF buffer
- [ ] T045 [P] [FND] Create `src/infra/search.ts`: Meilisearch abstraction — `indexDocument(indexName, doc)`, `search(indexName, query, filters)`, `deleteDocument(indexName, id)`
- [ ] T046 [P] [FND] Create `src/infra/telemetry.ts`: OpenTelemetry SDK setup — auto-instrument Express, Prisma, Redis; export traces to OTLP endpoint; Pino logger integration
- [ ] T047 [FND] Write API skeleton tests: `src/__tests__/health.test.ts` (Supertest: /health returns 200), `src/__tests__/middleware/auth.test.ts` (valid JWT passes, expired JWT returns 401, missing JWT returns 401), `src/__tests__/middleware/error-handler.test.ts` (AppError → correct status code, unknown error → 500)

### 3B: Web App Shell (`apps/web/`)

- [ ] T048 [P] [FND] Initialize `apps/web/` with Vite + React 19 + TypeScript; `package.json` (deps: `react-router`, `@tanstack/react-query`, `zustand`, `socket.io-client`, `@softcrm/ui`); `vite.config.ts`, `tailwind.config.ts` (extends `@softcrm/ui/tailwind`), `index.html`
- [ ] T049 [FND] Create `src/main.tsx`: mount `<App />` with nested providers — `<QueryProvider>` → `<AuthProvider>` → `<TenantProvider>` → `<RbacProvider>` → `<SocketProvider>` → `<RouterProvider>`
- [ ] T050 [FND] Create `src/providers/query-provider.tsx`: TanStack Query client with default staleTime (30s), gcTime (5min), refetchOnWindowFocus
- [ ] T051 [FND] Create `src/providers/auth-provider.tsx`: stores access token in memory, refresh token in httpOnly cookie; `login(email, password)`, `logout()`, `refreshToken()` (automatic on 401); exposes `useAuth()` hook
- [ ] T052 [FND] Create `src/providers/tenant-provider.tsx`: extracts tenantId from JWT; exposes `useTenant()` hook with tenant metadata
- [ ] T053 [FND] Create `src/providers/rbac-provider.tsx`: fetches user permissions from `/api/v1/platform/me/permissions` on login; caches in Zustand; exposes `usePermission(module, entity, action): boolean` and `<Can module entity action>` guard component
- [ ] T054 [FND] Create `src/providers/socket-provider.tsx`: Socket.IO client that connects after auth; joins tenant + user rooms; dispatches events to subscribers; auto-reconnect; exposes `useSocket()` hook
- [ ] T055 [FND] Create `src/lib/api-client.ts`: fetch wrapper — auto-injects `Authorization: Bearer` header; on 401, attempts token refresh then retries; passes `x-request-id` header; returns typed `ApiResponse<T>` | `ApiError`
- [ ] T056 [FND] Create `src/hooks/use-permission.ts`: `usePermission(module, entity, action)` → boolean; `useFieldPermission(module, entity, field)` → `{ visible, editable }`; reads from RBAC provider
- [ ] T057 [FND] Create `src/hooks/use-realtime.ts`: `useRealtime(eventType, callback)` — subscribes to WebSocket events while component is mounted; auto-unsubscribes on unmount
- [ ] T058 [FND] Create `src/layouts/app-shell.tsx`: main layout — `<Sidebar>` (collapsible, nav items filtered by module permissions) + `<TopNav>` (breadcrumb, global search input, notification bell, user avatar/dropdown) + `<Outlet>` for page content
- [ ] T059 [FND] Create `src/layouts/auth-layout.tsx`: centered card layout for login/register/SSO/MFA pages
- [ ] T060 [FND] Create `src/router.tsx`: React Router with lazy-loaded module routes — `/sales/*`, `/accounting/*`, `/support/*`, `/marketing/*`, `/inventory/*`, `/projects/*`, `/comms/*`, `/analytics/*`, `/admin/*`; protected by `<AuthGuard>` (redirect to `/login` if not authenticated); RBAC-filtered navigation
- [ ] T061 [FND] Create login page at `src/modules/platform/pages/login.tsx`: email + password form, "Sign in with SSO" button, "Forgot password?" link; calls `POST /auth/login`; on success stores tokens via AuthProvider
- [ ] T062 [FND] Write web skeleton tests: `src/__tests__/auth-provider.test.tsx` (login sets token, logout clears, 401 triggers refresh), `src/__tests__/rbac-provider.test.tsx` (usePermission returns correct boolean based on mocked permissions)

**Checkpoint**: `pnpm turbo build` succeeds for all packages + apps. `docker compose up -d && pnpm --filter api dev` starts API with /health returning 200. `pnpm --filter web dev` shows login page. CI pipeline passes.

---

## Phase 4: US5 — Admin Configures RBAC, Custom Fields & Workflows (Priority: P1) 🎯

**Goal**: Full RBAC permission model with role CRUD, custom fields on any entity, and audit logging. This unblocks ALL other modules.

**Independent Test**: Create a role with restricted permissions, assign to a user, verify they can only access permitted modules/entities/fields. Add a custom field, verify it appears in forms and API responses.

### Backend: Platform Module Auth & RBAC (`apps/api/src/modules/platform/`)

- [ ] T063 [US5] Create `auth/auth.routes.ts`: `POST /auth/login`, `POST /auth/register` (admin-only tenant setup), `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/mfa/setup`, `POST /auth/mfa/verify`
- [ ] T064 [US5] Create `auth/auth.service.ts`: `login(email, password)` → verify bcrypt hash → issue access JWT (15 min) + refresh token (opaque, stored in Redis with 7-day TTL) → return both; `refresh(token)` → validate in Redis → rotate (delete old, create new) → return new pair; `logout(jti)` → add to Redis blacklist
- [ ] T065 [US5] Create `auth/jwt.service.ts`: `signAccessToken(payload)`, `verifyAccessToken(token)`, `signRefreshToken()`, `storeRefreshToken(token, userId, tenantId)`, `validateRefreshToken(token)`, `revokeRefreshToken(token)` — using `jose` library
- [ ] T066 [US5] Create `rbac/rbac.routes.ts`: `GET /api/v1/platform/roles` (list), `POST /api/v1/platform/roles` (create), `GET /api/v1/platform/roles/:id` (detail with all permissions), `PATCH /api/v1/platform/roles/:id` (update), `DELETE /api/v1/platform/roles/:id` (soft-delete); `GET /api/v1/platform/me/permissions` (current user's resolved permissions)
- [ ] T067 [US5] Create `rbac/rbac.service.ts`: `createRole(data)`, `updateRole(id, data)`, `deleteRole(id)`, `resolvePermissions(roleIds[])` → merge ModulePermission + EntityPermission + FieldPermission across multiple roles (most permissive wins); `assignRoleToUser(userId, roleId)`, `removeRoleFromUser(userId, roleId)`
- [ ] T068 [US5] Create `rbac/rbac.cache.ts`: Redis cache for resolved permissions keyed by `rbac:<userId>`; invalidate on role update or role-assignment change; TTL 5 min
- [ ] T069 [US5] Create `src/middleware/rbac.ts`: `requirePermission({ module, entity, action, field? })` middleware factory per the plan's design — checks ModulePermission → EntityPermission (+ sets `req.ownershipScope`) → FieldPermission (+ sets `req.fieldPermissions`); returns 403 on denial
- [ ] T070 [US5] Create `rbac/rbac.validators.ts`: Zod schemas for role create/update payloads, permission structures
- [ ] T071 [US5] Write tests: `rbac/__tests__/rbac.service.test.ts` (permission resolution with multiple roles — most permissive wins; ownership scope merging), `rbac/__tests__/rbac.middleware.test.ts` (403 on denied; ownership filtering attached; field permissions stripped)

### Backend: Audit Trail (`apps/api/src/modules/platform/audit/`)

- [ ] T072 [US5] Create `src/middleware/audit.ts`: Prisma middleware (`$use`) that captures before/after state on create/update/delete; computes field-level diff; writes `AuditLog` record with chain hash (SHA-256 of previous entry's hash + current entry JSON)
- [ ] T073 [US5] Create `audit/audit.service.ts`: `getAuditLog(entityType, recordId, pagination)` → returns chronological audit entries; `verifyChain(tenantId, startId, endId)` → validates hash chain integrity; `exportAuditLog(filters)` → CSV export
- [ ] T074 [US5] Create `audit/audit.repository.ts`: Prisma queries for audit log — append-only INSERT (no update/delete methods); query with filters (actor, module, entity, dateRange, recordId)
- [ ] T075 [US5] Write tests: `audit/__tests__/audit.service.test.ts` (chain hash verification passes on clean data, fails if entry tampered; field diff captures old/new values correctly)

### Backend: Custom Fields (`apps/api/src/modules/platform/custom-fields/`)

- [ ] T076 [US5] Create `custom-fields/custom-field.service.ts`: `createFieldDef(module, entity, { name, type, options, required, defaultValue })`, `updateFieldDef(id, updates)`, `deleteFieldDef(id)`, `getFieldDefs(module, entity)` — supported types: text, number, date, dropdown, multi-select, lookup, formula, rollup
- [ ] T077 [US5] Create `custom-fields/custom-field.repository.ts`: CRUD on `CustomFieldDef` and `CustomFieldValue` tables; `CustomFieldValue` stores values as JSONB with `fieldDefId` + `recordId` + `tenantId`
- [ ] T078 [US5] Write tests: `custom-fields/__tests__/custom-field.service.test.ts` (create field def, store/retrieve values, type validation, dropdown option enforcement)

### Frontend: Admin Module (`apps/web/src/modules/platform/`)

- [ ] T079 [P] [US5] Create `pages/roles-list.tsx`: DataTable of roles with name, user count, module access summary; "Create Role" button
- [ ] T080 [US5] Create `pages/role-detail.tsx`: role edit form with three permission tabs: Module Permissions (toggle per module: none/read/write/admin), Entity Permissions (per module → entity grid: scope dropdown + CRUD checkboxes), Field Permissions (per entity → field list: visible/editable toggles)
- [ ] T081 [P] [US5] Create `pages/custom-fields.tsx`: list of custom field definitions grouped by entity; "Add Field" dialog with name, type picker, options (for dropdown), required toggle, default value
- [ ] T082 [P] [US5] Create `pages/audit-log.tsx`: DataTable with filters (actor, module, entity, date range); expandable rows showing field-level changes (old → new); export to CSV button
- [ ] T083 [P] [US5] Create `pages/users-list.tsx`: DataTable of users with name, email, role(s), last login, MFA status; invite user dialog; role assignment dropdown
- [ ] T084 [US5] Create `api.ts`: TanStack Query hooks — `useRoles()`, `useRole(id)`, `useCreateRole()`, `useUpdateRole()`, `useUsers()`, `useCustomFieldDefs(module, entity)`, `useAuditLog(filters)`

**Checkpoint**: Admin can create roles with granular permissions, assign to users, verify restricted access. Custom fields appear in API responses. Audit log records all mutations with intact chain hashes.

---

## Phase 5: US1 — Sales Rep Manages Pipeline End-to-End (Priority: P1) 🎯 MVP

**Goal**: Full sales pipeline: leads → contacts/accounts → deals (Kanban) → quotes (CPQ) → won, with events published for downstream modules.

**Independent Test**: Create a lead, convert to deal, move through pipeline stages, generate a quote, mark as won. Verify `deal.won` event published.

### Backend: Sales Module Schema

- [ ] T085 [US1] Create `packages/db/prisma/schema/sales.prisma`: models `Contact` (name, emails[], phones[], accountId, lifecycleStage, tags, ownerId, teamId), `Account` (name, industry, size, website, billingAddress, parentAccountId), `Lead` (source, score, status, assignedOwnerId, convertedContactId, convertedDealId), `Deal` (name, pipelineId, stageId, value, currency, probability, expectedCloseDate, ownerId, contactIds M2M via `DealContact`, accountId, wonAt, lostAt, lostReason), `Pipeline` (name, isDefault), `PipelineStage` (name, order, probability, pipelineId), `Quote` (dealId, lineItems via `QuoteLine`, subtotal, tax, total, status, validUntil, approvalStatus), `QuoteLine` (productId, quantity, unitPrice, discount, tax, lineTotal); all `@@schema("sales")` with tenant_id + standard audit fields
- [ ] T086 [US1] Run `prisma migrate dev --name add_sales_schema` to generate migration

### Backend: Sales Module Logic (`apps/api/src/modules/sales/`)

- [ ] T087 [US1] Create `validators.ts`: Zod schemas for `createContact`, `updateContact`, `createAccount`, `updateAccount`, `createLead`, `convertLead`, `createDeal`, `updateDeal`, `moveDealStage`, `createQuote`, `updateQuote`, `submitQuoteForApproval`
- [ ] T088 [US1] Create `types.ts`: module-internal types — `DealWithContacts`, `PipelineWithStages`, `QuoteWithLines`, `LeadConversionResult`
- [ ] T089 [US1] Create `repository.ts`: Prisma queries — `findContacts(filters, pagination, ownershipScope)`, `findContact(id)`, `createContact(data)`, `updateContact(id, data, version)` (optimistic lock), `findAccounts(...)`, `findLeads(...)`, `createLead(data)`, `findDeals(filters, pagination, ownershipScope)`, `findDeal(id)` (includes contacts, account, pipeline stage), `createDeal(data)`, `updateDeal(id, data, version)`, `findQuotes(dealId)`, `createQuote(data)`, `updateQuoteStatus(id, status)`
- [ ] T090 [US1] Create `service.ts`: business logic — `captureLead(data)` (auto-assign via round-robin, calculate initial score), `convertLead(leadId)` → atomically create Contact + Account (if new) + Deal, mark lead converted; `moveDealStage(dealId, stageId)` → update stage + probability + weighted value; `createQuote(dealId, lines[])` → calculate totals with tax; `submitForApproval(quoteId)` → check if discount > threshold → enter approval flow; `markDealWon(dealId)` → set wonAt, publish `deal.won` event via outbox; `markDealLost(dealId, reason)` → publish `deal.lost`; `detectRotting(thresholdDays)` → find deals with no activity > threshold
- [ ] T091 [US1] Create `controller.ts`: request/response handling — parse validated input, call service, format response envelope, handle `ConflictError` (409 on stale version)
- [ ] T092 [US1] Create `routes.ts`: Express router mounted at `/api/v1/sales/` — Contacts CRUD (`/contacts`, `/contacts/:id`), Accounts CRUD (`/accounts`, `/accounts/:id`), Leads CRUD + convert (`/leads`, `/leads/:id`, `/leads/:id/convert`), Deals CRUD + stage move (`/deals`, `/deals/:id`, `/deals/:id/stage`), Quotes CRUD + approve (`/deals/:id/quotes`, `/quotes/:id`, `/quotes/:id/approve`); all routes wrapped with `requirePermission` and `validate`
- [ ] T093 [US1] Create `events.ts`: publish functions — `publishLeadCreated(lead)`, `publishLeadConverted(lead, deal)`, `publishDealStageChanged(deal, fromStage, toStage)`, `publishDealWon(deal)`, `publishDealLost(deal)` — all write to outbox table in same transaction
- [ ] T094 [US1] Create `listeners.ts`: placeholder for events from other modules (e.g., `payment.received` → update deal payment status)
- [ ] T095 [US1] Write tests: `__tests__/service.test.ts` (lead scoring calculation, lead conversion atomicity, deal stage transition validates pipeline order, quote total calculation with discount+tax, won deal publishes event, rotting detection), `__tests__/repository.test.ts` (CRUD integration with testcontainers, ownership scope filtering, optimistic lock conflict), `__tests__/routes.test.ts` (Supertest: auth required, RBAC enforced, validation errors return 400, successful CRUD returns correct status codes)

### Frontend: Sales Module (`apps/web/src/modules/sales/`)

- [ ] T096 [P] [US1] Create `api.ts`: TanStack Query hooks — `useContacts(filters)`, `useContact(id)`, `useCreateContact()`, `useUpdateContact()`, `useAccounts(filters)`, `useLeads(filters)`, `useConvertLead()`, `useDeals(pipelineId)`, `useDeal(id)`, `useMoveDealStage()`, `useQuotes(dealId)`, `useCreateQuote()`, `useSubmitQuoteApproval()`
- [ ] T097 [US1] Create `pages/contacts-list.tsx`: DataTable (from `@softcrm/ui`) with columns: name, email, company, phone, lifecycle stage, owner; filters: search, lifecycle stage, owner, date range; bulk actions: assign owner, add tag, export CSV
- [ ] T098 [P] [US1] Create `pages/contact-detail.tsx`: header (name, avatar, company, actions dropdown) + tabs: Details (editable fields + custom fields via FormBuilder), Timeline (activities from comms module — placeholder initially), Deals (linked deals), Invoices (placeholder), Tickets (placeholder)
- [ ] T099 [P] [US1] Create `pages/accounts-list.tsx` and `pages/account-detail.tsx`: same DataTable/detail pattern as contacts, with hierarchy (parent account)
- [ ] T100 [US1] Create `pages/leads-list.tsx`: DataTable with lead score column, source filter, status filter; "Convert" action button per row
- [ ] T101 [US1] Create `pages/pipeline.tsx`: KanbanBoard (from `@softcrm/ui`) showing deals as cards in stage columns; card shows deal name, value, contact, days-in-stage; drag-and-drop calls `useMoveDealStage()`; real-time updates via `useRealtime('deal.stage_changed', invalidateDeals)` — column headers show count + total value
- [ ] T102 [US1] Create `pages/deal-detail.tsx`: header (deal name, value, stage badge, probability) + tabs: Details (editable fields), Contacts (linked contacts list, add/remove), Quotes (list quotes, "Create Quote" button), Timeline (activities placeholder), Files (attachments placeholder)
- [ ] T103 [US1] Create `pages/quote-builder.tsx`: line item table (product search from inventory — stub until inventory module exists, manual entry fallback) + quantity + unit price + discount % + tax → line total; subtotal/tax/total summary; "Submit for Approval" button (if discount > threshold); "Generate PDF" button; "Send to Customer" button
- [ ] T104 [US1] Create `routes.tsx`: lazy route definitions — `/sales` (redirect to pipeline), `/sales/pipeline`, `/sales/contacts`, `/sales/contacts/:id`, `/sales/accounts`, `/sales/accounts/:id`, `/sales/leads`, `/sales/deals/:id`, `/sales/deals/:id/quotes/new`
- [ ] T105 [US1] Create `hooks/use-pipeline.ts`: custom hook combining `useDeals` + `useRealtime` for live pipeline data; `hooks/use-lead-score.ts`: displays score with color coding (cold/warm/hot)

**Checkpoint**: Sales rep can create leads, convert to deals, drag through pipeline stages, create quotes, and mark deals as won. `deal.won` event is published. All RBAC enforced. Real-time updates on pipeline board.

---

## Phase 6: US2 — Accountant Manages Invoicing & Financial Reporting (Priority: P1) 🎯

**Goal**: Double-entry accounting with auto-invoicing from won deals, payments, expenses, and financial reports (P&L, Balance Sheet, Trial Balance).

**Independent Test**: Mark a deal as won → invoice auto-created. Record payment → AR decremented. Run P&L → revenue shows correctly. Trial balance: debits = credits.

### Backend: Accounting Schema

- [ ] T106 [US2] Create `packages/db/prisma/schema/accounting.prisma`: models `ChartOfAccount` (code, name, type: Asset/Liability/Equity/Revenue/Expense, parentId, isSystem), `Invoice` (number autoincrement, contactId UUID ref, accountId UUID ref, dealId UUID ref, lineItems via `InvoiceLine`, subtotal, tax, total, currency, status, paymentTerms, dueDate, sentAt, paidAt), `InvoiceLine` (description, quantity, unitPrice, discount, taxRate, lineTotal, accountId → CoA), `Payment` (invoiceId, amount, method, reference, date, journalEntryId), `JournalEntry` (date, description, reference JSON, period, lines via `JournalLine`, isReversing, reversedEntryId), `JournalLine` (journalEntryId, accountId → CoA, debit Decimal, credit Decimal), `Expense` (vendorName, amount, currency, category, date, receiptUrl, projectId UUID ref, approvalStatus, approvedBy, approvedAt, journalEntryId), `FiscalPeriod` (year, month, status: Open/Closed, closedAt, closedBy), `RecurringInvoice` (invoiceTemplateId, frequency, nextRunDate, active); all `@@schema("accounting")`
- [ ] T107 [US2] Run `prisma migrate dev --name add_accounting_schema`

### Backend: Accounting Logic (`apps/api/src/modules/accounting/`)

- [ ] T108 [US2] Create `validators.ts`: Zod schemas for `createInvoice`, `updateDraftInvoice`, `sendInvoice`, `voidInvoice`, `recordPayment`, `createExpense`, `approveExpense`, `createManualJournalEntry`, `closeFiscalPeriod`, `createChartOfAccount`
- [ ] T109 [US2] Create `ledger/journal-entry.service.ts`: `createJournalEntry(date, description, lines[], reference)` → validate sum(debits) === sum(credits) (throw `ValidationError` if not); validate all accounts exist in CoA; validate period is open; write immutably (no update method); `createReversingEntry(originalEntryId)` → create mirror entry with debits/credits swapped; `getEntriesByPeriod(period, accountId?)`
- [ ] T110 [US2] Create `ledger/chart-of-accounts.service.ts`: `getAccounts(type?)`, `createAccount(data)`, `updateAccount(id, data)` (name only, not type/code), `getAccountBalance(accountId, dateRange)` → sum debits - credits (or credits - debits for liability/equity/revenue)
- [ ] T111 [US2] Create `ledger/trial-balance.service.ts`: `generateTrialBalance(period)` → for each account, sum debits and credits for the period → return rows; validate total debits === total credits
- [ ] T112 [US2] Create `invoicing/invoice.service.ts`: `createInvoiceFromDeal(deal, quote)` → populate line items from quote, set payment terms, status=Draft; `sendInvoice(invoiceId)` → finalize (immutable), generate PDF, send email, create journal entries (debit AR, credit Revenue per line), publish `invoice.sent`; `voidInvoice(invoiceId)` → create credit note JE (reverse original), update status=Void; `getOverdueInvoices()` → invoices past dueDate with status Sent/Partial; `generateInvoicePdf(invoiceId)` → branded HTML template → Puppeteer PDF
- [ ] T113 [US2] Create `invoicing/payment.service.ts`: `recordPayment(invoiceId, { amount, method, date })` → validate amount ≤ remaining balance; create Payment record; create JE (debit Cash, credit AR); update invoice status (Partial if remaining > 0, Paid if 0); publish `payment.received`
- [ ] T114 [US2] Create `invoicing/recurring.service.ts`: `processRecurringInvoices()` → find active recurring invoices where nextRunDate ≤ today → create new invoices from template → update nextRunDate; runs as scheduled BullMQ job (daily)
- [ ] T115 [US2] Create `expenses/expense.service.ts`: `createExpense(data)` → validate category exists in CoA → set status Pending Approval; `approveExpense(expenseId, approverId)` → update status → create JE (debit Expense category, credit AP or Cash) → publish `expense.approved`; `rejectExpense(expenseId, reason)` → update status
- [ ] T116 [US2] Create `service.ts` (module orchestrator): `generateProfitAndLoss(dateRange)` → Revenue accounts - COGS - Operating Expenses; `generateBalanceSheet(asOfDate)` → Assets = Liabilities + Equity; `generateCashFlowStatement(dateRange)`; `generateARAgingReport()` → Current / 30 / 60 / 90+ buckets; `generateAPAgingReport()`
- [ ] T117 [US2] Create `repository.ts`: Prisma queries for all accounting entities; note: JournalEntry has NO `update` or `delete` methods (append-only); Invoice has `update` only while status=Draft
- [ ] T118 [US2] Create `routes.ts`: `GET/POST /api/v1/accounting/chart-of-accounts`, `GET/POST /api/v1/accounting/invoices`, `PATCH /api/v1/accounting/invoices/:id` (draft only), `POST /api/v1/accounting/invoices/:id/send`, `POST /api/v1/accounting/invoices/:id/void`, `POST /api/v1/accounting/invoices/:id/payments`, `GET /api/v1/accounting/journal-entries`, `POST /api/v1/accounting/journal-entries` (manual), `GET/POST /api/v1/accounting/expenses`, `POST /api/v1/accounting/expenses/:id/approve`, `GET /api/v1/accounting/reports/profit-loss`, `GET /api/v1/accounting/reports/balance-sheet`, `GET /api/v1/accounting/reports/trial-balance`, `GET /api/v1/accounting/reports/ar-aging`, `POST /api/v1/accounting/fiscal-periods/:period/close`
- [ ] T119 [US2] Create `events.ts`: `publishInvoiceCreated`, `publishInvoiceSent`, `publishPaymentReceived`, `publishExpenseApproved`, `publishPeriodClosed`
- [ ] T120 [US2] Create `listeners.ts`: subscribe to `deal.won` → call `invoice.service.createInvoiceFromDeal()`; subscribe to `time.logged` (future, from Projects) → aggregate billable hours for invoicing
- [ ] T121 [US2] Write tests: `__tests__/journal-entry.service.test.ts` (balanced entries pass, unbalanced reject, reversing creates mirror, closed period rejects), `__tests__/invoice.service.test.ts` (draft → send creates JE, void creates reversing JE, send is immutable, PDF generation), `__tests__/payment.service.test.ts` (partial payment, full payment, overpayment rejected), `__tests__/expense.service.test.ts` (approval creates JE, rejection does not), `__tests__/trial-balance.service.test.ts` (debits always equal credits across all scenarios), `__tests__/listeners.test.ts` (deal.won → invoice auto-created correctly)

### Cross-Module Integration Test

- [ ] T122 [US2] Create `apps/api/__tests__/integration/deal-to-invoice.test.ts`: end-to-end test — create a deal + quote in Sales → mark deal won → verify Accounting auto-creates invoice with matching line items → send invoice → record payment → verify P&L shows revenue → verify Trial Balance balanced

### Frontend: Accounting Module (`apps/web/src/modules/accounting/`)

- [ ] T123 [P] [US2] Create `api.ts`: TanStack Query hooks — `useInvoices(filters)`, `useInvoice(id)`, `useSendInvoice()`, `useVoidInvoice()`, `useRecordPayment()`, `useChartOfAccounts()`, `useJournalEntries(filters)`, `useExpenses(filters)`, `useApproveExpense()`, `useProfitAndLoss(dateRange)`, `useBalanceSheet(asOfDate)`, `useTrialBalance(period)`, `useARAgingReport()`
- [ ] T124 [US2] Create `pages/invoice-list.tsx`: DataTable — columns: number, customer, amount, status (color-coded badge), due date, actions (view/send/void); filters: status, date range, customer search
- [ ] T125 [US2] Create `pages/invoice-detail.tsx`: invoice header (number, status, customer, dates) + line items table + totals + payment history list + actions (Send, Void, Record Payment dialog, Download PDF)
- [ ] T126 [P] [US2] Create `pages/chart-of-accounts.tsx`: hierarchical tree view of accounts grouped by type; inline add/edit; account balances shown
- [ ] T127 [P] [US2] Create `pages/journal-entries.tsx`: DataTable of journal entries — date, description, reference, debit total, credit total; expandable rows showing individual lines with account names
- [ ] T128 [US2] Create `pages/expenses.tsx`: DataTable — vendor, amount, category, date, status, receipt thumbnail; "Submit Expense" button → form with receipt upload (S3) + OCR extraction (call API); approve/reject actions for managers
- [ ] T129 [US2] Create `pages/reports/profit-loss.tsx`: date range picker → hierarchical revenue/expense breakdown with drill-down → export PDF/CSV
- [ ] T130 [P] [US2] Create `pages/reports/balance-sheet.tsx`: as-of-date picker → Assets / Liabilities / Equity sections → drill-down
- [ ] T131 [P] [US2] Create `pages/reports/trial-balance.tsx`: period selector → account | debit | credit table → totals row (must balance)
- [ ] T132 [P] [US2] Create `pages/reports/ar-aging.tsx`: customer | current | 30 | 60 | 90+ columns → drill-down to invoices
- [ ] T133 [US2] Create `routes.tsx`: lazy routes — `/accounting` (redirect to invoices), `/accounting/invoices`, `/accounting/invoices/:id`, `/accounting/chart-of-accounts`, `/accounting/journal-entries`, `/accounting/expenses`, `/accounting/reports/profit-loss`, `/accounting/reports/balance-sheet`, `/accounting/reports/trial-balance`, `/accounting/reports/ar-aging`

**Checkpoint**: Deal won → invoice auto-created. Invoice sent → JE created (AR ↑, Revenue ↑). Payment recorded → AR ↓. P&L shows correct revenue. Trial Balance: debits = credits ALWAYS. Expense approval creates JE.

---

## Phase 7: US3 — Support Agent Resolves a Customer Ticket (Priority: P1)

**Goal**: Multi-channel ticketing with SLA enforcement, knowledge base, self-service portal, and CSAT surveys.

**Independent Test**: Create ticket via portal → assigned to agent → agent resolves → CSAT survey sent → rating recorded.

### Backend: Support Schema & Logic

- [ ] T134 [US3] Create `packages/db/prisma/schema/support.prisma`: models `Ticket` (number autoincrement, subject, description, priority, status, slaDeadline, assignedAgentId, contactId UUID ref, accountId UUID ref, channel, resolvedAt, firstResponseAt), `TicketReply` (ticketId, authorId, authorType: agent/customer, body, attachments[]), `SlaPolicy` (name, priority, firstResponseMinutes, resolutionMinutes), `KBArticle` (title, body, categoryId, status: Draft/Published, viewCount, helpfulCount), `KBCategory` (name, parentId, order), `CsatSurvey` (ticketId, rating 1-5, comment, submittedAt); all `@@schema("support")`
- [ ] T135 [US3] Run `prisma migrate dev --name add_support_schema`
- [ ] T136 [US3] Create `apps/api/src/modules/support/service.ts`: `createTicket(data)` → auto-assign agent (round-robin or skill-based based on config), set SLA deadline from SlaPolicy, publish `ticket.created`; `addReply(ticketId, authorId, body)` → create reply, if first agent reply set `firstResponseAt`; `resolveTicket(ticketId)` → update status, schedule CSAT survey (BullMQ delayed job 24h), publish `ticket.resolved`; `escalateTicket(ticketId)` → reassign to team lead, publish `ticket.escalated`; `checkSlaBreaches()` → find tickets past SLA deadline, escalate, runs as BullMQ cron
- [ ] T137 [US3] Create `apps/api/src/modules/support/kb.service.ts`: `createArticle(data)`, `updateArticle(id, data)`, `publishArticle(id)`, `searchArticles(query)` → Meilisearch integration, `suggestArticles(ticketDescription)` → search by ticket content
- [ ] T138 [US3] Create support module files: `repository.ts`, `routes.ts`, `controller.ts`, `validators.ts`, `events.ts`, `listeners.ts`, `types.ts` following the standard module pattern
- [ ] T139 [US3] Write tests: `__tests__/service.test.ts` (SLA timer calculation, auto-assignment round-robin, escalation on breach, CSAT scheduling), `__tests__/kb.service.test.ts` (article search relevance, suggestion matching), `__tests__/routes.test.ts` (CRUD endpoints, portal access for customers with limited scope)

### Frontend: Support Module (`apps/web/src/modules/support/`)

- [ ] T140 [P] [US3] Create `api.ts`: TanStack Query hooks for tickets, KB articles, CSAT surveys
- [ ] T141 [US3] Create `pages/ticket-list.tsx`: DataTable — number, subject, priority (color badge), status, SLA countdown timer (red if breaching), assigned agent, customer; filters: status, priority, agent, date range
- [ ] T142 [US3] Create `pages/ticket-detail.tsx`: header (subject, status, priority, SLA timer) + customer context panel (contact info, deal history, past tickets, outstanding invoices — cross-module API calls) + reply thread + KB article suggestion sidebar + actions (Assign, Escalate, Resolve)
- [ ] T143 [P] [US3] Create `pages/knowledge-base.tsx`: category tree navigation + article list + search; article editor (rich text); publish/unpublish toggle
- [ ] T144 [US3] Create `routes.tsx`: `/support/tickets`, `/support/tickets/:id`, `/support/knowledge-base`, `/support/knowledge-base/:id/edit`

### Self-Service Portal

- [ ] T145 [US3] Create `src/layouts/portal-shell.tsx` in `apps/web/`: simplified layout for customers — logo, navigation (My Tickets, Knowledge Base, Invoices), profile dropdown
- [ ] T146 [US3] Create portal pages in `apps/web/src/modules/support/pages/portal/`: `portal-ticket-list.tsx` (customer's tickets only), `portal-ticket-detail.tsx` (view + reply, no internal notes), `portal-new-ticket.tsx` (submit form), `portal-kb.tsx` (search + read articles)
- [ ] T147 [US3] Create `portal-invoices.tsx` in portal pages: customer views their invoices from Accounting module (read-only, with payment link)

**Checkpoint**: Ticket created → auto-assigned → SLA timer starts. Agent sees customer context from sales/accounting. KB article search works. CSAT survey fires 24h after resolution. Portal allows customer to submit and view tickets.

---

## Phase 8: US6 — Inventory Manager Fulfills a Sales Order (Priority: P2)

**Goal**: Product catalog, stock tracking, sales orders from deals, purchase orders, and fulfillment with accounting integration.

**Independent Test**: Create product with stock → deal won → sales order auto-created → fulfill order → stock decremented → COGS JE created in Accounting.

### Backend: Inventory Schema & Logic

- [ ] T148 [US6] Create `packages/db/prisma/schema/inventory.prisma`: models `Product` (sku, name, description, unitPrice, cost, taxClass, categoryId, isActive), `PriceBook` (name, currency, isDefault, effectiveFrom, effectiveTo), `PriceBookEntry` (priceBookId, productId, price), `StockLevel` (productId, warehouseId, quantity, reservedQty), `Warehouse` (name, address), `SalesOrder` (dealId UUID ref, status, lineItems via `SalesOrderLine`), `SalesOrderLine` (productId, quantity, unitPrice, fulfilled), `PurchaseOrder` (vendorName, status, approvalStatus, lineItems via `POLine`), `POLine` (productId, quantity, unitCost, receivedQty); all `@@schema("inventory")`
- [ ] T149 [US6] Run `prisma migrate dev --name add_inventory_schema`
- [ ] T150 [US6] Create `apps/api/src/modules/inventory/service.ts`: `createProduct(data)`, `updateProduct(id, data)`, `adjustStock(productId, warehouseId, quantity, reason)`, `reserveStock(productId, warehouseId, quantity)` → decrement available (throw if insufficient), `createSalesOrderFromDeal(deal)` → populate from quote line items, reserve stock, `fulfillOrder(orderId)` → decrement stock, create COGS journal entries in Accounting (via event), publish `order.fulfilled`; `createPurchaseOrder(data)` → enter approval workflow; `receiveGoods(poId, lines[])` → increment stock, create inventory receipt JE (debit Inventory, credit AP) via event, publish `po.received`; `checkLowStock(threshold)` → publish `stock.low` alerts
- [ ] T151 [US6] Create remaining module files: `repository.ts`, `routes.ts`, `controller.ts`, `validators.ts`, `events.ts`, `types.ts`
- [ ] T152 [US6] Create `listeners.ts`: subscribe to `deal.won` → `createSalesOrderFromDeal()`
- [ ] T153 [US6] Write tests: `__tests__/service.test.ts` (stock reservation prevents oversell, fulfillment decrements stock, COGS event published, PO receipt increments stock), `__tests__/routes.test.ts` (CRUD endpoints, stock adjustment validation)

### Cross-Module Integration Test

- [ ] T154 [US6] Create `apps/api/__tests__/integration/order-fulfillment.test.ts`: deal won → sales order created → fulfill → stock decremented → Accounting has COGS JE → Trial Balance still balanced

### Frontend: Inventory Module (`apps/web/src/modules/inventory/`)

- [ ] T155 [P] [US6] Create `api.ts`, `pages/product-list.tsx` (DataTable with SKU, name, price, stock level, status), `pages/product-detail.tsx` (edit form, stock levels per warehouse, price book entries)
- [ ] T156 [P] [US6] Create `pages/sales-orders.tsx` (DataTable: order#, deal, status, items, actions), `pages/purchase-orders.tsx` (DataTable: PO#, vendor, status, approval actions)
- [ ] T157 [US6] Create `routes.tsx`: `/inventory/products`, `/inventory/products/:id`, `/inventory/orders`, `/inventory/purchase-orders`

**Checkpoint**: Product catalog with price books. Deal won → sales order auto-created. Fulfill → stock ↓ + COGS JE. PO receive → stock ↑ + Inventory JE. Trial Balance balanced.

---

## Phase 9: US8 — Communication Hub: Email & Call History (Priority: P2)

**Goal**: 2-way email sync, VoIP calling, email templates, and unified timeline on every contact/account/deal.

**Independent Test**: Send email from Gmail → appears on contact timeline within 60s. Make Twilio call from CRM → call activity logged with duration.

### Backend: Comms Schema & Logic

- [ ] T158 [US8] Create `packages/db/prisma/schema/comms.prisma`: models `Activity` (type: email/call/meeting/note/sms, direction: inbound/outbound, contactId UUID ref, dealId UUID ref, ticketId UUID ref, subject, body, metadata JSON, timestamp), `EmailSync` (userId, provider: gmail/outlook, accessToken encrypted, refreshToken encrypted, lastSyncAt, status), `EmailTemplate` (name, subject, bodyHtml, mergeFields[]), `CallLog` (activityId, provider: twilio, callSid, from, to, duration, recordingUrl, status); all `@@schema("comms")`
- [ ] T159 [US8] Run `prisma migrate dev --name add_comms_schema`
- [ ] T160 [US8] Create `apps/api/src/modules/comms/service.ts`: `syncEmails(userId)` → fetch new emails from Gmail/Outlook API since `lastSyncAt` → match to Contact by email address → create Activity records → update `lastSyncAt` (runs as BullMQ recurring job every 60s per synced user); `logCall(data)` → create Activity + CallLog; `sendEmail(contactId, { subject, body, templateId?, mergeContext? })` → render template with merge fields → send via transactional email API → create outbound Activity → track opens/clicks via webhook; `getTimeline(contactId | dealId | ticketId, pagination)` → return Activities ordered by timestamp
- [ ] T161 [US8] Create `apps/api/src/modules/comms/email-sync.service.ts`: Gmail OAuth flow (auth URL generation, callback token exchange), Outlook OAuth flow; email fetching via Gmail API / Microsoft Graph API; inbound email matching by `from` address to Contact.emails
- [ ] T162 [US8] Create remaining module files: `repository.ts`, `routes.ts` (`/comms/activities`, `/comms/email-sync/connect`, `/comms/email-templates`, `/comms/calls`), `controller.ts`, `validators.ts`, `events.ts` (`email.received`, `call.completed`), `listeners.ts`
- [ ] T163 [US8] Write tests: `__tests__/service.test.ts` (email matching to contact, template merge fields, timeline aggregation), `__tests__/email-sync.service.test.ts` (mock Gmail API — sync creates activities, deduplication)

### Frontend: Comms Module (`apps/web/src/modules/comms/`)

- [ ] T164 [P] [US8] Create `api.ts`, `pages/timeline.tsx` (unified timeline component used in contact/deal/ticket detail — shows email/call/note/meeting entries with icon + timestamp + preview)
- [ ] T165 [P] [US8] Create `pages/email-templates.tsx` (DataTable of templates, template editor with merge field picker), `pages/email-sync-settings.tsx` (connect Gmail/Outlook OAuth buttons, sync status per user)
- [ ] T166 [US8] Integrate timeline component into Sales contact-detail.tsx (T098) and deal-detail.tsx (T102): add Timeline tab that renders `<Timeline contactId={id} />`

**Checkpoint**: Gmail connected → emails synced → appear on contact timeline. Twilio call logged with duration. Email template sent with merge fields. Timeline aggregates all communication types.

---

## Phase 10: US4 — Marketing Campaign with Attribution (Priority: P2)

**Goal**: Customer segmentation, email campaigns with A/B testing, engagement tracking, and multi-touch revenue attribution.

**Independent Test**: Create segment → send campaign → track opens/clicks → lead captured from campaign → deal won → attribution report shows campaign credit.

### Backend: Marketing Schema & Logic

- [ ] T167 [US4] Create `packages/db/prisma/schema/marketing.prisma`: models `Segment` (name, criteria JSON, isDynamic, memberCount), `Campaign` (name, type, segmentId, subjectA, subjectB, bodyHtml, scheduledAt, sentAt, status), `CampaignRecipient` (campaignId, contactId UUID ref, variant: A/B, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, unsubscribedAt), `MarketingTouch` (contactId UUID ref, campaignId, dealId UUID ref, touchType: first/mid/last, timestamp), `Unsubscribe` (contactId UUID ref, source, timestamp); all `@@schema("marketing")`
- [ ] T168 [US4] Run `prisma migrate dev --name add_marketing_schema`
- [ ] T169 [US4] Create `apps/api/src/modules/marketing/service.ts`: `createSegment(criteria)` → build dynamic query across contacts/accounts/deals → cache member count; `buildCampaign(data)` → validate segment, create campaign draft; `scheduleCampaign(campaignId, sendAt)` → queue BullMQ delayed job; `sendCampaign(campaignId)` → split recipients into A/B variants → send emails via bulk email infrastructure → create CampaignRecipient records → publish `campaign.sent`; `processWebhook(event)` → handle delivery/open/click/bounce/unsubscribe events → update CampaignRecipient; `recordTouch(contactId, campaignId)` → create MarketingTouch for attribution; `generateAttributionReport(dateRange, model: 'first'|'last'|'linear')` → for each won deal, calculate revenue credit per campaign based on touches
- [ ] T170 [US4] Create remaining module files and routes: `/marketing/segments`, `/marketing/campaigns`, `/marketing/campaigns/:id/schedule`, `/marketing/campaigns/:id/send`, `/marketing/campaigns/:id/metrics`, `/marketing/attribution`
- [ ] T171 [US4] Create `listeners.ts`: subscribe to `deal.won` → finalize attribution touches; subscribe to `email.received` → check if a campaign reply
- [ ] T172 [US4] Write tests: `__tests__/service.test.ts` (segment query building, A/B variant split, attribution calculation for first/last/linear, unsubscribe enforcement), `__tests__/routes.test.ts`

### Frontend: Marketing Module (`apps/web/src/modules/marketing/`)

- [ ] T173 [P] [US4] Create `api.ts`, `pages/segments.tsx` (segment builder: dynamic filter UI → criteria JSON), `pages/campaign-list.tsx` (DataTable: name, status, sent, opens, clicks)
- [ ] T174 [US4] Create `pages/campaign-builder.tsx`: template editor (rich text + merge fields), subject A/B variants, segment selector, schedule picker, preview + test send
- [ ] T175 [US4] Create `pages/campaign-detail.tsx`: real-time metrics dashboard — delivered %, open rate, click rate, bounce rate, unsubscribes; per-link click heatmap; recipient list with individual engagement
- [ ] T176 [P] [US4] Create `pages/attribution.tsx`: date range picker → table: campaign | first-touch revenue | last-touch revenue | linear revenue | deal count; drill-down to individual deals
- [ ] T177 [US4] Create `routes.tsx`: `/marketing/segments`, `/marketing/campaigns`, `/marketing/campaigns/new`, `/marketing/campaigns/:id`, `/marketing/attribution`

**Checkpoint**: Segment built → campaign sent with A/B → engagement tracked → lead captured from campaign → deal won → attribution report shows per-campaign revenue credit.

---

## Phase 11: US9 — Executive AI-Powered Analytics Dashboard (Priority: P2)

**Goal**: Real-time dashboards with configurable widgets, custom report builder, AI revenue forecasting, and anomaly detection.

**Independent Test**: Seed deal data → dashboard shows correct pipeline metrics updating in real-time. Run forecast → predicted revenue displayed with confidence intervals.

### Backend: Analytics Schema & Logic

- [ ] T178 [US9] Create `packages/db/prisma/schema/analytics.prisma`: models `Dashboard` (name, ownerId, isDefault, layout JSON), `Widget` (dashboardId, type: chart/kpi/table/funnel, config JSON, position JSON), `SavedReport` (name, ownerId, fieldSelection JSON, groupBy, aggregation, filters JSON, scheduleFrequency, scheduleRecipients[]), `Forecast` (type: revenue/pipeline, period, predictedValue, confidenceLow, confidenceHigh, modelVersion, createdAt); all `@@schema("analytics")`
- [ ] T179 [US9] Run `prisma migrate dev --name add_analytics_schema`
- [ ] T180 [US9] Create `apps/api/src/modules/analytics/service.ts`: `getDashboardMetrics(dashboardId)` → resolve each widget's data by querying across modules (Sales deals, Accounting invoices, Support tickets — via their services' public APIs); `calculatePipelineMetrics(tenantId)` → total pipeline value, weighted pipeline, deals by stage, win rate, revenue MTD/QTD/YTD, avg deal size, velocity; `buildCustomReport(config)` → dynamic query builder based on fieldSelection + groupBy + aggregation + filters → return tabular data; `generateForecast(type, historicalMonths)` → simple linear regression on historical deal close data → predict next 3 months with confidence intervals; `detectAnomalies(metric, window)` → compare current value to rolling average → flag if deviation > 2 standard deviations; `getRepScorecard(userId)` → deals closed, revenue, activities, response time, pipeline coverage
- [ ] T181 [US9] Create remaining module files and routes: `/analytics/dashboards`, `/analytics/dashboards/:id`, `/analytics/dashboards/:id/metrics`, `/analytics/reports`, `/analytics/reports/:id/run`, `/analytics/forecast`, `/analytics/anomalies`, `/analytics/scorecards/:userId`
- [ ] T182 [US9] Create `listeners.ts`: subscribe to all domain events → update pre-computed metrics in Redis for real-time dashboard; publish WebSocket `dashboard.metrics_updated` event
- [ ] T183 [US9] Write tests: `__tests__/service.test.ts` (pipeline metric calculations match expected, forecast with known data produces expected range, anomaly detection triggers on planted anomaly, report builder generates correct SQL/aggregation)

### Frontend: Analytics Module (`apps/web/src/modules/analytics/`)

- [ ] T184 [P] [US9] Create `api.ts`, `pages/dashboard.tsx`: configurable dashboard with widget grid (react-grid-layout); each widget renders chart (Recharts), KPI card, or data table; real-time updates via `useRealtime('dashboard.metrics_updated')`
- [ ] T185 [US9] Create `pages/report-builder.tsx`: drag-and-drop field selector (from available entities), groupBy picker, aggregation selector (sum/avg/count/min/max), filter builder, preview table, save + schedule + export (CSV/PDF)
- [ ] T186 [P] [US9] Create `pages/forecast.tsx`: revenue forecast chart (line chart with confidence interval shaded area) overlaid on actual vs target
- [ ] T187 [P] [US9] Create `pages/team-performance.tsx`: rep scorecards — deals, revenue, activities, response time, pipeline coverage; comparison to targets
- [ ] T188 [US9] Create `routes.tsx`: `/analytics`, `/analytics/reports`, `/analytics/reports/new`, `/analytics/forecast`, `/analytics/team`

**Checkpoint**: Dashboard shows correct pipeline metrics, updating in real-time. Report builder produces correct aggregations. Forecast chart displayed. Anomaly alert triggered on planted anomaly.

---

## Phase 12: US7 — Project Manager Runs Post-Sale Delivery (Priority: P2)

**Goal**: Post-sale project boards from deal templates, task management, time tracking, milestones, and client portal.

**Independent Test**: Deal won with workflow → project auto-created from template → tasks on Kanban → time logged → milestone completed → client sees progress.

### Backend: Projects Schema & Logic

- [ ] T189 [US7] Create `packages/db/prisma/schema/projects.prisma`: models `ProjectTemplate` (name, tasks JSON, milestones JSON, defaultAssignees JSON), `Project` (name, dealId UUID ref, accountId UUID ref, templateId, status, startDate, endDate), `Task` (projectId, title, description, assigneeId UUID ref, priority, status, dueDate, order), `Milestone` (projectId, name, dueDate, completedAt), `MilestoneTask` (milestoneId, taskId), `TimeEntry` (taskId, userId UUID ref, hours Decimal, isBillable, description, date); all `@@schema("projects")`
- [ ] T190 [US7] Run `prisma migrate dev --name add_projects_schema`
- [ ] T191 [US7] Create `apps/api/src/modules/projects/service.ts`: `createProjectFromTemplate(templateId, dealId, accountId)` → expand template tasks + milestones + assignees → publish `project.created`; `moveTask(taskId, status)` → update; check if all milestone tasks done → auto-complete milestone → publish `milestone.completed`; `logTime(taskId, userId, hours, isBillable)` → create TimeEntry → publish `time.logged`; `getProjectProgress(projectId)` → % tasks done, milestone status, timeline
- [ ] T192 [US7] Create remaining module files, routes: `/projects`, `/projects/:id`, `/projects/:id/tasks`, `/projects/:id/tasks/:taskId`, `/projects/:id/milestones`, `/projects/:id/time-entries`; `listeners.ts`: subscribe to workflow-triggered project creation (from `deal.won` via Platform workflow engine)
- [ ] T193 [US7] Write tests: `__tests__/service.test.ts` (template expansion, milestone auto-completion, time logging, progress calculation)

### Frontend: Projects Module (`apps/web/src/modules/projects/`)

- [ ] T194 [P] [US7] Create `api.ts`, `pages/project-list.tsx` (DataTable: name, deal, account, status, progress bar, date range)
- [ ] T195 [US7] Create `pages/project-detail.tsx`: tabs — Kanban board (tasks in columns: To Do/In Progress/Review/Done with drag-and-drop), Gantt chart (milestones + dates), Time Log (DataTable of entries with "Log Time" button), Files (attachment list)
- [ ] T196 [P] [US7] Create portal pages: `portal-project.tsx` (project progress, milestones, shared files, comment thread — no internal notes or cost data); integrate into portal shell (T145)
- [ ] T197 [US7] Create `routes.tsx`: `/projects`, `/projects/:id`

**Checkpoint**: Project auto-created from deal + template. Tasks on Kanban with drag-and-drop. Time logged. Milestone auto-completes. Client portal shows progress without internal data.

---

## Phase 13: US5 (continued) — Workflow Builder (Priority: P2)

**Goal**: No-code visual workflow builder with triggers, conditions, and cross-module actions.

**Independent Test**: Create rule "Deal won + value > $50K → create Project from template + send notification" → verify on qualifying deal.

- [ ] T198 [US5] Create `apps/api/src/modules/platform/workflows/workflow.service.ts`: `createWorkflow({ trigger, conditions[], actions[] })` where triggers are domain events or cron schedules; conditions: field comparisons (equals, >, <, contains); actions: field update, record create (cross-module), email send, webhook call; `evaluateWorkflow(workflowId, eventContext)` → check conditions → execute actions sequentially; loop detection (max 5 chained triggers)
- [ ] T199 [US5] Create `workflows/workflow.engine.ts`: condition evaluator (parse condition JSON → evaluate against event payload) + action executor (dispatch to target module service or infra layer); error handling per action (log failure, continue or abort based on config)
- [ ] T200 [US5] Create `workflows/workflow.repository.ts`, routes: `GET/POST /api/v1/platform/workflows`, `PATCH /api/v1/platform/workflows/:id`, `POST /api/v1/platform/workflows/:id/activate`, `POST /api/v1/platform/workflows/:id/deactivate`, `GET /api/v1/platform/workflows/:id/executions` (execution log)
- [ ] T201 [US5] Create `listeners.ts` addition: subscribe to ALL domain events → check against active workflows → evaluate matching workflows
- [ ] T202 [US5] Write tests: `__tests__/workflow.service.test.ts` (condition evaluation, action execution, loop detection stops at 5, cross-module action creates record)

### Frontend: Workflow Builder (`apps/web/src/modules/platform/`)

- [ ] T203 [US5] Create `pages/workflows.tsx`: list of workflows with name, trigger, status (active/inactive), last execution; "Create Workflow" button
- [ ] T204 [US5] Create `pages/workflow-builder.tsx`: visual builder — trigger selector (event picker or cron input) → condition cards (field + operator + value, AND/OR grouping) → action cards (action type picker, config form per type); save/activate/deactivate; execution log viewer

**Checkpoint**: Workflow "Deal won + value > $50K → create Project" fires correctly. Loop detection prevents infinite chains. Execution log shows success/failure per action.

---

## Phase 14: US10 — Field Sales Rep Works Offline on Mobile (Priority: P3)

**Goal**: React Native mobile app with offline CRUD, GPS check-in, receipt OCR, and sync-on-reconnect.

**Independent Test**: Enable airplane mode → update a deal → add a contact → create expense with receipt photo → go online → all changes sync with no data loss.

### Mobile App (`apps/mobile/`)

- [ ] T205 [US10] Initialize `apps/mobile/` with Expo (React Native) + TypeScript; `app.json`, `package.json` (deps: `expo`, `react-navigation`, `watermelondb`, `zustand`, `socket.io-client`, `expo-camera`, `expo-location`)
- [ ] T206 [US10] Create navigation in `src/navigation/`: TabNavigator (Contacts, Deals, Tasks, More) + StackNavigators per tab; auth flow (login screen → main tabs)
- [ ] T207 [US10] Create `src/lib/offline-db.ts`: WatermelonDB schema defining local tables — `contacts`, `accounts`, `deals`, `tasks`, `activities`, `expenses` — mirroring API entities with `_status` (synced/created/updated/deleted) and `_changed` fields
- [ ] T208 [US10] Create `src/lib/sync-engine.ts`: pull-push sync protocol — `pull(lastPulledAt)` → `GET /api/v1/sync/pull?since=<timestamp>` → receives changes per table → apply to WatermelonDB; `push()` → collect dirty records → `POST /api/v1/sync/push` → server applies + returns conflicts → store conflicts for resolution UI; run on connectivity change + every 5 min; `src/hooks/use-offline-sync.ts` hook
- [ ] T209 [US10] Create sync API endpoints in `apps/api/`: `GET /api/v1/sync/pull?since=<timestamp>` → return records modified after timestamp (filtered by user's RBAC assignment); `POST /api/v1/sync/push` → apply changes, detect conflicts (version mismatch), return conflict list
- [ ] T210 [US10] Create mobile screens: `src/screens/contact-list.tsx` (FlatList from WatermelonDB query), `src/screens/contact-detail.tsx`, `src/screens/deal-list.tsx` (pipeline view), `src/screens/deal-detail.tsx`, `src/screens/task-list.tsx`
- [ ] T211 [US10] Create `src/hooks/use-gps-checkin.ts`: `checkIn(accountId?)` → read GPS via `expo-location` → store check-in record locally with coordinates + timestamp + nearest account (match by address proximity) → sync later
- [ ] T212 [US10] Create `src/lib/ocr.ts`: capture receipt photo via `expo-camera` → local ML (TensorFlow Lite or Google ML Kit) → extract amount + vendor → pre-fill expense form; `src/screens/expense-capture.tsx`: camera → OCR → confirm → save offline
- [ ] T213 [US10] Create conflict resolution UI: `src/screens/sync-conflicts.tsx` — shows conflicting records side-by-side (local vs server version) → user picks which to keep or merges manually
- [ ] T214 [US10] Write tests: `src/__tests__/sync-engine.test.ts` (pull applies changes, push sends dirty records, conflict detection, deduplication), `src/__tests__/offline-db.test.ts` (CRUD operations in offline mode), `src/__tests__/gps-checkin.test.ts` (coordinates captured, account proximity matching)

**Checkpoint**: App works fully offline (CRUD on contacts, deals, tasks). GPS check-in captured. Receipt OCR extracts data. Sync on reconnect with zero data loss. Conflicts shown for manual resolution.

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, performance, security, i18n, documentation.

- [ ] T215 [P] Create `tools/scripts/generate-openapi.ts`: script that extracts Zod schemas from all modules → generates OpenAPI 3.1 YAML per module in `specs/crm-platform/contracts/`
- [ ] T216 [P] Configure i18n: install `react-i18next` in `apps/web/`, extract all strings to JSON translation files, create `src/lib/i18n.ts` config with language detection; verify RTL layout with Arabic locale
- [ ] T217 [P] Create `tests/security/rbac-boundary.test.ts`: exhaustive test that iterates ALL module/entity/action combinations × ALL default roles → verify expected allow/deny — auto-generated from role definitions
- [ ] T218 [P] Create `tests/security/injection.test.ts`: SQL injection, XSS, and NoSQL injection attempts against all input endpoints — verify all rejected by Zod validation + Prisma parameterized queries
- [ ] T219 [P] Create `tests/load/pipeline-flow.js`: k6 load test — 500 virtual users, sales pipeline journey (create lead → convert → move stages → create quote → mark won); verify p95 < 200ms read, < 500ms write
- [ ] T220 [P] Create `tests/load/concurrent-users.js`: k6 test — 500 concurrent users across all modules; verify throughput and error rate < 0.1%
- [ ] T221 [P] Create `tools/k8s/helm/` directory with Helm chart: deployment (API pods with HPA), service, ingress, configmap, secrets; `values.yaml` for dev/staging/prod
- [ ] T222 [P] Create `tools/k8s/terraform/`: AWS resources — RDS (PostgreSQL), ElastiCache (Redis), S3 bucket, ALB, ECS/EKS cluster, VPC with private subnets
- [ ] T223 Create API documentation: auto-generate from OpenAPI specs; create admin guide (role setup, custom fields, workflow creation); deployment runbook (prerequisites, environment setup, migration, rollback)
- [ ] T224 Create Grafana dashboard JSON: API latency (p50/p95/p99), error rates per module, active connections, DB query latency, Redis hit rate, BullMQ queue depth; configure SLO-based alerts (p95 > 200ms for 5 min → PagerDuty)
- [ ] T225 Implement GDPR data erasure: `DELETE /api/v1/platform/users/:id/gdpr-erase` → anonymize PII across all modules (Contact.name → "Deleted User", etc.) while preserving anonymized financial records for legal retention; audit log entry for erasure

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────┐
                                                 │
Phase 2: Foundation (Packages) ──────────────────┤ BLOCKS ALL
                                                 │
Phase 3: Foundation (API + Web Skeletons) ───────┘
                                                 │
                    ┌────────────────────────────┤
                    ▼                            │
Phase 4: US5 (RBAC/Audit/CustomFields) ─────────┤ UNBLOCKS all modules
                    │                            │
          ┌────────┼────────┬────────┐          │
          ▼        ▼        ▼        ▼          │
Phase 5:  Phase 7: Phase 8:  Phase 9:           │
US1 Sales US3 Supp US6 Inv   US8 Comms          │
  │         │        │         │                │
  ▼         │        │         │                │
Phase 6:    │        │         │                │
US2 Acctg ──┤        │         │                │
  │         │        │         │                │
  ├─────────┼────────┘         │                │
  │         │                  │                │
  ▼         ▼                  ▼                │
Phase 10: US4 Marketing                         │
Phase 11: US9 Analytics                         │
Phase 12: US7 Projects                          │
Phase 13: US5 Workflows                         │
                    │                            │
                    ▼                            │
Phase 14: US10 Mobile ──────────────────────────┘
                    │
                    ▼
Phase 15: Polish & Hardening
```

### Key Inter-Phase Dependencies

| Task(s) | Depends On | Reason |
|---------|-----------|--------|
| T063-T084 (RBAC) | T006-T062 (Foundation) | Needs shared-kernel types, DB schemas, middleware pipeline |
| T085-T105 (Sales) | T069 (RBAC middleware) | All routes need permission checks |
| T106-T133 (Accounting) | T090-T093 (Sales service + events) | `deal.won` event triggers invoice creation |
| T148-T157 (Inventory) | T090-T093 (Sales events) | `deal.won` triggers sales order creation |
| T120 (Acctg listeners) | T093 (Sales events) | Accounting listens to `deal.won` |
| T152 (Inv listeners) | T093 (Sales events) | Inventory listens to `deal.won` |
| T150 (Inv fulfillment COGS) | T109 (JE service) | Inventory creates journal entries |
| T166 (Timeline integration) | T098, T102 (Sales frontend) | Embeds timeline into sales pages |
| T171 (Mktg attribution) | T093 (deal.won events) | Attribution finalizes on deal.won |
| T182 (Analytics listeners) | All module events | Listens to events from all modules |
| T198-T204 (Workflows) | T039 (Event bus) + all modules | Workflows trigger cross-module actions |
| T205-T214 (Mobile) | T209 (Sync API) + all module APIs | Mobile syncs data from all modules |

### Parallel Opportunities

**After Phase 4 (RBAC) is complete, these can run in parallel:**
- Phase 5 (Sales) + Phase 7 (Support) + Phase 8 (Inventory) + Phase 9 (Comms) — different module directories, no file overlap
- Within each phase, tasks marked [P] can run in parallel

**After Sales (Phase 5) is complete:**
- Phase 6 (Accounting) can start — depends on Sales events
- Phase 10 (Marketing), Phase 11 (Analytics) can start after Sales

**After Accounting (Phase 6) is complete:**
- Inventory integration tests (T154), Projects time→billing integration

### Within Each Phase

1. Schema first (Prisma model)
2. Migration
3. Backend: validators → repository → service → controller → routes → events → listeners
4. Tests alongside implementation
5. Frontend: api.ts → pages → routes
6. Integration test at checkpoint

---

## Task Count Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1: Setup | T001–T005 (5) | Monorepo scaffolding |
| Phase 2: Foundation Packages | T006–T028 (23) | Shared kernel, DB, UI |
| Phase 3: Foundation Apps | T029–T062 (34) | API server, Web shell |
| Phase 4: US5 RBAC/Audit | T063–T084 (22) | Auth, permissions, custom fields |
| Phase 5: US1 Sales | T085–T105 (21) | Full sales pipeline |
| Phase 6: US2 Accounting | T106–T133 (28) | Double-entry, invoicing, reports |
| Phase 7: US3 Support | T134–T147 (14) | Ticketing, KB, portal |
| Phase 8: US6 Inventory | T148–T157 (10) | Products, orders, fulfillment |
| Phase 9: US8 Comms | T158–T166 (9) | Email sync, VoIP, timeline |
| Phase 10: US4 Marketing | T167–T177 (11) | Campaigns, attribution |
| Phase 11: US9 Analytics | T178–T188 (11) | Dashboards, reports, AI |
| Phase 12: US7 Projects | T189–T197 (9) | Post-sale delivery |
| Phase 13: US5 Workflows | T198–T204 (7) | No-code automation |
| Phase 14: US10 Mobile | T205–T214 (10) | Offline-first RN app |
| Phase 15: Polish | T215–T225 (11) | Security, perf, i18n, docs |
| **Total** | **225 tasks** | |
