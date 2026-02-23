-- ==============================================================================
-- SoftCRM — Initialize PostgreSQL Schemas
-- ==============================================================================
-- This script runs once when the PostgreSQL container is first created.
-- It creates the per-module schemas used by the modular monolith architecture.
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

-- Grant usage to the application user
GRANT USAGE ON SCHEMA platform TO softcrm;
GRANT USAGE ON SCHEMA sales TO softcrm;
GRANT USAGE ON SCHEMA accounting TO softcrm;
GRANT USAGE ON SCHEMA support TO softcrm;
GRANT USAGE ON SCHEMA marketing TO softcrm;
GRANT USAGE ON SCHEMA inventory TO softcrm;
GRANT USAGE ON SCHEMA projects TO softcrm;
GRANT USAGE ON SCHEMA comms TO softcrm;
GRANT USAGE ON SCHEMA analytics TO softcrm;

-- Grant table-level privileges (for future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA accounting GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA support GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA marketing GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA inventory GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA projects GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA comms GRANT ALL PRIVILEGES ON TABLES TO softcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL PRIVILEGES ON TABLES TO softcrm;
