-- TeamClaw Database Initialization Script
-- This runs automatically when PostgreSQL container first starts
--
-- NOTE: Do NOT create application tables here.
-- All tables are managed by migrations in server/src/db/migrations/.
-- This file only sets up extensions and permissions.

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant default privileges (so migrations can create tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO teamclaw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO teamclaw;
