-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateEnum
CREATE TYPE "platform"."Currency" AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'BRL', 'INR', 'MXN');

-- CreateEnum
CREATE TYPE "platform"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "platform"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "platform"."AccessLevel" AS ENUM ('NONE', 'READ', 'WRITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "platform"."OwnershipScope" AS ENUM ('OWN', 'TEAM', 'ALL');

-- CreateEnum
CREATE TYPE "platform"."TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "platform"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED', 'LOCKED');

-- CreateEnum
CREATE TYPE "platform"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "platform"."FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'URL', 'EMAIL', 'PHONE', 'TEXTAREA');

-- CreateTable
CREATE TABLE "platform"."tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "status" "platform"."TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(500),
    "phone" VARCHAR(50),
    "status" "platform"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."module_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "access_level" "platform"."AccessLevel" NOT NULL,

    CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."entity_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "scope" "platform"."OwnershipScope" NOT NULL DEFAULT 'OWN',
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "entity_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."field_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "editable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "field_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."teams" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."user_teams" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "platform"."AuditAction" NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '[]',
    "previous_hash" VARCHAR(64),
    "hash" VARCHAR(64) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "family" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" VARCHAR(500),
    "ip" VARCHAR(45),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."custom_field_defs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "field_type" "platform"."FieldType" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."custom_field_values" (
    "id" UUID NOT NULL,
    "field_def_id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."outbox" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "platform"."tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "platform"."users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "platform"."users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "platform"."roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "platform"."roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "platform"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_permissions_role_id_module_key" ON "platform"."module_permissions"("role_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "entity_permissions_role_id_module_entity_key" ON "platform"."entity_permissions"("role_id", "module", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "field_permissions_role_id_module_entity_field_key" ON "platform"."field_permissions"("role_id", "module", "entity", "field");

-- CreateIndex
CREATE INDEX "teams_tenant_id_idx" ON "platform"."teams"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tenant_id_name_key" ON "platform"."teams"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_teams_user_id_team_id_key" ON "platform"."user_teams"("user_id", "team_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "platform"."audit_logs"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_module_entity_idx" ON "platform"."audit_logs"("tenant_id", "module", "entity");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_record_id_idx" ON "platform"."audit_logs"("tenant_id", "record_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "platform"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "platform"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "platform"."refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "custom_field_defs_tenant_id_module_entity_idx" ON "platform"."custom_field_defs"("tenant_id", "module", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_defs_tenant_id_module_entity_field_name_key" ON "platform"."custom_field_defs"("tenant_id", "module", "entity", "field_name");

-- CreateIndex
CREATE INDEX "custom_field_values_record_id_idx" ON "platform"."custom_field_values"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_def_id_record_id_key" ON "platform"."custom_field_values"("field_def_id", "record_id");

-- CreateIndex
CREATE INDEX "outbox_published_created_at_idx" ON "platform"."outbox"("published", "created_at");

-- AddForeignKey
ALTER TABLE "platform"."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."module_permissions" ADD CONSTRAINT "module_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."entity_permissions" ADD CONSTRAINT "entity_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."field_permissions" ADD CONSTRAINT "field_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."user_teams" ADD CONSTRAINT "user_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."user_teams" ADD CONSTRAINT "user_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "platform"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."custom_field_defs" ADD CONSTRAINT "custom_field_defs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."custom_field_values" ADD CONSTRAINT "custom_field_values_field_def_id_fkey" FOREIGN KEY ("field_def_id") REFERENCES "platform"."custom_field_defs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
