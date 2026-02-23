# SoftCRM Deployment Runbook

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Build & Deploy](#build--deploy)
5. [Health Checks](#health-checks)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥ 20.x | Runtime |
| PostgreSQL | 16.x | Primary database |
| Redis | 7.x | Cache, BullMQ queues, sessions |
| Meilisearch | 1.11.x | Full-text search |
| MinIO / S3 | — | File storage |

### Tools

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 9.x | Package manager |
| Docker | 24.x+ | Containerization |
| Terraform | ≥ 1.5 | Infrastructure provisioning |
| Helm | 3.x | Kubernetes deployment |
| k6 | — | Load testing (optional) |

### Required Environment Variables

See `.env.example` for the full list. Critical variables:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/softcrm

# Auth
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>

# Redis
REDIS_URL=redis://host:6379

# S3 / MinIO
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=softcrm-uploads
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>

# Meilisearch
MEILI_URL=http://host:7700
MEILI_KEY=<master-key>

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
```

---

## Environment Setup

### 1. Clone & Install

```bash
git clone https://github.com/org/softcrm.git
cd softcrm
pnpm install
```

### 2. Generate Prisma Client

```bash
cd packages/db
pnpm run generate
cd ../..
```

### 3. Start Dependencies (Local Development)

```bash
docker compose up -d
# Starts: PostgreSQL (5433), Redis (6379), Meilisearch (7700), MinIO (9000)
```

### 4. Run Migrations

```bash
cd packages/db
pnpm run migrate:deploy   # Apply all migrations
pnpm run seed              # Seed default roles + admin user
cd ../..
```

### 5. Build All Packages

```bash
pnpm build
# Builds: shared-kernel → db → ui → api → web (in order)
```

### 6. Verify

```bash
pnpm test                  # Run all tests (~500+)
pnpm typecheck             # TypeScript compilation check
```

---

## Database Migration

### Applying Migrations

```bash
# Production
cd packages/db
DATABASE_URL=$PROD_DATABASE_URL npx prisma migrate deploy

# Preview changes (dry run)
DATABASE_URL=$PROD_DATABASE_URL npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-migrations prisma/migrations \
  --script
```

### Creating New Migrations

```bash
cd packages/db
npx prisma migrate dev --name <migration-name>
```

### Schema Notes

SoftCRM uses **9 PostgreSQL schemas** (namespaces):

| Schema | Module |
|--------|--------|
| `auth` | Users, sessions, tokens |
| `rbac` | Roles, permissions |
| `sales` | Leads, contacts, deals, quotes, pipelines |
| `accounting` | CoA, journal entries, invoices, payments |
| `support` | Tickets, articles, SLA |
| `inventory` | Products, POs, SOs, stock |
| `comms` | Emails, calls, templates |
| `marketing` | Campaigns, attribution |
| `analytics` | Dashboards, widgets, snapshots |
| `projects` | Projects, tasks, time entries |
| `workflow` | Rules, executions |
| `platform` | Audit log, custom fields |

---

## Build & Deploy

### Docker Build

```bash
# API
docker build -f apps/api/Dockerfile -t softcrm-api:latest .

# Web
docker build -f apps/web/Dockerfile -t softcrm-web:latest .
```

### Kubernetes (Helm)

```bash
# Install / Upgrade
helm upgrade --install softcrm tools/k8s/helm/ \
  --namespace softcrm \
  --create-namespace \
  -f tools/k8s/helm/values.yaml \
  -f tools/k8s/helm/values.prod.yaml \
  --set secrets.databaseUrl=$DATABASE_URL \
  --set secrets.jwtSecret=$JWT_SECRET \
  --set secrets.jwtRefreshSecret=$JWT_REFRESH_SECRET

# Verify
kubectl get pods -n softcrm
kubectl logs -n softcrm -l app.kubernetes.io/name=softcrm --tail=100
```

### Terraform (AWS)

```bash
cd tools/k8s/terraform

# Initialize
terraform init

# Plan
terraform plan -var="environment=production"

# Apply
terraform apply -var="environment=production"
```

### Deploy Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm build`)
- [ ] Database migrations applied
- [ ] Seed data verified (roles, permissions)
- [ ] Environment variables set
- [ ] Health check endpoint responds
- [ ] Monitoring dashboards visible
- [ ] SSL certificate valid
- [ ] DNS records point to ALB/Ingress

---

## Health Checks

### API Health

```bash
curl https://crm.example.com/health
# Expected: { "status": "ok", "version": "1.0.0", "uptime": 12345 }
```

### Database Connectivity

```bash
curl https://crm.example.com/health/db
# Expected: { "status": "ok", "latency_ms": 2 }
```

### Redis Connectivity

```bash
curl https://crm.example.com/health/redis
# Expected: { "status": "ok", "latency_ms": 1 }
```

### Kubernetes Probes

| Probe | Path | Port | Period |
|-------|------|------|--------|
| Liveness | `/health` | 3000 | 30s |
| Readiness | `/health` | 3000 | 10s |
| Startup | `/health` | 3000 | 5s (30 failures) |

---

## Rollback Procedures

### Application Rollback

#### Kubernetes

```bash
# Roll back to previous revision
helm rollback softcrm -n softcrm

# Roll back to specific revision
helm history softcrm -n softcrm
helm rollback softcrm <revision> -n softcrm
```

#### ECS

```bash
# Update service to use previous task definition
aws ecs update-service \
  --cluster softcrm-production \
  --service softcrm-api \
  --task-definition softcrm-api-production:<previous-revision>
```

### Database Rollback

> **Warning:** Database rollbacks can cause data loss. Always take a snapshot first.

```bash
# 1. Snapshot current state
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Rollback last migration (development only)
cd packages/db
npx prisma migrate reset  # Resets entire database!

# 3. For production: Apply a corrective migration
npx prisma migrate dev --name rollback-<description>
```

### Emergency Procedures

1. **Immediate:** Scale down affected service to 0 replicas
   ```bash
   kubectl scale deployment softcrm-api -n softcrm --replicas=0
   ```

2. **Assess:** Check logs for root cause
   ```bash
   kubectl logs -n softcrm -l app.kubernetes.io/name=softcrm --tail=500
   ```

3. **Rollback:** Deploy last known good version
   ```bash
   helm rollback softcrm -n softcrm
   ```

4. **Verify:** Confirm health checks pass
5. **Postmortem:** Document in incident report

---

## Troubleshooting

### Common Issues

#### "Connection refused" to PostgreSQL

```bash
# Check if the DB container or RDS instance is running
docker ps | grep postgres
# OR
aws rds describe-db-clusters --db-cluster-identifier softcrm-production

# Verify security group allows access
aws ec2 describe-security-groups --group-ids sg-xxx
```

#### "ECONNREFUSED" to Redis

```bash
# Check Redis connectivity
redis-cli -h <host> -p 6379 ping
# Expected: PONG
```

#### Migration failures

```bash
# Check migration status
cd packages/db
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --applied <migration-name>
```

#### High memory usage (API)

```bash
# Check pod resource usage
kubectl top pods -n softcrm

# Scale up if needed
kubectl scale deployment softcrm-api -n softcrm --replicas=5
```

#### BullMQ jobs stuck

```bash
# Check queue status via Redis
redis-cli -h <host>
KEYS bull:*
LLEN bull:<queue-name>:wait
LLEN bull:<queue-name>:failed
```

### Log Locations

| Environment | Location |
|-------------|----------|
| Local | stdout (structured JSON) |
| Docker | `docker logs <container>` |
| Kubernetes | `kubectl logs -n softcrm <pod>` |
| ECS | CloudWatch `/ecs/softcrm-api-production` |

### Useful Commands

```bash
# Check all builds
pnpm build

# Run specific module tests
pnpm --filter @softcrm/api test

# Generate OpenAPI specs
pnpm generate:openapi

# Connect to production DB (read-only)
psql $PROD_DATABASE_URL_READONLY

# Check Prisma schema drift
cd packages/db && npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma
```
