---
id: 3
title: CRM Platform Architecture Plan
stage: plan
date: 2026-02-21
surface: agent
model: Claude Opus 4.6
feature: crm-platform
branch: 001-crm-platform
user: architect
command: /sp.plan
labels: ["architecture", "react", "nodejs", "postgresql", "prisma", "modular-monolith", "rbac", "jwt", "multi-tenant"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/crm-platform/plan.md
tests:
  - null
---

## Prompt

The application will use a React.js frontend, a Node.js backend, and a PostgreSQL database. Structure the backend as a modular REST API to handle the highly relational data models for each module (Contacts, Deals, Invoices, Tickets, etc.). Use an ORM (like Prisma or Drizzle) to manage the complex PostgreSQL schema effectively. The frontend should use Tailwind CSS for styling and implement robust state management to handle real-time dashboard updates, complex form states, and cross-module data interactions. The architecture must be designed from the ground up to be a multi-user platform that natively supports complex Role-Based Access Control (RBAC), secure JWT authentication, and multi-tenant data isolation.

## Response snapshot

Created comprehensive architecture plan at `specs/crm-platform/plan.md` containing:

- **Technical Context**: TypeScript 5.x, Node.js 20 LTS + Express.js, React 19, PostgreSQL 16, Prisma 6.x ORM, Redis 7, BullMQ, Tailwind CSS 4, TanStack Query + Zustand, Socket.IO, Vitest + Playwright + k6
- **Architecture**: Modular monolith with 10 bounded-context modules; schema-per-module in PostgreSQL; internal event bus via BullMQ with outbox pattern
- **Multi-tenancy**: Row-level security (RLS) with `tenant_id` on every table; `SET app.current_tenant` per request
- **Auth**: JWT access tokens (15 min TTL) + opaque refresh tokens (7 day, single-use rotation); SSO/MFA support
- **RBAC**: 3-level permission model (module → entity → field) with ownership scoping (own/team/all); Redis-cached resolution
- **Real-time**: Socket.IO with Redis adapter; WebSocket events trigger TanStack Query invalidation
- **Mobile**: React Native + Expo with WatermelonDB offline sync
- **Project structure**: pnpm monorepo with Turborepo; packages/ (shared-kernel, db, ui), apps/ (api, web, mobile), tools/ (scripts, k8s)
- **Module internal pattern**: routes → controller → service → repository (enforced by ESLint rules)
- **Security**: TLS 1.3, RLS, field-level encryption, audit trail with cryptographic chain, Helmet.js headers, SAST in CI
- **Testing strategy**: Vitest (unit/integration), Supertest (API), Playwright (E2E), k6 (load), security boundary tests
- **Implementation phasing**: 6 phases over 28 weeks (Foundation → Sales MVP → Accounting/Inventory → Support/Comms → Marketing/Analytics → Projects/Mobile → Hardening)
- **3 ADR suggestions**: ORM selection (Prisma), event bus selection (BullMQ), modular monolith vs microservices

## Outcome

- ✅ Impact: Full architecture plan covering all 10 modules with concrete technology choices, code structure, data model approach, API design, deployment topology, and phased build order
- 🧪 Tests: No tests run (planning phase)
- 📁 Files: specs/crm-platform/plan.md created (comprehensive architecture plan)
- 🔁 Next prompts: /sp.adr orm-selection, /sp.adr event-bus-selection, /sp.adr modular-monolith-vs-microservices, /sp.tasks
- 🧠 Reflection: Chose Prisma over Drizzle for multi-schema support maturity and type safety. BullMQ over Kafka for monolith simplicity. Recommended 28-week phased approach starting with Platform + Sales foundation.

## Evaluation notes (flywheel)

- Failure modes observed: None — plan generated from full spec + constitution context
- Graders run and results (PASS/FAIL): Constitution check PASS (all 6 principles addressed)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Validate Prisma multiSchema preview against actual 10-schema setup
