---
id: 2
title: CRM Platform Full Specification
stage: spec
date: 2026-02-21
surface: agent
model: Claude Opus 4.6
feature: crm-platform
branch: main
user: user
command: /sp.specify
labels: ["spec", "crm", "platform", "all-in-one", "10-modules"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/crm-platform/spec.md
  - history/prompts/crm-platform/2-crm-platform-full-specification.spec.prompt.md
tests:
  - null
---

## Prompt

/sp.specify Build an all-in-one Enterprise CRM platform designed to be the single source of truth for a business. It must centralize customer data and automate workflows across 10 core modules: Sales (pipelines, lead scoring, CPQ), Marketing (campaigns, automation), Customer Support (ticketing, self-service portals), a fully integrated core Accounting module (invoicing, general ledger, AR/AP, expense management), Inventory, and post-sale Project Management. The system must include a Communication hub (email/VoIP sync), comprehensive Analytics/AI forecasting, and an Admin platform with strict Role-Based Access Control (RBAC) and custom fields. The goal is to eliminate the need for third-party accounting and marketing tools.

## Response snapshot

Created comprehensive platform spec at `specs/crm-platform/spec.md` covering:

- **10 User Stories** (P1-P3): Sales pipeline E2E (P1), Accounting invoicing & reporting (P1), Support ticketing (P1), Admin RBAC & workflows (P1), Marketing campaigns with attribution (P2), Inventory fulfillment (P2), Project management post-sale (P2), Communication hub (P2), Analytics/AI dashboard (P2), Mobile offline (P3).
- **75+ Functional Requirements** across all 10 modules (FR-S, FR-M, FR-CS, FR-A, FR-I, FR-P, FR-CH, FR-AN, FR-PL, FR-MB).
- **17 Key Entities** modeled: Tenant, User, Contact, Account, Lead, Deal, Quote, Product, Invoice, Journal Entry, Expense, Ticket, Campaign, Project, Task, Activity, Workflow Rule, Audit Log.
- **Cross-Module Integration Map**: 19 domain events connecting modules via event-driven architecture.
- **NFRs**: Performance targets (API p95 <200ms reads, <500ms writes), 99.9% uptime SLO, security per constitution, horizontal scalability.
- **10 Success Criteria** with measurable targets.
- **3 ADR suggestions**: modular-monolith-vs-microservices, event-bus-selection, accounting-engine-design.
- **Edge cases**: duplicate detection, currency mismatch, circular workflows, concurrent edits, invoice voiding, period close, GDPR erasure, bulk import, rate limiting, SSO session.

## Outcome

- ✅ Impact: Complete product spec covering all 10 modules as a unified platform
- 🧪 Tests: N/A (spec document; acceptance scenarios defined for implementation phase)
- 📁 Files: specs/crm-platform/spec.md
- 🔁 Next prompts: `/sp.plan crm-platform` to create architecture plan, `/sp.adr` for the 3 identified decisions, or spec individual modules for deeper detail
- 🧠 Reflection: Spec balances breadth (10 modules) with testable depth (acceptance scenarios per story, 75+ FRs). Accounting module given P1 priority alongside Sales/Support since it's the key differentiator. Cross-module event map ensures "single source of truth" promise is architecturally enforceable.

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A
