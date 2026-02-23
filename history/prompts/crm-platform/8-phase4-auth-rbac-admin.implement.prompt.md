```prompt
---
id: 8
title: Phase 4 Auth RBAC Admin Implementation
stage: implement
date: 2025-07-24
surface: agent
model: claude-opus-4-20250514
feature: crm-platform
branch: main
user: developer
command: /sp.implement
labels: ["auth", "rbac", "audit-trail", "custom-fields", "admin", "jwt", "phase-4"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - apps/api/src/modules/platform/auth/jwt.service.ts
  - apps/api/src/modules/platform/auth/auth.service.ts
  - apps/api/src/modules/platform/auth/auth.routes.ts
  - apps/api/src/modules/platform/rbac/rbac.validators.ts
  - apps/api/src/modules/platform/rbac/rbac.service.ts
  - apps/api/src/modules/platform/rbac/rbac.cache.ts
  - apps/api/src/modules/platform/rbac/rbac.routes.ts
  - apps/api/src/middleware/rbac.ts
  - apps/api/src/modules/platform/audit/audit.repository.ts
  - apps/api/src/modules/platform/audit/audit.service.ts
  - apps/api/src/modules/platform/audit/audit.routes.ts
  - apps/api/src/middleware/audit.ts
  - apps/api/src/modules/platform/custom-fields/custom-field.repository.ts
  - apps/api/src/modules/platform/custom-fields/custom-field.service.ts
  - apps/api/src/modules/platform/custom-fields/custom-field.routes.ts
  - apps/api/src/middleware/auth.ts (modified — PUBLIC_ROUTES updated)
  - apps/api/src/middleware/tenant.ts (modified — SKIP_TENANT_ROUTES updated)
  - apps/api/src/server.ts (modified — mounted 4 routers + auditMiddleware)
  - apps/web/src/modules/platform/api.ts
  - apps/web/src/modules/platform/pages/roles-list.tsx
  - apps/web/src/modules/platform/pages/role-detail.tsx
  - apps/web/src/modules/platform/pages/custom-fields.tsx
  - apps/web/src/modules/platform/pages/audit-log.tsx
  - apps/web/src/modules/platform/pages/users-list.tsx
  - apps/web/src/router.tsx (modified — 5 admin routes added)
  - apps/api/src/modules/platform/rbac/__tests__/rbac.service.test.ts
  - apps/api/src/middleware/__tests__/rbac.test.ts
  - apps/api/src/modules/platform/audit/__tests__/audit.service.test.ts
  - apps/api/src/modules/platform/custom-fields/__tests__/custom-field.service.test.ts
  - apps/web/src/__tests__/admin-pages.test.tsx
  - apps/api/src/__tests__/auth.test.ts (modified — path updated for PUBLIC_ROUTES change)
tests:
  - apps/api/src/modules/platform/rbac/__tests__/rbac.service.test.ts (8 tests)
  - apps/api/src/middleware/__tests__/rbac.test.ts (7 tests)
  - apps/api/src/modules/platform/audit/__tests__/audit.service.test.ts (5 tests)
  - apps/api/src/modules/platform/custom-fields/__tests__/custom-field.service.test.ts (10 tests)
  - apps/web/src/__tests__/admin-pages.test.tsx (4 tests)
---

## Prompt

PROCEED

(Continue with Phase 4: US5 — Admin Configures RBAC, Custom Fields & Workflows, tasks T063–T084, as specified in specs/crm-platform/tasks.md.)

## Response snapshot

Implemented all 22 tasks for Phase 4 across 5 sub-phases:

**Phase 4A — Auth Backend (T063–T065):**
- JWT service using `jose` with HS256 signing, access/refresh token generation, refresh token rotation with family-based reuse detection stored in Redis
- Auth service: login (bcrypt verify), register (admin-only), refresh (rotation + family revocation on reuse), logout, logoutAll
- Auth routes mounted at `/api/v1/auth` — PUBLIC_ROUTES updated to full paths, register excluded (admin-only)

**Phase 4B — RBAC Backend (T066–T071):**
- Zod validators for role/permission schemas (module → entity → field hierarchy)
- RBAC service: role CRUD with transactional permission replacement, user assignment, permission resolution (most-permissive merge)
- Redis permission cache with pipeline-based invalidation for role-wide changes
- RBAC middleware factory `requirePermission()` — checks module→entity→field, sets `req.ownershipScope` and `req.fieldPermissions`
- Routes mounted at `/api/v1/platform/roles`

**Phase 4C — Audit Trail (T072–T075):**
- Repository with SHA-256 hash chaining for tamper evidence
- Service: recordAudit, getAuditLog (filtered/paginated), verifyChain (integrity check), exportCsv
- Middleware: intercepts `res.json()` on mutations to auto-record audit entries
- Routes mounted at `/api/v1/platform/audit`

**Phase 4D — Custom Fields (T076–T078):**
- Repository: CRUD for CustomFieldDef, upsert for CustomFieldValue
- Service: field def management + type-aware validation (TEXT, NUMBER, DATE, BOOLEAN, SELECT, EMAIL, URL, PHONE, CURRENCY)
- Routes mounted at `/api/v1/platform/custom-fields`

**Phase 4E — Frontend Admin (T079–T084):**
- TanStack Query hooks for all admin APIs
- 5 admin pages: roles list, role detail (3-tab permission editor), custom fields manager, audit log viewer, users list
- Lazy-loaded routes wired into router.tsx

**Key fix:** Express 5 `req.params` returns `string | string[]` — added `param()` helper in route files.

## Outcome

- ✅ Impact: Full auth, RBAC, audit trail, and custom fields backend with admin UI — T063–T084 complete
- 🧪 Tests: 130 total (45 shared-kernel + 4 db + 16 ui + 50 api + 15 web), all passing. 34 new tests added in Phase 4.
- 📁 Files: 20 new files created, 4 existing files modified
- 🔁 Next prompts: Phase 5 (US2 — Contact Management Module, T085–T102)
- 🧠 Reflection: Express 5 `req.params` type incompatibility caught at build time — strict TS (`noUncheckedIndexedAccess`) is proving its value. Audit middleware res.json() interception is clean but needs care with streaming responses in future phases.

## Evaluation notes (flywheel)

- Failure modes observed: Express 5 req.params `string | string[]` type — 9 build errors fixed with param() helper; auth.test.ts needed path update after PUBLIC_ROUTES change
- Graders run and results (PASS/FAIL): Build 5/5 PASS, Tests 130/130 PASS (19 test files)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null

```
