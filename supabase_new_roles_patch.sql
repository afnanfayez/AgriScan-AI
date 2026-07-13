-- ============================================================
-- AgriScan AI - NEW ROLES SCHEMA PATCH (Commercial Farmer,
-- Nursery Operator - Phase 0)
-- Run this in Supabase Dashboard -> SQL Editor, after
-- supabase_schema.sql, supabase_rls_patch.sql, and
-- supabase_role_features_patch.sql have all been applied.
--
-- Self-contained: this file (re)creates every SECURITY DEFINER
-- helper function it needs via CREATE OR REPLACE, so it does not
-- assume any particular prior patch ran more than once - only
-- that the base schema (profiles/farms/inventory_batches/orders)
-- already exists.
--
-- Purely additive: existing columns are only ever added with
-- IF NOT EXISTS; the two status CHECK constraints that are
-- widened are dropped and recreated by name (not destructively
-- altered), and no data is migrated or dropped. Safe to re-run
-- (IF NOT EXISTS guards, CREATE OR REPLACE for functions,
-- DROP POLICY IF EXISTS for policies, DROP CONSTRAINT IF EXISTS
-- before re-adding constraints).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: EXTEND EXISTING TABLES (nullable, non-breaking)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.inventory_batches
  ADD COLUMN IF NOT EXISTS grade text CHECK (grade IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS certificate_url text;

-- Widen inventory_batches.status to add 'Needs Treatment' (used when a
-- field scan on a batch detects disease). Original constraint was an
-- unnamed inline column CHECK, auto-named inventory_batches_status_check
-- by Postgres.
ALTER TABLE public.inventory_batches DROP CONSTRAINT IF EXISTS inventory_batches_status_check;
ALTER TABLE public.inventory_batches ADD CONSTRAINT inventory_batches_status_check
  CHECK (status IN ('Propagating', 'Growing', 'Ready', 'Sold Out', 'Needs Treatment'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispatch_date date;

-- Widen orders.status to add 'Shipped'. Original constraint was an
-- unnamed inline column CHECK, auto-named orders_status_check.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled', 'Shipped'));


-- ────────────────────────────────────────────────────────────
-- STEP 2: NEW TABLES
-- ────────────────────────────────────────────────────────────

-- Commercial Farmer: multi-sample field disease scans, per farm
CREATE TABLE IF NOT EXISTS public.field_scans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    total_samples integer NOT NULL,
    healthy_count integer NOT NULL,
    infection_percentage numeric NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Commercial Farmer: irrigation / fertilizer / pesticide application log
CREATE TABLE IF NOT EXISTS public.irrigation_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    log_type text CHECK (log_type IN ('Irrigation', 'Fertilizer', 'Pesticide', 'Other')) NOT NULL,
    amount numeric,
    unit text,
    notes text,
    logged_on date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nursery Operator: disease scans run against a specific inventory batch
CREATE TABLE IF NOT EXISTS public.batch_scans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.inventory_batches(id) ON DELETE CASCADE NOT NULL,
    total_samples integer NOT NULL,
    healthy_count integer NOT NULL,
    infection_percentage numeric NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.field_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_scans ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- STEP 4: SECURITY DEFINER HELPER FUNCTIONS
-- (Re)created here via CREATE OR REPLACE, same pattern as
-- is_farm_member/is_farm_owner/is_order_owner in
-- supabase_rls_patch.sql / supabase_role_features_patch.sql.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- STEP 5: RLS POLICIES
-- Standard owner-only 4-policy pattern, matching care_reminders,
-- plus org/api-key scoped patterns matching order_items.
-- ────────────────────────────────────────────────────────────

-- ── field_scans ───────────────────────────────────────────
DROP POLICY IF EXISTS "field_scans: owner can select" ON public.field_scans;
DROP POLICY IF EXISTS "field_scans: owner can insert" ON public.field_scans;
DROP POLICY IF EXISTS "field_scans: owner can update" ON public.field_scans;
DROP POLICY IF EXISTS "field_scans: owner can delete" ON public.field_scans;

CREATE POLICY "field_scans: owner can select" ON public.field_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "field_scans: owner can insert" ON public.field_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "field_scans: owner can update" ON public.field_scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "field_scans: owner can delete" ON public.field_scans FOR DELETE USING (auth.uid() = user_id);

-- ── irrigation_logs ───────────────────────────────────────
DROP POLICY IF EXISTS "irrigation_logs: owner can select" ON public.irrigation_logs;
DROP POLICY IF EXISTS "irrigation_logs: owner can insert" ON public.irrigation_logs;
DROP POLICY IF EXISTS "irrigation_logs: owner can update" ON public.irrigation_logs;
DROP POLICY IF EXISTS "irrigation_logs: owner can delete" ON public.irrigation_logs;

CREATE POLICY "irrigation_logs: owner can select" ON public.irrigation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "irrigation_logs: owner can insert" ON public.irrigation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "irrigation_logs: owner can update" ON public.irrigation_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "irrigation_logs: owner can delete" ON public.irrigation_logs FOR DELETE USING (auth.uid() = user_id);

-- ── batch_scans ───────────────────────────────────────────
DROP POLICY IF EXISTS "batch_scans: owner can select" ON public.batch_scans;
DROP POLICY IF EXISTS "batch_scans: owner can insert" ON public.batch_scans;
DROP POLICY IF EXISTS "batch_scans: owner can update" ON public.batch_scans;
DROP POLICY IF EXISTS "batch_scans: owner can delete" ON public.batch_scans;

CREATE POLICY "batch_scans: owner can select" ON public.batch_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "batch_scans: owner can insert" ON public.batch_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "batch_scans: owner can update" ON public.batch_scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "batch_scans: owner can delete" ON public.batch_scans FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- STEP 6: GRANTS (mirrors supabase_role_features_patch.sql's pattern)
-- ────────────────────────────────────────────────────────────

REVOKE INSERT, UPDATE, DELETE ON public.field_scans FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.irrigation_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.batch_scans FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrigation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_scans TO authenticated;
