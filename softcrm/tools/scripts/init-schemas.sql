-- ==============================================================================
-- SoftCRM — Initialize PostgreSQL Schemas
-- ==============================================================================
-- This script runs once when the PostgreSQL container is first created.
-- It creates the per-module schemas used by the modular monolith architecture.
-- Must match the schemas list in packages/db/prisma/schema/base.prisma
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS support;
CREATE SCHEMA IF NOT EXISTS marketing;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS comms;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS manufacturing;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS procurement;
CREATE SCHEMA IF NOT EXISTS pos;
CREATE SCHEMA IF NOT EXISTS assets;
CREATE SCHEMA IF NOT EXISTS quality;

-- Grant usage to the application user
DO $$
DECLARE
  s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'platform','sales','accounting','support','marketing',
    'inventory','projects','comms','analytics',
    'hr','manufacturing','warehouse','procurement',
    'pos','assets','quality'
  ]
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO softcrm', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO softcrm', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO softcrm', s);
  END LOOP;
END
$$;
