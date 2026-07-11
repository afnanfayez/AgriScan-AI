-- ============================================================
-- AgriScan AI - NEW ROLES SCHEMA PATCH (Commercial Farmer,
-- Nursery Operator, Agribusiness — Phase 0)
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

-- Agribusiness: top-level organization owned by a user
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agribusiness: org membership by email (mirrors team_members' email-based pattern)
CREATE TABLE IF NOT EXISTS public.org_members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    role text CHECK (role IN ('Owner', 'Admin', 'Analyst', 'Viewer')) DEFAULT 'Viewer' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agribusiness: farms aggregated under an organization for portfolio views
CREATE TABLE IF NOT EXISTS public.organization_farms (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(org_id, farm_id)
);

-- Agribusiness: developer API keys for programmatic access
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    label text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    status text CHECK (status IN ('Active', 'Revoked')) DEFAULT 'Active' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    revoked_at timestamp with time zone
);

-- Agribusiness: per-request usage log for api_keys (child table, no direct user_id)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
    endpoint text NOT NULL,
    status_code integer NOT NULL,
    requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agribusiness: compliance / farm audit reports
CREATE TABLE IF NOT EXISTS public.audit_reports (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    title text NOT NULL,
    summary text,
    status text CHECK (status IN ('Draft', 'Final')) DEFAULT 'Draft' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ────────────────────────────────────────────────────────────
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.field_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- STEP 4: SECURITY DEFINER HELPER FUNCTIONS
-- (Re)created here via CREATE OR REPLACE, same pattern as
-- is_farm_member/is_farm_owner/is_order_owner in
-- supabase_rls_patch.sql / supabase_role_features_patch.sql.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_org_owner(org_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.organizations WHERE id = org_uuid AND owner_user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid uuid, user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.org_members WHERE org_id = org_uuid AND email = user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_api_key_owner(key_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.api_keys WHERE id = key_uuid AND user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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

-- ── organizations ─────────────────────────────────────────
DROP POLICY IF EXISTS "organizations: owner can select" ON public.organizations;
DROP POLICY IF EXISTS "organizations: owner can insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations: owner can update" ON public.organizations;
DROP POLICY IF EXISTS "organizations: owner can delete" ON public.organizations;

CREATE POLICY "organizations: owner can select" ON public.organizations FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "organizations: owner can insert" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "organizations: owner can update" ON public.organizations FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "organizations: owner can delete" ON public.organizations FOR DELETE USING (auth.uid() = owner_user_id);

-- ── org_members (org owner manages; owner or member can view) ──
DROP POLICY IF EXISTS "org_members: owner or member can select" ON public.org_members;
DROP POLICY IF EXISTS "org_members: owner can insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members: owner can update" ON public.org_members;
DROP POLICY IF EXISTS "org_members: owner can delete" ON public.org_members;

CREATE POLICY "org_members: owner or member can select"
  ON public.org_members FOR SELECT
  USING (
    public.is_org_owner(org_id, auth.uid())
    OR public.is_org_member(org_id, auth.jwt() ->> 'email')
  );
CREATE POLICY "org_members: owner can insert" ON public.org_members FOR INSERT WITH CHECK (public.is_org_owner(org_id, auth.uid()));
CREATE POLICY "org_members: owner can update" ON public.org_members FOR UPDATE USING (public.is_org_owner(org_id, auth.uid()));
CREATE POLICY "org_members: owner can delete" ON public.org_members FOR DELETE USING (public.is_org_owner(org_id, auth.uid()));

-- ── organization_farms (org owner manages; owner or member can view) ──
DROP POLICY IF EXISTS "organization_farms: owner or member can select" ON public.organization_farms;
DROP POLICY IF EXISTS "organization_farms: owner can insert" ON public.organization_farms;
DROP POLICY IF EXISTS "organization_farms: owner can update" ON public.organization_farms;
DROP POLICY IF EXISTS "organization_farms: owner can delete" ON public.organization_farms;

CREATE POLICY "organization_farms: owner or member can select"
  ON public.organization_farms FOR SELECT
  USING (
    public.is_org_owner(org_id, auth.uid())
    OR public.is_org_member(org_id, auth.jwt() ->> 'email')
  );
CREATE POLICY "organization_farms: owner can insert" ON public.organization_farms FOR INSERT WITH CHECK (public.is_org_owner(org_id, auth.uid()));
CREATE POLICY "organization_farms: owner can update" ON public.organization_farms FOR UPDATE USING (public.is_org_owner(org_id, auth.uid()));
CREATE POLICY "organization_farms: owner can delete" ON public.organization_farms FOR DELETE USING (public.is_org_owner(org_id, auth.uid()));

-- ── api_keys ──────────────────────────────────────────────
DROP POLICY IF EXISTS "api_keys: owner can select" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys: owner can insert" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys: owner can update" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys: owner can delete" ON public.api_keys;

CREATE POLICY "api_keys: owner can select" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys: owner can insert" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys: owner can update" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "api_keys: owner can delete" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- ── api_usage_logs (scoped via parent api_key's owner) ───────
DROP POLICY IF EXISTS "api_usage_logs: owner can select" ON public.api_usage_logs;
DROP POLICY IF EXISTS "api_usage_logs: owner can insert" ON public.api_usage_logs;
DROP POLICY IF EXISTS "api_usage_logs: owner can update" ON public.api_usage_logs;
DROP POLICY IF EXISTS "api_usage_logs: owner can delete" ON public.api_usage_logs;

CREATE POLICY "api_usage_logs: owner can select" ON public.api_usage_logs FOR SELECT USING (public.is_api_key_owner(api_key_id, auth.uid()));
CREATE POLICY "api_usage_logs: owner can insert" ON public.api_usage_logs FOR INSERT WITH CHECK (public.is_api_key_owner(api_key_id, auth.uid()));
CREATE POLICY "api_usage_logs: owner can update" ON public.api_usage_logs FOR UPDATE USING (public.is_api_key_owner(api_key_id, auth.uid()));
CREATE POLICY "api_usage_logs: owner can delete" ON public.api_usage_logs FOR DELETE USING (public.is_api_key_owner(api_key_id, auth.uid()));

-- ── audit_reports ─────────────────────────────────────────
DROP POLICY IF EXISTS "audit_reports: owner can select" ON public.audit_reports;
DROP POLICY IF EXISTS "audit_reports: owner can insert" ON public.audit_reports;
DROP POLICY IF EXISTS "audit_reports: owner can update" ON public.audit_reports;
DROP POLICY IF EXISTS "audit_reports: owner can delete" ON public.audit_reports;

CREATE POLICY "audit_reports: owner can select" ON public.audit_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_reports: owner can insert" ON public.audit_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_reports: owner can update" ON public.audit_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "audit_reports: owner can delete" ON public.audit_reports FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- STEP 6: GRANTS (mirrors supabase_role_features_patch.sql's pattern)
-- ────────────────────────────────────────────────────────────

REVOKE INSERT, UPDATE, DELETE ON public.field_scans FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.irrigation_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.batch_scans FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.organizations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.org_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.organization_farms FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.api_keys FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.api_usage_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.audit_reports FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrigation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_farms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_usage_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_reports TO authenticated;
