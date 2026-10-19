-- Migration script for AION Workforce initial schema

CREATE TYPE user_role AS ENUM (
  'user',
  'admin',
  'manager',
  'employee'
);

CREATE TYPE shift_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'pending_approval'
);

CREATE TYPE plan_type AS ENUM (
  'free',
  'pro',
  'enterprise'
);

CREATE TYPE event_type AS ENUM (
  'shift_created',
  'shift_updated',
  'shift_deleted',
  'payroll_calculated',
  'employee_created',
  'employee_updated',
  'employee_deleted',
  'tenant_created',
  'plan_updated'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_signed_in TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  plan plan_type DEFAULT 'free' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'employee' NOT NULL,
  hourly_rate NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status shift_status DEFAULT 'scheduled' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE payroll_entries (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL,
  hash VARCHAR(64) NOT NULL,
  payroll_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE audit_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  payload JSONB NOT NULL,
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Drizzle internal migrations table
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
	"id" SERIAL PRIMARY KEY,
	"hash" text NOT NULL,
	"created_at" bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES (
  '0001_initial_schema',
  EXTRACT(EPOCH FROM NOW())::BIGINT
);
