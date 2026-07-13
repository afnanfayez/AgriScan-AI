-- ============================================================
-- AgriScan AI - ROLE-SPECIFIC FEATURES SCHEMA PATCH
-- Run this in Supabase Dashboard -> SQL Editor, after
-- supabase_schema.sql has been applied (requires the base
-- profiles/farms/plants/team_members tables to already exist).
--
-- Self-contained: this file (re)creates the is_farm_member/
-- is_farm_owner helper functions itself via CREATE OR REPLACE, so it
-- does NOT assume supabase_rls_patch.sql was ever run against this
-- database - only that the base schema is in place.
--
-- Adds the tables/columns needed so each account_type (Gardener,
-- Farmer and Nursery) gets a genuinely different backend,
-- while reusing the existing profiles.account_type field and farms
-- table as the universal "operation location" for every role.
--
-- Purely additive: no existing table is altered destructively, no
-- data is migrated or dropped. Safe to re-run (IF NOT EXISTS guards,
-- CREATE OR REPLACE for functions, DROP POLICY IF EXISTS for policies).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: EXTEND EXISTING TABLES (nullable, non-breaking)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS acreage numeric,
  ADD COLUMN IF NOT EXISTS crop_type text;

-- Lets the Gardener role's plant notes double as a lightweight photo journal.
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS photo_url text;


-- ────────────────────────────────────────────────────────────
-- STEP 2: NEW TABLES
-- ────────────────────────────────────────────────────────────

-- Hobbyist Gardener: plant care calendar / reminders
CREATE TABLE IF NOT EXISTS public.care_reminders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reminder_type text CHECK (reminder_type IN ('Watering', 'Fertilizing', 'Pruning', 'Repotting', 'Pest Check', 'Custom')) NOT NULL,
    due_date date NOT NULL,
    recurring_days integer,
    notes text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Commercial Farmer: cost/revenue tracking
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    category text CHECK (category IN ('Seed', 'Fertilizer', 'Equipment', 'Labor', 'Water', 'Pesticide', 'Other')) NOT NULL,
    type text CHECK (type IN ('Expense', 'Revenue')) NOT NULL,
    amount numeric NOT NULL,
    description text,
    occurred_on date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Commercial Farmer: equipment tracking
CREATE TABLE IF NOT EXISTS public.equipment (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    name text NOT NULL,
    equipment_type text CHECK (equipment_type IN ('Tractor', 'Irrigation', 'Sprayer', 'Harvester', 'Tool', 'Other')) NOT NULL,
    status text CHECK (status IN ('Operational', 'Maintenance', 'Retired')) DEFAULT 'Operational' NOT NULL,
    purchase_date date,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Commercial Farmer (worker scheduling)
CREATE TABLE IF NOT EXISTS public.farm_tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    assignee_email text,
    title text NOT NULL,
    description text,
    due_date date,
    status text CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nursery Operator: plant batch / propagation / stock tracking
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    plant_type text NOT NULL,
    batch_name text,
    quantity integer DEFAULT 0 NOT NULL,
    unit_price numeric,
    propagation_date date,
    ready_date date,
    status text CHECK (status IN ('Propagating', 'Growing', 'Ready', 'Sold Out')) DEFAULT 'Propagating' NOT NULL,
    low_stock_threshold integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nursery Operator: customer orders
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    customer_name text NOT NULL,
    customer_contact text,
    status text CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled')) DEFAULT 'Pending' NOT NULL,
    total_amount numeric,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nursery Operator: order line items (child of orders, no direct user_id)
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL
);

-- Nursery Operator: supplier tracking
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    contact_info text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Market price trend reference data.
-- Seeded below with illustrative sample data only - not a live feed.
CREATE TABLE IF NOT EXISTS public.market_prices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    crop_type text NOT NULL,
    avg_price numeric NOT NULL,
    unit text NOT NULL,
    region text,
    recorded_on date NOT NULL
);


-- ────────────────────────────────────────────────────────────
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.care_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- STEP 4: SECURITY DEFINER HELPER FUNCTIONS
-- (Re)created here via CREATE OR REPLACE so this file does not
-- depend on supabase_rls_patch.sql having been applied - safe to
-- run whether is_farm_member/is_farm_owner already exist or not.
-- is_order_owner is new: order_items has no user_id column of its
-- own, so it's scoped through its parent order, same pattern.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_farm_member(farm_uuid uuid, user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE farm_id = farm_uuid AND email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_farm_owner(farm_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = farm_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_order_owner(order_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- STEP 5: RLS POLICIES
-- Standard owner-only 4-policy pattern, matching notes/scans/treatments.
-- ────────────────────────────────────────────────────────────

-- ── care_reminders ────────────────────────────────────────
DROP POLICY IF EXISTS "care_reminders: owner can select" ON public.care_reminders;
DROP POLICY IF EXISTS "care_reminders: owner can insert" ON public.care_reminders;
DROP POLICY IF EXISTS "care_reminders: owner can update" ON public.care_reminders;
DROP POLICY IF EXISTS "care_reminders: owner can delete" ON public.care_reminders;

CREATE POLICY "care_reminders: owner can select" ON public.care_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "care_reminders: owner can insert" ON public.care_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "care_reminders: owner can update" ON public.care_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "care_reminders: owner can delete" ON public.care_reminders FOR DELETE USING (auth.uid() = user_id);

-- ── expenses ──────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses: owner can select" ON public.expenses;
DROP POLICY IF EXISTS "expenses: owner can insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses: owner can update" ON public.expenses;
DROP POLICY IF EXISTS "expenses: owner can delete" ON public.expenses;

CREATE POLICY "expenses: owner can select" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses: owner can insert" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses: owner can update" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses: owner can delete" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- ── equipment ─────────────────────────────────────────────
DROP POLICY IF EXISTS "equipment: owner can select" ON public.equipment;
DROP POLICY IF EXISTS "equipment: owner can insert" ON public.equipment;
DROP POLICY IF EXISTS "equipment: owner can update" ON public.equipment;
DROP POLICY IF EXISTS "equipment: owner can delete" ON public.equipment;

CREATE POLICY "equipment: owner can select" ON public.equipment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "equipment: owner can insert" ON public.equipment FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "equipment: owner can update" ON public.equipment FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "equipment: owner can delete" ON public.equipment FOR DELETE USING (auth.uid() = user_id);

-- ── farm_tasks (assignee can also view, per team_members email) ──
DROP POLICY IF EXISTS "farm_tasks: owner or assignee can select" ON public.farm_tasks;
DROP POLICY IF EXISTS "farm_tasks: owner can insert" ON public.farm_tasks;
DROP POLICY IF EXISTS "farm_tasks: owner can update" ON public.farm_tasks;
DROP POLICY IF EXISTS "farm_tasks: owner can delete" ON public.farm_tasks;

CREATE POLICY "farm_tasks: owner or assignee can select"
  ON public.farm_tasks FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_farm_member(farm_id, auth.jwt() ->> 'email')
  );
CREATE POLICY "farm_tasks: owner can insert" ON public.farm_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "farm_tasks: owner can update" ON public.farm_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "farm_tasks: owner can delete" ON public.farm_tasks FOR DELETE USING (auth.uid() = user_id);

-- ── inventory_batches ─────────────────────────────────────
DROP POLICY IF EXISTS "inventory_batches: owner can select" ON public.inventory_batches;
DROP POLICY IF EXISTS "inventory_batches: owner can insert" ON public.inventory_batches;
DROP POLICY IF EXISTS "inventory_batches: owner can update" ON public.inventory_batches;
DROP POLICY IF EXISTS "inventory_batches: owner can delete" ON public.inventory_batches;

CREATE POLICY "inventory_batches: owner can select" ON public.inventory_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inventory_batches: owner can insert" ON public.inventory_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inventory_batches: owner can update" ON public.inventory_batches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inventory_batches: owner can delete" ON public.inventory_batches FOR DELETE USING (auth.uid() = user_id);

-- ── orders ────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders: owner can select" ON public.orders;
DROP POLICY IF EXISTS "orders: owner can insert" ON public.orders;
DROP POLICY IF EXISTS "orders: owner can update" ON public.orders;
DROP POLICY IF EXISTS "orders: owner can delete" ON public.orders;

CREATE POLICY "orders: owner can select" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders: owner can insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders: owner can update" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "orders: owner can delete" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- ── order_items (scoped via parent order's owner) ────────────
DROP POLICY IF EXISTS "order_items: owner can select" ON public.order_items;
DROP POLICY IF EXISTS "order_items: owner can insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items: owner can update" ON public.order_items;
DROP POLICY IF EXISTS "order_items: owner can delete" ON public.order_items;

CREATE POLICY "order_items: owner can select" ON public.order_items FOR SELECT USING (public.is_order_owner(order_id, auth.uid()));
CREATE POLICY "order_items: owner can insert" ON public.order_items FOR INSERT WITH CHECK (public.is_order_owner(order_id, auth.uid()));
CREATE POLICY "order_items: owner can update" ON public.order_items FOR UPDATE USING (public.is_order_owner(order_id, auth.uid()));
CREATE POLICY "order_items: owner can delete" ON public.order_items FOR DELETE USING (public.is_order_owner(order_id, auth.uid()));

-- ── suppliers ─────────────────────────────────────────────
DROP POLICY IF EXISTS "suppliers: owner can select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers: owner can insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers: owner can update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers: owner can delete" ON public.suppliers;

CREATE POLICY "suppliers: owner can select" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "suppliers: owner can insert" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "suppliers: owner can update" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "suppliers: owner can delete" ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

-- ── market_prices (global read-only reference table, like diseases_reference) ──
DROP POLICY IF EXISTS "market_prices: anyone can view" ON public.market_prices;

CREATE POLICY "market_prices: anyone can view"
  ON public.market_prices FOR SELECT
  USING (true);


-- ────────────────────────────────────────────────────────────
-- STEP 6: GRANTS (mirrors supabase_rls_patch.sql's pattern)
-- ────────────────────────────────────────────────────────────

REVOKE INSERT, UPDATE, DELETE ON public.care_reminders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expenses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.equipment FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.farm_tasks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_batches FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.suppliers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.market_prices FROM anon;
GRANT SELECT ON public.market_prices TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT ON public.market_prices TO authenticated;


-- ────────────────────────────────────────────────────────────
-- STEP 7: SAMPLE SEED DATA FOR market_prices
-- Illustrative only - replace with a real price-feed source later.
-- market_prices has no natural unique key (id is a fresh uuid per
-- row), so guard re-runs by only seeding when the table is empty -
-- otherwise re-running this file would insert duplicate demo rows.
-- ────────────────────────────────────────────────────────────

INSERT INTO public.market_prices (crop_type, avg_price, unit, region, recorded_on)
SELECT * FROM (VALUES
  ('Tomato', 2.35, 'per lb', 'Central Valley, CA', CURRENT_DATE),
  ('Rose', 1.80, 'per stem', 'Central Valley, CA', CURRENT_DATE),
  ('Banana', 0.65, 'per lb', 'Central Valley, CA', CURRENT_DATE),
  ('Lettuce', 1.20, 'per lb', 'Central Valley, CA', CURRENT_DATE),
  ('Wheat', 6.80, 'per bushel', 'Midwest, US', CURRENT_DATE)
) AS seed(crop_type, avg_price, unit, region, recorded_on)
WHERE NOT EXISTS (SELECT 1 FROM public.market_prices);
