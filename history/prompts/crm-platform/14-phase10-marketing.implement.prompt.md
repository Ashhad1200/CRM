---
id: 14
title: "Phase 10 Marketing Campaign with Attribution"
stage: green
date: 2025-07-22
surface: agent
model: claude-opus-4-6
feature: crm-platform
branch: main
user: developer
command: implement
labels: ["marketing", "campaigns", "attribution", "segments", "a-b-testing", "webhooks", "phase-10"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/db/prisma/schema/marketing.prisma
  - packages/shared-kernel/src/events/index.ts
  - packages/shared-kernel/src/__tests__/events.test.ts
  - apps/api/src/modules/marketing/types.ts
  - apps/api/src/modules/marketing/validators.ts
  - apps/api/src/modules/marketing/repository.ts
  - apps/api/src/modules/marketing/service.ts
  - apps/api/src/modules/marketing/events.ts
  - apps/api/src/modules/marketing/listeners.ts
  - apps/api/src/modules/marketing/routes.ts
  - apps/api/src/modules/marketing/__tests__/service.test.ts
  - apps/api/src/modules/marketing/__tests__/routes.test.ts
  - apps/api/src/server.ts
  - apps/web/src/modules/marketing/api.ts
  - apps/web/src/modules/marketing/routes.tsx
  - apps/web/src/modules/marketing/pages/segments.tsx
  - apps/web/src/modules/marketing/pages/campaign-list.tsx
  - apps/web/src/modules/marketing/pages/campaign-builder.tsx
  - apps/web/src/modules/marketing/pages/campaign-detail.tsx
  - apps/web/src/modules/marketing/pages/attribution.tsx
  - apps/web/src/router.tsx
tests:
  - apps/api/src/modules/marketing/__tests__/service.test.ts (32 tests)
  - apps/api/src/modules/marketing/__tests__/routes.test.ts (15 tests)
---

## Prompt

move to the next phase

## Response snapshot

Implemented Phase 10 (US4 — Marketing Campaign with Attribution, T167-T177):

**Schema (T167-T168):**
- Created marketing.prisma with 4 enums (CampaignStatus, CampaignType, ABVariant, TouchType) and 5 models (Segment, Campaign, CampaignRecipient, MarketingTouch, Unsubscribe)
- Added CAMPAIGN_SENT to EventTypes (now 22 total)
- Ran prisma generate successfully

**Backend (T169-T172):**
- types.ts: SegmentWithCount, CampaignWithSegment, CampaignWithRecipients, CampaignMetrics, AttributionResult, SegmentFilters, CampaignFilters
- validators.ts: 17 Zod schemas covering segments, campaigns, webhooks, touches, attribution queries
- repository.ts: Full CRUD for all 5 models with bulk operations and optional transaction support
- service.ts: Segment CRUD with uniqueness, campaign lifecycle (build→schedule→send with A/B split), webhook processing (delivered/opened/clicked/bounced/unsubscribed), campaign metrics, touch recording, attribution report (first/last/linear models), handleDealWon linking
- events.ts: publishCampaignSent via outbox pattern
- listeners.ts: handleDealWon listener for deal.won events
- routes.ts: 16 endpoints covering segments, campaigns, webhooks, attribution, touches, unsubscribes
- service.test.ts: 32 tests covering all service methods
- routes.test.ts: 15 tests covering all HTTP endpoints

**Frontend (T173-T177):**
- api.ts: Types, query key factory, 15 React Query hooks
- segments.tsx: List/create segments with search and dynamic/static filter
- campaign-list.tsx: Campaign list with search, status, and type filters
- campaign-builder.tsx: Create/edit campaigns with segment selection and A/B subject lines
- campaign-detail.tsx: Campaign detail with metrics, recipient list, and lifecycle actions
- attribution.tsx: Multi-touch attribution report with model selection and date filters
- routes.tsx: Lazy-loaded route definitions
- Wired into router.tsx replacing marketing placeholder

**Metrics:** 382 total tests (47 new), 5/5 builds, 8/8 test tasks

## Outcome

- ✅ Impact: Full marketing module with campaign lifecycle, A/B testing, webhook engagement tracking, and multi-touch attribution
- 🧪 Tests: 382 total (47 new marketing tests — 32 service + 15 routes), all passing
- 📁 Files: 17 new files, 3 modified files (events, server.ts, router.tsx)
- 🔁 Next prompts: Phase 11 (US5 — Document & File Vault, T178-T186)
- 🧠 Reflection: Subagent-generated frontend pages had noPropertyAccessFromIndexSignature violations (7 TS4111 errors) due to dot notation on Record<string, unknown> — fixed with bracket notation. Pattern to enforce in future subagent prompts.

## Evaluation notes (flywheel)

- Failure modes observed: Subagent frontend code used dot notation on index signatures (params.search vs params['search']) — 7 TS4111 errors in 3 files
- Graders run and results (PASS/FAIL): TypeScript build PASS, Vitest 382/382 PASS
- Prompt variant (if applicable): null
- Next experiment: Include noPropertyAccessFromIndexSignature reminder in frontend subagent prompts
