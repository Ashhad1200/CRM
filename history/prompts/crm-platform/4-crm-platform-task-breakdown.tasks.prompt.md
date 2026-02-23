---
id: 4
title: CRM Platform Task Breakdown
stage: tasks
date: 2025-07-17
surface: agent
model: Claude Opus 4.6
feature: crm-platform
branch: main
user: developer
command: /sp.tasks
labels: ["tasks", "implementation-plan", "breakdown", "phasing", "SDD"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/crm-platform/tasks.md
tests:
  - null
---

## Prompt

/sp.tasks

## Response snapshot

Created comprehensive `specs/crm-platform/tasks.md` (225 tasks across 15 phases) breaking down the full CRM platform implementation plan into testable, actionable tasks.

**Key deliverables:**
- **225 tasks** organized across 15 implementation phases
- **Phase 1–3**: Setup + Foundation (monorepo, shared-kernel, db package, UI design system, API server, web shell) — 62 tasks, BLOCKS all modules
- **Phase 4**: US5 Admin RBAC/Audit/Custom Fields — 22 tasks, UNBLOCKS all modules
- **Phase 5**: US1 Sales Pipeline MVP — 21 tasks (full Kanban, CPQ, events)
- **Phase 6**: US2 Accounting — 28 tasks (double-entry, auto-invoicing from deal.won, P&L/BS/TB reports)
- **Phase 7**: US3 Support — 14 tasks (ticketing, SLA, KB, self-service portal)
- **Phase 8**: US6 Inventory — 10 tasks (products, stock, fulfillment + COGS JE)
- **Phase 9**: US8 Communications — 9 tasks (email sync, VoIP, templates, timeline)
- **Phase 10**: US4 Marketing — 11 tasks (segmentation, campaigns, A/B, attribution)
- **Phase 11**: US9 Analytics — 11 tasks (dashboards, report builder, AI forecasting)
- **Phase 12**: US7 Projects — 9 tasks (Kanban, time tracking, milestones, client portal)
- **Phase 13**: US5 Workflows — 7 tasks (no-code workflow builder)
- **Phase 14**: US10 Mobile — 10 tasks (offline-first RN, GPS, OCR, sync)
- **Phase 15**: Polish — 11 tasks (security, load testing, i18n, GDPR, docs)

**Structure includes:**
- Exact file paths for every task referencing plan's project structure
- [P] parallel markers for independent tasks
- [USx] story markers linking to spec user stories
- Checkpoints after each phase with verifiable acceptance criteria
- Full dependency graph with phase-level and task-level dependencies
- Parallel execution opportunities documented
- Standard module implementation order: schema → migration → validators → repository → service → controller → routes → events → listeners → tests → frontend api.ts → pages → routes

## Outcome

- ✅ Impact: Complete task breakdown enabling phased implementation of 10-module CRM platform
- 🧪 Tests: Each phase includes specific test tasks; checkpoints define acceptance criteria
- 📁 Files: 1 file created (specs/crm-platform/tasks.md)
- 🔁 Next prompts: Begin Phase 1 implementation (`/sp.red` for TDD on T001-T005), or review tasks for refinement
- 🧠 Reflection: 225 tasks provides granular tracking while maintaining phase-level parallelism; dependency graph ensures correct execution order

## Evaluation notes (flywheel)

- Failure modes observed: None — all context from plan.md and spec.md was available
- Graders run and results (PASS/FAIL): Manual review — PASS (all 10 user stories covered, all file paths match plan)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Consider adding estimated effort per task (T-shirt sizing) in a future iteration
