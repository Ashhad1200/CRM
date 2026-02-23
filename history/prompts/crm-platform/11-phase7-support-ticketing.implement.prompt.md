---
id: 11
title: Phase 7 — Support Ticketing Module
stage: implement
date: 2025-07-22
surface: agent
model: Claude Opus 4.6
feature: crm-platform
branch: main
user: developer
command: PROCEED (Phase 7)
labels: ["support", "ticketing", "sla", "knowledge-base", "csat", "self-service-portal"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/db/prisma/schema/support.prisma
  - apps/api/src/modules/support/types.ts
  - apps/api/src/modules/support/validators.ts
  - apps/api/src/modules/support/repository.ts
  - apps/api/src/modules/support/service.ts
  - apps/api/src/modules/support/kb.service.ts
  - apps/api/src/modules/support/events.ts
  - apps/api/src/modules/support/listeners.ts
  - apps/api/src/modules/support/routes.ts
  - apps/api/src/modules/support/__tests__/service.test.ts
  - apps/api/src/modules/support/__tests__/kb.service.test.ts
  - apps/api/src/modules/support/__tests__/routes.test.ts
  - apps/api/src/server.ts
  - apps/web/src/modules/support/api.ts
  - apps/web/src/modules/support/routes.tsx
  - apps/web/src/modules/support/pages/tickets-list.tsx
  - apps/web/src/modules/support/pages/ticket-detail.tsx
  - apps/web/src/modules/support/pages/kb-articles.tsx
  - apps/web/src/modules/support/pages/kb-article-detail.tsx
  - apps/web/src/modules/support/pages/csat-dashboard.tsx
  - apps/web/src/layouts/portal-shell.tsx
  - apps/web/src/modules/support/pages/portal/portal-ticket-list.tsx
  - apps/web/src/modules/support/pages/portal/portal-ticket-detail.tsx
  - apps/web/src/modules/support/pages/portal/portal-new-ticket.tsx
  - apps/web/src/modules/support/pages/portal/portal-kb.tsx
  - apps/web/src/modules/support/pages/portal/portal-invoices.tsx
  - apps/web/src/router.tsx
tests:
  - apps/api/src/modules/support/__tests__/service.test.ts (20 tests)
  - apps/api/src/modules/support/__tests__/kb.service.test.ts (12 tests)
  - apps/api/src/modules/support/__tests__/routes.test.ts (15 tests)
---

## Prompt

PROCEED (Phase 7: US3 — Support Agent Resolves a Customer Ticket, T134-T147)

## Response snapshot

Implemented the complete Support & Ticketing module (Phase 7) covering tasks T134-T147:

**Backend (T134-T139)**:
- Created `support.prisma` schema with 4 enums (TicketStatus, TicketChannel, AuthorType, ArticleStatus) and 6 models (SlaPolicy, Ticket, TicketReply, KBCategory, KBArticle, CsatSurvey)
- Built 8 backend files (types, validators, repository, service, kb.service, events, listeners, routes) totalling ~1,600 lines
- Key features: ticket create with auto-assign (round-robin by fewest open tickets), SLA policy lookup with deadline computation, reply tracking with firstResponseAt, resolve/close/escalate/reopen lifecycle, domain events (ticket.created, ticket.resolved, ticket.sla_breached)
- KB service: article CRUD, slug generation, publish/archive, text search, article suggestions, helpful/view count tracking
- CSAT survey auto-created on ticket resolution, customer submit endpoint, aggregate stats
- Fixed 4 TypeScript errors: `status: 'PUBLISHED' as const` for enum casting, `modulePermissions` instead of `permissions` on Role model
- Created 47 backend tests across 3 files (service.test.ts, kb.service.test.ts, routes.test.ts)

**Frontend (T140-T144)**:
- Created `api.ts` with 18 React Query hooks (tickets, KB articles, categories, CSAT)
- Built 5 pages: tickets-list, ticket-detail, kb-articles, kb-article-detail, csat-dashboard
- Lazy-loaded route definitions in `routes.tsx`
- Wired into main router.tsx replacing placeholder

**Self-Service Portal (T145-T147)**:
- Created `portal-shell.tsx` layout (simplified customer-facing navigation)
- Built 5 portal pages: portal-ticket-list, portal-ticket-detail, portal-new-ticket, portal-kb, portal-invoices
- Portal routes added to router.tsx under `/portal/*`

**Validation**:
- 5/5 builds passing
- 250 total tests (45 shared-kernel + 4 db + 16 ui + 170 api + 15 web), all green
- Zero TypeScript errors across both api and web apps

## Outcome

- ✅ Impact: Full multi-channel ticketing with SLA enforcement, knowledge base, CSAT surveys, and customer self-service portal
- 🧪 Tests: 47 new tests (20 service + 12 kb.service + 15 routes), 250 total across monorepo
- 📁 Files: 27 files created/modified (1 schema, 8 backend, 3 test files, 8 frontend pages, 1 layout, 5 portal pages, 1 router)
- 🔁 Next prompts: Phase 8 (US6 — Inventory Manager Fulfills a Sales Order)
- 🧠 Reflection: Subagent-generated code had 4 TS errors (wrong Role relation name, enum string casting) — predictable pattern from prior phases. Portal required separate route section with different shell layout.

## Evaluation notes (flywheel)

- Failure modes observed: Subagent used `role.permissions` instead of `role.modulePermissions` (unfamiliar with platform schema relations); string literal `'PUBLISHED'` not assignable to Prisma enum type
- Graders run and results (PASS/FAIL): tsc --noEmit PASS, vitest PASS (47/47 support tests), turbo build PASS (5/5), turbo test PASS (250/250)
- Prompt variant (if applicable): null
- Next experiment: Pre-load Prisma model relation names into subagent context to avoid common relation name mismatches
