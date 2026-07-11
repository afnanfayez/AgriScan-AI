-- ============================================================
-- AgriScan AI — Service Role Grant Fix
-- Run this in: Supabase Dashboard → SQL Editor
-- 
-- Purpose: Grants full table access to the service_role so the
-- seed script (scripts/seed-test-accounts.js) can insert data
-- directly. The service_role bypasses RLS by nature, but still
-- needs table-level GRANT to be allowed by PostgreSQL's ACL layer.
--
-- This is safe: service_role is your backend/admin key and is
-- never exposed to end-users. It is separate from the anon key.
-- ============================================================

-- Core base tables
GRANT ALL ON public.profiles        TO service_role;
GRANT ALL ON public.farms           TO service_role;
GRANT ALL ON public.plants          TO service_role;
GRANT ALL ON public.scans           TO service_role;
GRANT ALL ON public.treatments      TO service_role;
GRANT ALL ON public.notes           TO service_role;
GRANT ALL ON public.notifications   TO service_role;
GRANT ALL ON public.team_members    TO service_role;
GRANT ALL ON public.forum_posts     TO service_role;
GRANT ALL ON public.forum_comments  TO service_role;
GRANT ALL ON public.expert_reviews  TO service_role;
GRANT ALL ON public.diseases_reference TO service_role;

-- Role-specific tables (added by supabase_role_features_patch.sql)
GRANT ALL ON public.care_reminders     TO service_role;
GRANT ALL ON public.expenses           TO service_role;
GRANT ALL ON public.equipment          TO service_role;
GRANT ALL ON public.farm_tasks         TO service_role;
GRANT ALL ON public.inventory_batches  TO service_role;
GRANT ALL ON public.orders             TO service_role;
GRANT ALL ON public.order_items        TO service_role;
GRANT ALL ON public.suppliers          TO service_role;
GRANT ALL ON public.market_prices      TO service_role;

-- New role tables (added by supabase_new_roles_patch.sql)
GRANT ALL ON public.field_scans        TO service_role;
GRANT ALL ON public.irrigation_logs    TO service_role;
GRANT ALL ON public.batch_scans        TO service_role;
GRANT ALL ON public.organizations      TO service_role;
GRANT ALL ON public.org_members        TO service_role;
GRANT ALL ON public.organization_farms TO service_role;
GRANT ALL ON public.api_keys           TO service_role;
GRANT ALL ON public.api_usage_logs     TO service_role;
GRANT ALL ON public.audit_reports      TO service_role;

-- Sequences (needed for uuid_generate_v4 default values to work)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
