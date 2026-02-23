```prompt
---
id: 9
title: Phase 5 Sales Pipeline End-to-End
stage: implement
date: 2025-07-25
surface: agent
model: claude-opus-4-20250514
feature: crm-platform
branch: main
user: developer
command: /sp.implement
labels: ["sales", "pipeline", "contacts", "accounts", "leads", "deals", "quotes", "kanban", "phase-5"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/db/prisma/schema/sales.prisma
  - apps/api/src/modules/sales/validators.ts
  - apps/api/src/modules/sales/types.ts
  - apps/api/src/modules/sales/repository.ts
  - apps/api/src/modules/sales/service.ts
  - apps/api/src/modules/sales/events.ts
  - apps/api/src/modules/sales/listeners.ts
  - apps/api/src/modules/sales/routes.ts
  - apps/api/src/server.ts (modified — mounted salesRouter at /api/v1/sales)
  - apps/api/src/modules/sales/__tests__/service.test.ts
  - apps/api/src/modules/sales/__tests__/repository.test.ts
  - apps/api/src/modules/sales/__tests__/routes.test.ts
  - apps/web/src/modules/sales/api.ts
  - apps/web/src/modules/sales/routes.tsx
  - apps/web/src/modules/sales/hooks/use-pipeline.ts
  - apps/web/src/modules/sales/pages/contacts-list.tsx
  - apps/web/src/modules/sales/pages/contact-detail.tsx
  - apps/web/src/modules/sales/pages/accounts-list.tsx
  - apps/web/src/modules/sales/pages/account-detail.tsx
  - apps/web/src/modules/sales/pages/leads-list.tsx
  - apps/web/src/modules/sales/pages/pipeline.tsx
  - apps/web/src/modules/sales/pages/deal-detail.tsx
  - apps/web/src/modules/sales/pages/quote-builder.tsx
  - apps/web/src/router.tsx (modified — wired SalesRoutes into /sales/*)
tests:
  - apps/api/src/modules/sales/__tests__/service.test.ts (12 tests)
  - apps/api/src/modules/sales/__tests__/repository.test.ts (8 tests)
  - apps/api/src/modules/sales/__tests__/routes.test.ts (6 tests)
---

## Prompt

PROCEED — Complete Phase 5: US1 — Sales Rep Manages Pipeline End-to-End (T085-T105). Build full sales pipeline from leads through contacts/accounts, deals, pipeline kanban, and quotes. All builds and tests must pass. Create PHR #9.

## Response snapshot

Phase 5 (T085-T105) fully implemented across 24 files:

**Sales Prisma Schema (T085-T086)**: 9 models (Contact, Account, Lead, Pipeline, PipelineStage, Deal, DealContact, Quote, QuoteLine) + 4 enums (LifecycleStage, LeadSource, LeadStatus, QuoteStatus). Uses Decimal for monetary values, M2M DealContact join table, Account self-referential hierarchy.

**Backend Module (T087-T094)**: 7 files — 22 Zod validators, typed interfaces, 22-function repository with optimistic locking and ownership scope, business service with lead scoring (base 10 + company 10 + phone 5 + referral 15), atomic lead conversion, deal stage movement with weighted value recalculation, quote line-item math, rotting deal detection. Outbox-based event publishing for 5 event types. 33 Express routes across 6 entity groups.

**Tests (T095)**: 26 tests across 3 files — service (12), repository (8), routes (6). All pass.

**Frontend (T096-T105)**: TanStack Query hooks (28 hooks), 8 page components (contacts-list, contact-detail, accounts-list, account-detail, leads-list, pipeline kanban with drag-and-drop, deal-detail with won/lost actions, quote-builder with line-item calculations), lazy routes, custom hooks (useDealsByStage, useLeadScoreColor, formatCurrency). Router wired with SalesRoutes.

**Validation**: 5/5 builds pass, 156 tests pass (45+4+16+76+15) across 22 test files.

## Outcome

- ✅ Impact: Full sales pipeline CRM module from leads to quotes — complete end-to-end workflow
- 🧪 Tests: 156 total (26 new sales tests); 22 test files; all pass
- 📁 Files: 24 files (1 schema + 7 backend + 3 test + 1 api + 8 pages + 1 routes + 1 hooks + 2 modified)
- 🔁 Next prompts: Phase 6 (US2 — Accountant Manages Billing Cycle, T106-T130) — invoicing, payments, revenue recognition
- 🧠 Reflection: Caught apiClient pattern mismatch (function vs object) after initial generation — verified against existing platform/api.ts to match exact calling convention. Subagent delegation worked well for parallel page creation.

## Evaluation notes (flywheel)

- Failure modes observed: Initial api.ts used wrong apiClient calling convention (object with .get/.post vs function); caught by reading existing platform/api.ts before integration
- Graders run and results (PASS/FAIL): turbo build 5/5 PASS, turbo test 156/156 PASS
- Prompt variant (if applicable): Subagent-per-page-group strategy (contacts+accounts, leads+pipeline+deal, quote+routes+hooks)
- Next experiment: Consider generating api.ts with automated pattern extraction from existing api-client.ts
```
