-- AION Workforce — enable PostgreSQL Row Level Security for tenant isolation.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/enable_rls.sql
--
-- For every table in the `public` schema that has a `tenant_id` column this script:
--   1. enables ROW LEVEL SECURITY,
--   2. forces it even for the table owner (FORCE ROW LEVEL SECURITY),
--   3. (re)creates a `tenant_isolation` policy that only exposes rows whose
--      `tenant_id` matches the session/transaction setting `app.current_tenant_id`.
--
-- The application must set the tenant per transaction before touching tenant data:
--   SET LOCAL app.current_tenant_id = '<tenant_id>';
--
-- The policy is fail-closed: when `app.current_tenant_id` is unset, the second
-- argument of current_setting(..., true) makes it return NULL and no rows match.

DO $$
DECLARE
  target record;
  policy_name text := 'tenant_isolation';
  predicate text;
BEGIN
  predicate := 'tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::integer';

  FOR target IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    WHERE c.column_name = 'tenant_id'
      AND c.table_schema = 'public'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target.table_schema, target.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', target.table_schema, target.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_name, target.table_schema, target.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
      policy_name, target.table_schema, target.table_name, predicate, predicate
    );
    RAISE NOTICE 'RLS enabled on %.%', target.table_schema, target.table_name;
  END LOOP;
END
$$;
