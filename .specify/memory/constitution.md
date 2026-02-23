# SoftCRM Constitution

> The governing principles for the SoftCRM enterprise platform. All code, architecture, and process decisions **must** comply with these principles. Deviations require an ADR with explicit justification and team consent.

---

## Core Principles

### I. Enterprise-Grade Data Security (NON-NEGOTIABLE)

Every layer of the system treats customer and financial data as the highest-value asset. Security is not a feature — it is a constraint on all features.

- **Encryption everywhere.** All data encrypted at rest (AES-256) and in transit (TLS 1.3). Database field-level encryption for PII and financial data (card numbers, bank accounts, tax IDs).
- **Zero-trust authentication.** SSO (SAML 2.0 / OIDC), mandatory MFA for all users, short-lived JWT access tokens with opaque refresh tokens, and device fingerprinting for field workers.
- **Role-Based Access Control (RBAC) + field-level security.** Permissions defined per module, per entity, and per field. No user sees data beyond their role scope. Admin cannot bypass audit.
- **Immutable audit trail.** Every data mutation (create, update, delete) is recorded with actor, timestamp, IP, device, previous value, and new value. Audit logs are append-only and tamper-evident (cryptographic chaining).
- **Data residency & tenant isolation.** Multi-tenant architecture with logical tenant isolation by default; physical isolation available for enterprise tier. Data residency controls per region (EU, US, APAC).
- **Compliance by design.** GDPR (consent management, right to erasure, data portability), SOC 2 Type II controls baked in, PCI DSS for payment data, and tax audit trails for the Accounting module.
- **Secret management.** No secrets in code or config files. All credentials via vault (HashiCorp Vault / cloud KMS). Environment-specific secrets injected at deploy time only.
- **Security testing gate.** Every PR must pass SAST (static analysis), dependency vulnerability scan, and secret detection before merge. Penetration testing required before each major release.

### II. Highly Modular Architecture

The CRM is a **platform of subsystems**, not a monolith. Each business domain (Sales, Accounting, Support, Marketing, Inventory, Projects, Analytics, Platform/Admin) is an independently deployable, independently testable module.

- **Bounded contexts.** Each module owns its domain model, database schema, and business rules. No module directly queries another module's database. Cross-module communication uses well-defined contracts (APIs / events).
- **Module contracts.** Every module exposes a public API surface (REST + async events). Internal implementation details are private. Breaking contract changes require a versioned migration path and ADR.
- **Event-driven integration.** Modules communicate asynchronously via a message bus (domain events). Synchronous calls are permitted only for read-heavy, latency-sensitive operations (e.g., fetching a contact name for display).
- **Shared kernel — minimal and explicit.** Common types (UserId, TenantId, Money, Address, AuditMetadata) live in a shared kernel package. This package is small, stable, and versioned. No business logic in shared kernel.
- **Plugin / extension points.** The Platform module exposes hooks (workflow triggers, custom fields, custom actions) so that marketplace extensions and customer customizations never fork core code.
- **Independent deployability.** Each module can be built, tested, and deployed without rebuilding others. Module-level CI pipelines. Feature flags per module.
- **Database-per-module (logical).** Each module owns its schema namespace. Cross-module joins are forbidden; use API materialization or read-model projections instead.

### III. Strict Test-Driven Development (NON-NEGOTIABLE)

No production code is written without a failing test first. TDD is the primary design tool, not an afterthought.

- **Red → Green → Refactor.** The cycle is mandatory for every feature, bugfix, and refactor. Tests are written and reviewed *before* implementation begins.
- **Test pyramid enforced.**
  - **Unit tests** (≥80% line coverage per module): Pure logic, domain rules, calculations, validators. Fast (<5 ms each). No I/O.
  - **Integration tests**: API contract tests, database repository tests, message bus consumer tests. Use test containers for real dependencies.
  - **End-to-end tests**: Critical user journeys across modules (e.g., Lead → Deal → Quote → Invoice → Payment). Run in CI on every PR against a staging environment.
  - **Security tests**: Authentication flows, authorization boundary tests, injection prevention, CSRF/XSS probes.
- **Acceptance criteria = test cases.** Every spec/task must list concrete acceptance criteria that map 1:1 to test cases before implementation starts.
- **No merge without green.** CI pipeline blocks merge if any test fails, coverage drops below threshold, or new code lacks corresponding tests.
- **Regression suite.** Every bug fix adds a regression test that reproduces the bug, fails, then passes with the fix.
- **Performance benchmarks.** Critical paths (API response times, report generation, bulk import) have benchmark tests with defined SLOs. Regressions fail the build.

### IV. Responsive & Intuitive User Experience

The UI must serve two very different user profiles equally well: **desktop power users** (sales managers, accountants, support supervisors) and **mobile field workers** (sales reps, technicians, delivery agents) — often in low-connectivity environments.

- **Mobile-first, desktop-rich.** Design starts from the smallest viewport and progressively enhances to large screens with multi-panel layouts, keyboard shortcuts, and data-dense views.
- **Offline-first for mobile.** Field worker flows (contact lookup, deal updates, GPS check-in, expense logging) must work fully offline. Data syncs automatically when connectivity resumes, with conflict resolution (last-write-wins with manual override for conflicts).
- **Performance budgets.**
  - First Contentful Paint: < 1.5 s on 4G.
  - Time to Interactive: < 3 s on 4G.
  - API response (p95): < 200 ms for reads, < 500 ms for writes.
  - Lighthouse score: ≥ 90 (Performance, Accessibility, Best Practices).
- **Accessibility.** WCAG 2.2 AA compliance. Full keyboard navigation. Screen reader support. High-contrast mode. Minimum touch target 44×44 px on mobile.
- **Consistent design system.** A single component library (design tokens, typography scale, color palette, spacing grid, icon set) shared across web and mobile. All UI changes go through the design system — no one-off styles.
- **Contextual, zero-training UX.** Inline guidance, progressive disclosure, smart defaults, and contextual actions. Users should accomplish core tasks (log a call, update a deal, create an invoice) in ≤ 3 taps/clicks.
- **Real-time where it matters.** Live updates for dashboards, pipeline boards, chat, and notifications via WebSockets. Optimistic UI updates for snappy feel.
- **Internationalization (i18n) from day one.** All user-facing strings externalized. RTL layout support. Multi-currency display with locale-aware formatting.

### V. Observability & Operational Excellence

The system must be transparent, debuggable, and self-healing in production.

- **Structured logging.** JSON-formatted, correlation-ID-tagged logs for every request spanning all modules. Log levels enforced (no debug logs in production).
- **Distributed tracing.** OpenTelemetry traces across module boundaries. Every API call and event carries a trace context.
- **Metrics & alerting.** Key metrics (request rate, error rate, latency percentiles, queue depth, active users) exported to a monitoring stack. SLO-based alerting with error budgets.
- **Health checks & readiness probes.** Every module exposes `/health` and `/ready` endpoints. Orchestrator (K8s) uses them for self-healing restarts and traffic routing.
- **Runbooks.** Every alert has a linked runbook with diagnosis steps and remediation actions.

### VI. Simplicity & Smallest Viable Change

Complexity is the enemy of reliability and velocity.

- **YAGNI.** Do not build speculative features. Every addition must trace to a spec with acceptance criteria.
- **Smallest diff.** PRs target < 400 lines of meaningful change. Large features are decomposed into incremental, shippable slices.
- **No premature abstraction.** Extract shared code only when three or more consumers exist. Prefer duplication over the wrong abstraction.
- **Convention over configuration.** Consistent project structure, naming conventions, and coding patterns reduce cognitive load. Document conventions once; enforce with linters and generators.

---

## Technology & Architecture Constraints

| Concern | Constraint |
|---|---|
| **Backend** | Modular service architecture; each module is a self-contained bounded context with its own API surface |
| **API style** | REST (OpenAPI 3.1 spec-first) for CRUD; async events (message bus) for cross-module workflows; GraphQL considered only for aggregation gateway |
| **Database** | Relational (PostgreSQL) as primary store; schema-per-module isolation; Redis for caching and session; search index for full-text |
| **Authentication** | OAuth 2.0 / OIDC with PKCE; JWT access tokens (short TTL); opaque refresh tokens; MFA enforced |
| **Frontend** | Component-based SPA with SSR for initial load; shared design system package; offline-capable PWA for mobile |
| **Mobile** | Cross-platform (React Native or Flutter) with native offline storage; push notifications; GPS/camera access |
| **CI/CD** | Per-module pipelines; automated test gates (unit → integration → E2E → security); blue-green or canary deployments |
| **Infrastructure** | Container-orchestrated (Kubernetes); infrastructure-as-code (Terraform); multi-region capable |
| **Secrets** | Vault-managed; rotated automatically; never in source or CI logs |
| **Logging / Tracing** | OpenTelemetry; centralized log aggregation; correlation IDs mandatory |

---

## Development Workflow & Quality Gates

1. **Spec phase.** Feature starts with a spec (`specs/<feature>/spec.md`) containing scope, acceptance criteria, and error paths.
2. **Plan phase.** Architecture plan (`specs/<feature>/plan.md`) with module impact, API contracts, data model changes, and ADRs for significant decisions.
3. **Task phase.** Tasks (`specs/<feature>/tasks.md`) broken into testable increments, each with explicit test cases.
4. **Red phase (TDD).** Write failing tests matching acceptance criteria. Tests reviewed and approved before implementation.
5. **Green phase.** Implement the minimum code to make tests pass. No gold-plating.
6. **Refactor phase.** Clean up duplication, improve naming, extract patterns — all while keeping tests green.
7. **PR review.** Every PR requires:
   - [ ] All tests green (unit + integration + E2E where applicable)
   - [ ] Coverage threshold met (≥80% per module)
   - [ ] No new lint/type errors
   - [ ] SAST scan clean
   - [ ] Dependency vulnerability scan clean
   - [ ] OpenAPI spec updated if API changed
   - [ ] ADR created if architecturally significant decision made
8. **Deploy.** Merge to main triggers automated deploy to staging. Production deploy requires manual promotion with feature flag control.

---

## Security Review Cadence

| Activity | Frequency |
|---|---|
| Dependency vulnerability scan | Every PR (automated) |
| SAST / secret detection | Every PR (automated) |
| RBAC permission audit | Monthly |
| Penetration test (external) | Before each major release (quarterly minimum) |
| Audit log integrity check | Weekly (automated) |
| Incident response drill | Bi-annually |
| Compliance review (GDPR/SOC 2) | Annually |

---

## Governance

- This constitution **supersedes** all ad-hoc practices. Any code, design, or process that conflicts with these principles must be corrected or granted an explicit exception via ADR.
- **Amendments** require: (1) written proposal, (2) impact analysis, (3) team review, (4) updated version number and ratification date.
- All PRs and code reviews **must verify** compliance with these principles. Reviewers are empowered to block merges for constitutional violations.
- Architectural decisions that affect security, module boundaries, data contracts, or UX architecture **must** be documented in an ADR (`history/adr/`).
- The `CRM_Blueprint.md` is the authoritative product reference. This constitution governs *how* we build; the blueprint governs *what* we build.

**Version**: 1.0.0 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-21
