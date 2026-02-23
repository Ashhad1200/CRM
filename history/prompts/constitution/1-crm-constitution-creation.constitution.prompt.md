---
id: 1
title: CRM Constitution Creation
stage: constitution
date: 2026-02-21
surface: agent
model: Claude Opus 4.6
feature: none
branch: main
user: user
command: /sp.constitution
labels: ["constitution", "security", "modularity", "tdd", "ux"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - history/prompts/constitution/1-crm-constitution-creation.constitution.prompt.md
tests:
  - null
---

## Prompt

/sp.constitution Create principles focused on enterprise-grade data security, highly modular code architecture to support multiple distinct subsystems (Sales, Accounting, Support, etc.), strict test-driven development, and a highly responsive, intuitive user experience for both desktop and mobile field workers.

## Response snapshot

Created the SoftCRM Constitution at `.specify/memory/constitution.md` with six core principles:

1. **Enterprise-Grade Data Security (NON-NEGOTIABLE)** — AES-256 encryption at rest, TLS 1.3 in transit, field-level encryption for PII/financial data, zero-trust auth (SSO + MFA), RBAC + field-level security, immutable audit trails with cryptographic chaining, data residency controls, GDPR/SOC 2/PCI compliance by design, vault-managed secrets, and mandatory SAST/dependency scans on every PR.

2. **Highly Modular Architecture** — Bounded contexts per business domain (Sales, Accounting, Support, Marketing, Inventory, Projects, Analytics, Platform), database-per-module isolation, event-driven cross-module communication, minimal shared kernel, plugin/extension points, and independent deployability with per-module CI pipelines.

3. **Strict Test-Driven Development (NON-NEGOTIABLE)** — Mandatory Red → Green → Refactor cycle, enforced test pyramid (unit ≥80%, integration, E2E, security), acceptance criteria mapped 1:1 to test cases, no merge without green CI, regression tests for every bug fix, and performance benchmark tests with SLOs.

4. **Responsive & Intuitive UX** — Mobile-first/desktop-rich design, offline-first for field workers with conflict resolution, performance budgets (FCP < 1.5s, TTI < 3s, API p95 < 200ms), WCAG 2.2 AA accessibility, shared design system, contextual zero-training UX (≤ 3 taps/clicks), real-time WebSocket updates, and i18n from day one.

5. **Observability & Operational Excellence** — Structured JSON logging, OpenTelemetry distributed tracing, SLO-based alerting, health/readiness probes, and runbooks per alert.

6. **Simplicity & Smallest Viable Change** — YAGNI, PRs < 400 lines, no premature abstraction, convention over configuration.

Also established: Technology constraints table, Development workflow & quality gates (Spec → Plan → Tasks → Red → Green → Refactor → PR → Deploy), security review cadence, and governance rules.

## Outcome

- ✅ Impact: Constitution established as the governing document for all CRM development
- 🧪 Tests: N/A (governance document)
- 📁 Files: .specify/memory/constitution.md created
- 🔁 Next prompts: Define first feature spec (e.g., Contact & Account Management), select tech stack, scaffold project structure
- 🧠 Reflection: Constitution covers all four requested pillars with concrete, measurable criteria rather than vague aspirations

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A
