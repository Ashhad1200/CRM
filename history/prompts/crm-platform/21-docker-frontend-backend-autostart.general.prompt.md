---
id: 21
title: Docker Frontend & Backend Auto-Start
stage: general
date: 2025-07-11
surface: agent
model: claude-opus-4-20250514
feature: crm-platform
branch: main
user: developer
command: resume
labels: ["docker", "docker-compose", "vite", "express", "devops", "infrastructure"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - docker-compose.yml
  - apps/web/vite.config.ts
  - .dockerignore
tests:
  - test-apis.ps1 (86/86 endpoints passed against Docker-hosted API)
---

## Prompt

add the starting of the frontend and backend to the docker so when it starts it picks up automatically

(Multiple resume sessions to complete the work due to context window resets)

## Response snapshot

Added API and Web dev server containers to docker-compose.yml for one-command startup of the entire CRM stack.

### Changes Made

1. **docker-compose.yml** — Added two new services:
   - `api` (node:22-alpine): Runs `corepack enable → pnpm install → prisma generate (with retry) → prisma migrate deploy → db:seed → tsx watch`. Depends on db + redis healthy. Health check: `wget http://localhost:4000/health`. Start period 180s for cold starts.
   - `web` (node:22-alpine): Runs `corepack enable → pnpm --filter @softcrm/web dev`. Depends on api healthy. Health check: `wget http://localhost:5173`. Start period 45s.
   - Shared named `node_modules` volume between api and web (monorepo hoisting).
   - `softcrm-net` bridge network for inter-service DNS (api, db, redis, meilisearch, minio).

2. **apps/web/vite.config.ts** — Added two env var configurations:
   - `VITE_API_TARGET`: Proxy target for `/api` and `/socket.io` routes (defaults `http://localhost:4000`, Docker uses `http://api:4000`)
   - `VITE_HOST`: Server host binding (defaults `localhost`, Docker uses `0.0.0.0`)

3. **.dockerignore** — Added `.pnpm-store` exclusion

### Issues Resolved
- **Vite host binding**: pnpm's `--` arg separator was passed literally to Vite, so `--host 0.0.0.0` wasn't recognized. Fixed by using `VITE_HOST` env var in `vite.config.ts` server config.
- **Prisma generate DNS failure**: Transient DNS on cold start caused `getaddrinfo ENOTFOUND binaries.prisma.sh`. Added retry loop (5 attempts with 5s backoff).
- **Health check timeout**: Cold start with empty `node_modules` volume takes ~3 minutes. Increased API `start_period` from 60s to 180s.

### Final State
All 6 containers running and healthy:
- `softcrm-db` (5433) — PostgreSQL 16
- `softcrm-redis` (6379) — Redis 7
- `softcrm-meilisearch` (7700) — Meilisearch v1.11
- `softcrm-minio` (9000-9001) — MinIO
- `softcrm-api` (4000) — Express 5 API
- `softcrm-web` (5173) — Vite + React 19

86/86 API smoke tests passed against Docker-hosted API.

## Outcome

- ✅ Impact: Full CRM stack starts with single `docker compose up -d` command — no manual setup needed
- 🧪 Tests: 86/86 API endpoints pass, web frontend serves HTML, proxy login works end-to-end
- 📁 Files: 3 modified (docker-compose.yml, vite.config.ts, .dockerignore)
- 🔁 Next prompts: Production Dockerfile (multi-stage build), CI/CD pipeline, environment-specific configs
- 🧠 Reflection: pnpm arg forwarding through `--` doesn't work reliably inside Docker shell commands; env vars are more robust for container config. Cold-start health check timeouts need generous start_period values.

## Evaluation notes (flywheel)

- Failure modes observed: Vite --host arg not received via pnpm -- forwarding in Docker sh -c; transient DNS during container cold start breaks prisma generate; health check start_period too short for full pnpm install from empty volume
- Graders run and results (PASS/FAIL): API health PASS, Web 200 PASS, Proxy login PASS, 86/86 smoke tests PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add binaryTargets to base.prisma to pre-download Alpine engine during pnpm install, eliminating runtime DNS dependency for prisma generate
