---
id: 16
title: "Phase 12 — US7 Projects Post-Sale Delivery"
stage: implement
date: 2025-07-18
surface: agent
model: claude-opus-4-6
feature: crm-platform
branch: main
user: developer
command: "move to the next phase"
labels: ["projects", "kanban", "milestones", "time-tracking", "portal"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/db/prisma/schema/projects.prisma
  - packages/shared-kernel/src/events/index.ts
  - packages/shared-kernel/src/__tests__/events.test.ts
  - apps/api/src/modules/projects/types.ts
  - apps/api/src/modules/projects/validators.ts
  - apps/api/src/modules/projects/repository.ts
  - apps/api/src/modules/projects/service.ts
  - apps/api/src/modules/projects/events.ts
  - apps/api/src/modules/projects/listeners.ts
  - apps/api/src/modules/projects/routes.ts
  - apps/api/src/modules/projects/__tests__/service.test.ts
  - apps/api/src/modules/projects/__tests__/routes.test.ts
  - apps/api/src/server.ts
  - apps/web/src/modules/projects/api.ts
  - apps/web/src/modules/projects/routes.tsx
  - apps/web/src/modules/projects/pages/project-list.tsx
  - apps/web/src/modules/projects/pages/project-detail.tsx
  - apps/web/src/modules/projects/pages/portal-project.tsx
  - apps/web/src/router.tsx
tests:
  - apps/api/src/modules/projects/__tests__/service.test.ts
  - apps/api/src/modules/projects/__tests__/routes.test.ts
---

## Prompt

move to the next phase

## Response snapshot

Implemented Phase 12 (US7 — Project Manager Runs Post-Sale Delivery, T189-T197) end-to-end:

**Schema (T189):** Created projects.prisma with 3 enums (ProjectStatus, TaskStatus, TaskPriority) and 6 models (ProjectTemplate, Project, Task, Milestone, MilestoneTask, TimeEntry). Added 3 domain events (PROJECT_CREATED, MILESTONE_COMPLETED, TIME_LOGGED) to shared-kernel (total: 26).

**Backend (T191-T192):** Full module with 7 files — types.ts (8 interfaces), validators.ts (Zod schemas for all CRUD), repository.ts (22 functions with includes fragments), service.ts (17 functions including createProjectFromTemplate with template expansion, moveTask with auto-milestone-completion, logTime, getProjectProgress), events.ts (3 outbox publishers), listeners.ts (handleDealWon), routes.ts (18 endpoints with projectsRouter). Wired into server.ts as 12th module router.

**Tests (T193):** service.test.ts (~30 tests: template expansion, CRUD, milestone auto-completion, time logging, progress calculation) + routes.test.ts (~17 tests covering all endpoints). Fixed 6 TS strict errors (ProjectFilters type, enum casts, implicit any params).

**Frontend (T194-T197):** api.ts (types, query keys, 18 hooks), project-list.tsx (DataTable with search/status filter/pagination/create modal), project-detail.tsx (tabs: Kanban board with 4 columns, Milestones with completion badges, Time Log with log modal, Settings), portal-project.tsx (client portal view with progress bar, milestones, timeline). Routes wired into router.tsx with portal route.

## Outcome

- ✅ Impact: Projects module fully operational — templates, Kanban board, milestones with auto-completion, time tracking with billable hours, client portal progress view
- 🧪 Tests: 470 total (45 new project tests: ~30 service + ~17 routes). All 5/5 builds pass.
- 📁 Files: 19 files (15 new, 4 modified)
- 🔁 Next prompts: Phase 13 (US10 — Integrated Communication Hub, T198-T206)
- 🧠 Reflection: Subagent-created backend files needed 6 TS strict-mode fixes (ProjectFilters type mismatch, enum string casts, implicit any in callbacks) — pattern to verify subagent output before wiring.

## Evaluation notes (flywheel)

- Failure modes observed: Subagent generated code that compiled in non-strict mode but failed under noUncheckedIndexedAccess + strict. ProjectFilters included page/limit but routes destructured them out.
- Graders run and results (PASS/FAIL): Build PASS (5/5), Tests PASS (470/470)
- Prompt variant (if applicable): single-phase implementation
- Next experiment: Pre-validate subagent TypeScript patterns with a quick tsc check before full build
