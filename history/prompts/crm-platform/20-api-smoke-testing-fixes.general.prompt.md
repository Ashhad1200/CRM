---
id: 20
title: API Smoke Testing and Express 5 Fixes
stage: general
date: 2025-06-23
surface: agent
model: Claude Opus 4.6
feature: crm-platform
branch: main
user: developer
command: test all the apis
labels: ["api-testing", "express5", "pagination", "error-handling", "smoke-test"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - apps/api/src/middleware/validate.ts
  - apps/api/src/middleware/error-handler.ts
  - apps/api/src/modules/accounting/routes.ts
  - packages/db/prisma/seed.ts
  - test-apis.ps1
tests:
  - test-apis.ps1 (86 endpoints, 86 passing)
---

## Prompt

next test all the apis

## Response snapshot

Created a comprehensive 86-endpoint API smoke test script (`test-apis.ps1`) covering all 16 modules (health, auth, platform/RBAC, audit, custom-fields, workflows, GDPR, sales, accounting, support, inventory, marketing, comms, analytics, projects, sync).

### Issues found and fixed:

1. **Express 5 `req.query` getter problem** — `validate.ts` used `Object.assign(q, parsed)` to apply Zod-coerced query params, but Express 5's `req.query` is a getter that returns a fresh object each time. The coerced values (page/limit defaults, string→number) were lost by the time route handlers accessed `req.query`. **Fix:** `Object.defineProperty(req, 'query', { value: result.data })` to shadow the getter with a data property. Same fix for `req.params`.

2. **Prisma errors returned as 500** — Unique constraint violations (P2002) and not-found (P2025) errors were falling through to the generic 500 handler. **Fix:** Added duck-typed Prisma error detection in `error-handler.ts` to return 409/404/400 respectively.

3. **Missing `workflows` module permission** — Super Admin seed only had 9 modules, missing `workflows`. **Fix:** Added `'workflows'` to seed module list.

4. **Missing accounting report routes** — `ap-aging` and `cash-flow` service methods existed but had no routes. **Fix:** Wired up both in `accounting/routes.ts`.

5. **Test script `$PID` conflict** — PowerShell's `$PID` is read-only (process ID), causing project tests to use numeric PID instead of UUID. **Fix:** Renamed to `$projId`.

### Results progression:
- Run 1: 35 PASSED / 48 FAILED (missing DB tables)
- Run 2: 49 PASSED / 34 FAILED (after migration)
- Run 3: 52 PASSED / 31 FAILED (after validate.ts Object.assign fix)
- Run 4: 75 PASSED / 11 FAILED (after Object.defineProperty fix)
- Run 5: **86 PASSED / 0 FAILED** (after all fixes)

## Outcome

- ✅ Impact: All 86 API endpoints passing smoke tests across all 16 modules
- 🧪 Tests: 86/86 pass in test-apis.ps1
- 📁 Files: 5 files modified (validate.ts, error-handler.ts, accounting/routes.ts, seed.ts, test-apis.ps1)
- 🔁 Next prompts: Frontend integration testing, E2E tests with Playwright
- 🧠 Reflection: Express 5 getter semantics for req.query/req.params is a critical migration gotcha — Object.defineProperty is the correct fix pattern

## Evaluation notes (flywheel)

- Failure modes observed: Express 5 breaking change (req.query getter), Prisma errors not caught, seed incomplete
- Graders run and results (PASS/FAIL): test-apis.ps1 — PASS (86/86)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add response body validation to smoke tests
