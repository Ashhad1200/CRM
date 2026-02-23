# SoftCRM — Enterprise CRM Platform

> Modular monolith CRM built with TypeScript, React, Node.js, and PostgreSQL.

## Architecture

SoftCRM is a **modular monolith** — 10 bounded-context modules running in a single Node.js process with strict module boundaries enforced by code structure, schema isolation, and an internal event bus.

| Module | Description |
|--------|-------------|
| **Sales** | Contacts, accounts, leads, deals (Kanban), quotes (CPQ) |
| **Accounting** | Double-entry ledger, invoicing, payments, expenses, financial reports |
| **Support** | Multi-channel tickets, SLA enforcement, knowledge base, self-service portal |
| **Marketing** | Segmentation, campaigns, A/B testing, multi-touch attribution |
| **Inventory** | Product catalog, stock tracking, sales/purchase orders, fulfillment |
| **Projects** | Post-sale delivery boards, tasks, milestones, time tracking |
| **Comms** | 2-way email sync, VoIP (Twilio), templates, unified timeline |
| **Analytics** | Dashboards, custom reports, AI forecasting, anomaly detection |
| **Platform** | Auth (JWT/SSO/MFA), RBAC, audit trail, custom fields, workflows |
| **Mobile** | React Native offline-first app with GPS check-in and receipt OCR |

## Tech Stack

- **Backend**: Node.js 20 LTS + Express.js + TypeScript 5.x (strict)
- **Frontend**: React 19 + React Router 7 + Vite + Tailwind CSS 4 + Radix UI
- **Database**: PostgreSQL 16 (schema-per-module) + Prisma 6.x ORM
- **Cache/Events**: Redis 7 (sessions, BullMQ event bus, Socket.IO adapter)
- **Search**: Meilisearch
- **Mobile**: React Native + Expo + WatermelonDB
- **Testing**: Vitest + Playwright + Supertest + k6

## Quickstart

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker](https://www.docker.com/) & Docker Compose

### Setup

```bash
# 1. Clone and navigate to monorepo
cd softcrm

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env

# 4. Start infrastructure services
docker compose up -d

# 5. Run database migrations
pnpm db:migrate

# 6. Seed development data
pnpm db:seed

# 7. Start development servers
pnpm dev
```

The API runs at `http://localhost:4000` and the web app at `http://localhost:5173`.

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:api` | Start only the API server |
| `pnpm dev:web` | Start only the web frontend |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests (requires Docker services) |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed development database |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
softcrm/
├── packages/
│   ├── shared-kernel/     # Shared types, errors, events, utils
│   ├── db/                # Prisma schema, migrations, client
│   └── ui/                # Design system (React + Tailwind + Radix)
├── apps/
│   ├── api/               # Express.js backend API
│   ├── web/               # React SPA frontend
│   └── mobile/            # React Native + Expo app
├── tools/
│   ├── scripts/           # DB init, OpenAPI generation
│   └── k8s/               # Helm charts, Terraform
└── tests/
    ├── load/              # k6 load test scripts
    └── security/          # RBAC boundary + injection tests
```

## Documentation

- [Feature Specification](../specs/crm-platform/spec.md)
- [Architecture Plan](../specs/crm-platform/plan.md)
- [Implementation Tasks](../specs/crm-platform/tasks.md)
- [Constitution](../.specify/memory/constitution.md)

## License

Proprietary — All rights reserved.
