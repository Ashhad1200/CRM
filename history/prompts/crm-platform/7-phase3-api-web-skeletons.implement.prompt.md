---
id: 7
title: Phase 3 API & Web Skeletons Implementation
stage: implement
date: 2025-07-23
surface: agent
model: claude-opus-4-20250514
feature: crm-platform
branch: main
user: developer
command: /sp.implement
labels: ["api", "web", "express", "react", "vite", "middleware", "auth", "rbac", "phase-3"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - apps/api/package.json
  - apps/api/tsconfig.json
  - apps/api/tsconfig.build.json
  - apps/api/vitest.config.ts
  - apps/api/src/config/index.ts
  - apps/api/src/server.ts
  - apps/api/src/main.ts
  - apps/api/src/middleware/correlation.ts
  - apps/api/src/middleware/rate-limit.ts
  - apps/api/src/middleware/auth.ts
  - apps/api/src/middleware/tenant.ts
  - apps/api/src/middleware/validate.ts
  - apps/api/src/middleware/error-handler.ts
  - apps/api/src/routes/health.ts
  - apps/api/src/infra/event-bus.ts
  - apps/api/src/infra/outbox.ts
  - apps/api/src/infra/websocket.ts
  - apps/api/src/infra/email.ts
  - apps/api/src/infra/storage.ts
  - apps/api/src/infra/pdf.ts
  - apps/api/src/infra/search.ts
  - apps/api/src/infra/telemetry.ts
  - apps/api/src/__tests__/health.test.ts
  - apps/api/src/__tests__/correlation.test.ts
  - apps/api/src/__tests__/validate.test.ts
  - apps/api/src/__tests__/error-handler.test.ts
  - apps/web/package.json
  - apps/web/tsconfig.json
  - apps/web/tsconfig.build.json
  - apps/web/vite.config.ts
  - apps/web/vitest.config.ts
  - apps/web/index.html
  - apps/web/src/index.css
  - apps/web/src/vite-env.d.ts
  - apps/web/src/test-setup.ts
  - apps/web/src/main.tsx
  - apps/web/src/providers/query-provider.tsx
  - apps/web/src/providers/auth-provider.tsx
  - apps/web/src/providers/tenant-provider.tsx
  - apps/web/src/providers/rbac-provider.tsx
  - apps/web/src/providers/socket-provider.tsx
  - apps/web/src/lib/api-client.ts
  - apps/web/src/hooks/use-permission.ts
  - apps/web/src/hooks/use-realtime.ts
  - apps/web/src/layouts/app-shell.tsx
  - apps/web/src/layouts/auth-layout.tsx
  - apps/web/src/router.tsx
  - apps/web/src/modules/platform/pages/login.tsx
  - apps/web/src/__tests__/auth-provider.test.tsx
  - apps/web/src/__tests__/rbac-provider.test.tsx
tests:
  - apps/api: 20 unit tests (health, correlation, validate, error-handler)
  - apps/web: 11 unit tests (auth-provider 4, rbac-provider 7)
  - total cumulative: 106 tests (45 shared-kernel + 14 db + 16 ui + 20 api + 11 web)
---

## Prompt

PROCEED

## Response snapshot

Implemented Phase 3 (Foundation — API & Web Skeletons, T029-T062) comprising two application packages:

### Phase 3A: API Server (T029-T047)
- **Express 5.1.0** server with helmet, CORS, compression, cookie-parser, pino logging
- **Zod-validated config**: 30+ environment variables with defaults, parsed at startup
- **6 middleware**: Correlation ID (X-Correlation-ID propagation), sliding-window rate limiter (Redis pipeline), JWT auth (RS256/HS256 with refresh), tenant injection (AsyncLocalStorage), Zod request validation, centralized error handler (AppError hierarchy mapping)
- **Health endpoints**: GET /health (liveness), GET /health/ready (deep — Postgres + Redis checks), GET /health/version (git SHA)
- **8 infrastructure modules**: BullMQ event bus (typed publish/subscribe), Outbox pattern (transactional event capture), Socket.IO WebSocket hub (room-based, tenant-scoped), Nodemailer email service (SMTP + Resend transport), MinIO S3-compatible storage (presigned URLs), PDFKit generation, Meilisearch full-text indexing, OpenTelemetry tracing (Jaeger exporter)

### Phase 3B: Web App Shell (T048-T062)
- **React 19 + Vite 6** SPA with Tailwind CSS v4 (new @theme syntax), React Router 7, TanStack Query 5
- **Provider architecture**: QueryProvider → AuthProvider → TenantProvider → RbacProvider → SocketProvider nesting
- **Auth system**: Zustand auth store, raw-fetch auth operations (avoids circular 401 auto-refresh), silent refresh on mount
- **RBAC system**: Permission fetching, `hasPermission(module, entity, action)`, `getFieldPermission()`, `<Can>` guard component
- **Socket.IO client**: Auto-connects post-auth with JWT token, room subscription, `useRealtime<T>()` hook
- **App shell layout**: Collapsible sidebar with RBAC-filtered navigation, top nav bar, responsive design
- **Router**: AuthGuard/GuestGuard wrappers, lazy-loaded routes for all 9 domain modules
- **Login page**: Email/password form with error handling, SSO stub, forgot password link

### Key Fixes Applied
1. Auth provider uses raw `fetch` (not `apiClient`) for login/refresh/logout to prevent circular 401 auto-refresh loops
2. BullMQ connection uses plain options objects `{host, port, password}` instead of Redis instances (ioredis version mismatch)
3. OpenTelemetry uses `new Resource({...})` (not `resourceFromAttributes`)
4. Outbox extracts `tenantId`/`aggregateType` from payload JSON (no dedicated columns in schema)
5. Web tsconfig: no project references (UI package lacks composite:true), uses `tsc --noEmit`
6. Fixed flaky UUID v7 ordering test with 2ms delay

### Validation
- `turbo build --force`: **5/5 tasks passing** (shared-kernel, db, ui, api, web)
- `turbo test --force`: **8/8 tasks, 106 tests passing** (45 + 14 + 16 + 20 + 11)
- Vite production bundle: 126 modules → 6 output files (index.html, CSS, login chunk, query chunk, vendor chunk, main index)

## Outcome

- ✅ Impact: Phase 3 complete — API server and web app shell fully scaffolded, tested, and building. 50+ files created across 2 apps.
- 🧪 Tests: 31 new tests (20 API + 11 web) → 106 total cumulative, all passing
- 📁 Files: 50 files created across 2 application packages
- 🔁 Next prompts: Phase 4 — US5 Admin, RBAC, Custom Fields & Workflows
- 🧠 Reflection: The auth-provider circular 401 issue was the trickiest debugging challenge — apiClient's auto-refresh on 401 created infinite loops when auth endpoints themselves returned 401. Solution: auth operations bypass apiClient entirely, using raw fetch with credentials:include. Also encountered Express 5 vs 4 API differences, BullMQ/ioredis version alignment issues, and Tailwind v4's new config-in-CSS approach.

## Evaluation notes (flywheel)

- Failure modes observed: (1) apiClient circular 401 refresh when used for auth endpoints — fixed by using raw fetch. (2) BullMQ rejects Redis instance with wrong ioredis version — fixed with connection options object. (3) OTEL Resource API changed — fixed constructor. (4) Outbox model lacks tenantId column — extract from JSON payload. (5) UUID v7 ordering test flaky in sub-millisecond — added 2ms delay.
- Graders run and results (PASS/FAIL): turbo build PASS (5/5), turbo test PASS (106/106)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Phase 4 implementation — Admin module with RBAC enforcement, custom field definitions, and workflow engine

