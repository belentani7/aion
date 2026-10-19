-- AION Workforce — PostgreSQL multi-tenant schema.
-- Target: PostgreSQL 14+.
-- This is the deliberate MySQL/TiDB -> PostgreSQL migration path used to gain native
-- Row Level Security. Column names use snake_case (PostgreSQL convention) and every
-- tenant-scoped table carries an integer `tenant_id` so that RLS policies can be
-- generated generically by scripts/enable_rls.sql.
-- The running application keeps using MySQL/TiDB; this schema is applied only on a
-- PostgreSQL deployment.

CREATE TYPE "user_role" AS ENUM ('user', 'admin');--> statement-breakpoint
CREATE TYPE "tenant_member_role" AS ENUM ('owner', 'admin', 'manager', 'employee');--> statement-breakpoint
CREATE TYPE "member_status" AS ENUM ('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "shift_status" AS ENUM ('scheduled', 'completed', 'cancelled', 'pending_approval');--> statement-breakpoint
CREATE TYPE "plan_type" AS ENUM ('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "incident_status" AS ENUM ('open', 'investigating', 'resolved');--> statement-breakpoint
CREATE TYPE "incident_severity" AS ENUM ('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "absence_status" AS ENUM ('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "event_type" AS ENUM ('shift_created', 'shift_updated', 'shift_deleted', 'payroll_calculated', 'employee_created', 'employee_updated', 'employee_deleted', 'incident_created', 'incident_updated', 'tenant_created', 'member_added', 'member_role_updated', 'plan_updated', 'collective_agreement_created', 'absence_recorded');--> statement-breakpoint

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);--> statement-breakpoint

CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"plan" "plan_type" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "tenants_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);--> statement-breakpoint

CREATE TABLE "tenant_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "tenant_member_role" DEFAULT 'employee' NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_members_tenant_user_unique" UNIQUE("tenant_id","user_id")
);--> statement-breakpoint

CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_tenant_name_unique" UNIQUE("tenant_id","name")
);--> statement-breakpoint

CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"department_id" integer,
	"name" varchar(255) NOT NULL,
	"role" "tenant_member_role" DEFAULT 'employee' NOT NULL,
	"hourly_rate" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer,
	"department_id" integer,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" "shift_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "payroll_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"hours_worked" numeric(10, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"payroll_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"severity" "incident_severity" DEFAULT 'medium' NOT NULL,
	"status" "incident_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "collective_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"rules" jsonb NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "absences" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"type" varchar(64) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" "absence_status" DEFAULT 'approved' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"event_type" "event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"previous_hash" varchar(64),
	"current_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "webhook_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" varchar(120) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_agreements" ADD CONSTRAINT "collective_agreements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "tenant_members_user_lookup" ON "tenant_members" ("user_id","status");--> statement-breakpoint
CREATE INDEX "departments_tenant_lookup" ON "departments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_tenant_lookup" ON "employees" ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "employees_department_lookup" ON "employees" ("tenant_id","department_id");--> statement-breakpoint
CREATE INDEX "shifts_tenant_time_lookup" ON "shifts" ("tenant_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "shifts_employee_time_lookup" ON "shifts" ("tenant_id","employee_id","start_time");--> statement-breakpoint
CREATE INDEX "payroll_tenant_period_lookup" ON "payroll_entries" ("tenant_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "payroll_employee_period_lookup" ON "payroll_entries" ("tenant_id","employee_id","period_end");--> statement-breakpoint
CREATE INDEX "incidents_tenant_lookup" ON "incidents" ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "incidents_employee_lookup" ON "incidents" ("tenant_id","employee_id","created_at");--> statement-breakpoint
CREATE INDEX "agreements_tenant_lookup" ON "collective_agreements" ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "absences_tenant_lookup" ON "absences" ("tenant_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "audit_tenant_chain_lookup" ON "audit_events" ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "audit_current_hash_lookup" ON "audit_events" ("current_hash");--> statement-breakpoint

-- Keep updated_at consistent with the MySQL ON UPDATE CURRENT_TIMESTAMP behaviour.
CREATE OR REPLACE FUNCTION "set_updated_at"() RETURNS trigger AS $$
BEGIN
	NEW."updated_at" = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "tenants_set_updated_at" BEFORE UPDATE ON "tenants" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "tenant_members_set_updated_at" BEFORE UPDATE ON "tenant_members" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "employees_set_updated_at" BEFORE UPDATE ON "employees" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "shifts_set_updated_at" BEFORE UPDATE ON "shifts" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "incidents_set_updated_at" BEFORE UPDATE ON "incidents" FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
