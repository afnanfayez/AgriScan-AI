-- ============================================================
-- AgriScan AI - COMPLETE RLS AUDIT & REMEDIATION PATCH
-- Run this in Supabase Dashboard → SQL Editor
-- Generated: 2026-07-08 by full security audit
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: REVOKE OVERLY BROAD GRANTS (if they were applied)
-- The anon role should NOT have INSERT/UPDATE/DELETE on user
-- data tables. RLS + authenticated role handles all mutations.
-- Safe to run even if these grants don't exist.
-- ────────────────────────────────────────────────────────────
-- Note: Supabase's default grants to 'authenticated' and 'anon'
-- via its built-in role setup are fine. Only revoke if you
-- previously ran "grant all privileges on all tables to anon".
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.farms FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.plants FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.scans FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.treatments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.team_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.forum_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.forum_comments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expert_reviews FROM anon;

-- Restore SELECT for anon where needed (public reads)
GRANT SELECT ON public.forum_posts TO anon;
GRANT SELECT ON public.forum_comments TO anon;
GRANT SELECT ON public.diseases_reference TO anon;

-- Full CRUD for authenticated on all tables (scoped by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expert_reviews TO authenticated;
GRANT SELECT ON public.diseases_reference TO authenticated;


-- ────────────────────────────────────────────────────────────
-- STEP 2: DROP & RECREATE ALL RLS POLICIES
-- Full coverage: SELECT / INSERT / UPDATE / DELETE
-- ────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- FIX: Restrict profile SELECT to own row only (not world-readable).
-- Forum features need author_name which is stored in posts directly.
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- No DELETE policy on profiles intentionally — deletion cascades via auth.users


-- ── SECURITY DEFINER FUNCTIONS TO BREAK RECURSION ───────────────────
-- These functions run with bypass RLS to prevent infinite recursion
-- when policy logic recursively queries related tables.

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

-- ── farms ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view farms they own or belong to" ON public.farms;
DROP POLICY IF EXISTS "Users can insert their own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can update their own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can delete their own farms" ON public.farms;
DROP POLICY IF EXISTS "farms: owner or team member can view" ON public.farms;
DROP POLICY IF EXISTS "farms: owner can insert" ON public.farms;
DROP POLICY IF EXISTS "farms: owner can update" ON public.farms;
DROP POLICY IF EXISTS "farms: owner can delete" ON public.farms;

CREATE POLICY "farms: owner or team member can view"
  ON public.farms FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_farm_member(id, auth.jwt() ->> 'email')
  );

CREATE POLICY "farms: owner can insert"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "farms: owner can update"
  ON public.farms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "farms: owner can delete"
  ON public.farms FOR DELETE
  USING (auth.uid() = user_id);


-- ── plants ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view plants they own or have farm access to" ON public.plants;
DROP POLICY IF EXISTS "Users can insert their own plants" ON public.plants;
DROP POLICY IF EXISTS "Users can update their own plants" ON public.plants;
DROP POLICY IF EXISTS "Users can delete their own plants" ON public.plants;
DROP POLICY IF EXISTS "plants: owner or team member can view" ON public.plants;
DROP POLICY IF EXISTS "plants: owner can insert" ON public.plants;
DROP POLICY IF EXISTS "plants: owner can update" ON public.plants;
DROP POLICY IF EXISTS "plants: owner can delete" ON public.plants;

CREATE POLICY "plants: owner or team member can view"
  ON public.plants FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_farm_member(farm_id, auth.jwt() ->> 'email')
  );

CREATE POLICY "plants: owner can insert"
  ON public.plants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plants: owner can update"
  ON public.plants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "plants: owner can delete"
  ON public.plants FOR DELETE
  USING (auth.uid() = user_id);


-- ── scans ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can create their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can delete their own scans" ON public.scans;
DROP POLICY IF EXISTS "scans: owner can select" ON public.scans;
DROP POLICY IF EXISTS "scans: owner can insert" ON public.scans;
DROP POLICY IF EXISTS "scans: owner can update" ON public.scans;
DROP POLICY IF EXISTS "scans: owner can delete" ON public.scans;

-- scans has its own user_id column — use it directly (no join needed)
CREATE POLICY "scans: owner can select"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scans: owner can insert"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: allows diagnosis corrections / future edits
CREATE POLICY "scans: owner can update"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: allows scan removal when plant is deleted by user
CREATE POLICY "scans: owner can delete"
  ON public.scans FOR DELETE
  USING (auth.uid() = user_id);


-- ── treatments ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can update their own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can create their own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can delete their own treatments" ON public.treatments;
DROP POLICY IF EXISTS "treatments: owner can select" ON public.treatments;
DROP POLICY IF EXISTS "treatments: owner can insert" ON public.treatments;
DROP POLICY IF EXISTS "treatments: owner can update" ON public.treatments;
DROP POLICY IF EXISTS "treatments: owner can delete" ON public.treatments;

CREATE POLICY "treatments: owner can select"
  ON public.treatments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "treatments: owner can insert"
  ON public.treatments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "treatments: owner can update"
  ON public.treatments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "treatments: owner can delete"
  ON public.treatments FOR DELETE
  USING (auth.uid() = user_id);


-- ── notes ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can modify their own notes" ON public.notes;
DROP POLICY IF EXISTS "notes: owner can select" ON public.notes;
DROP POLICY IF EXISTS "notes: owner can insert" ON public.notes;
DROP POLICY IF EXISTS "notes: owner can update" ON public.notes;
DROP POLICY IF EXISTS "notes: owner can delete" ON public.notes;

CREATE POLICY "notes: owner can select"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes: owner can insert"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes: owner can update"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notes: owner can delete"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);


-- ── notifications ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications: owner can select" ON public.notifications;
DROP POLICY IF EXISTS "notifications: owner can insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications: owner can update" ON public.notifications;
DROP POLICY IF EXISTS "notifications: owner can delete" ON public.notifications;

CREATE POLICY "notifications: owner can select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: needed so server-side API routes can create notifications on behalf of user
-- The API routes use the user JWT (not service role) so RLS applies
CREATE POLICY "notifications: owner can insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications: owner can update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: owner can delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);


-- ── team_members ──────────────────────────────────────────
DROP POLICY IF EXISTS "Farm owners can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Farm owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "team_members: farm owner can select" ON public.team_members;
DROP POLICY IF EXISTS "team_members: farm owner can insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members: farm owner can update" ON public.team_members;
DROP POLICY IF EXISTS "team_members: farm owner can delete" ON public.team_members;

-- Team members are managed per-farm by the farm owner
CREATE POLICY "team_members: farm owner can select"
  ON public.team_members FOR SELECT
  USING (public.is_farm_owner(farm_id, auth.uid()));

CREATE POLICY "team_members: farm owner can insert"
  ON public.team_members FOR INSERT
  WITH CHECK (public.is_farm_owner(farm_id, auth.uid()));

CREATE POLICY "team_members: farm owner can update"
  ON public.team_members FOR UPDATE
  USING (public.is_farm_owner(farm_id, auth.uid()));

CREATE POLICY "team_members: farm owner can delete"
  ON public.team_members FOR DELETE
  USING (public.is_farm_owner(farm_id, auth.uid()));


-- ── forum_posts ───────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors can update posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors can delete posts" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts: anyone can view" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts: authenticated users can create" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts: authors can update" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts: authors can delete" ON public.forum_posts;

CREATE POLICY "forum_posts: anyone can view"
  ON public.forum_posts FOR SELECT
  USING (true);

CREATE POLICY "forum_posts: authenticated users can create"
  ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_posts: authors can update"
  ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "forum_posts: authors can delete"
  ON public.forum_posts FOR DELETE
  USING (auth.uid() = user_id);


-- ── forum_comments ────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Authors can delete comments" ON public.forum_comments;
DROP POLICY IF EXISTS "Authors can update comments" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments: anyone can view" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments: authenticated users can create" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments: authors can update" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments: authors can delete" ON public.forum_comments;

CREATE POLICY "forum_comments: anyone can view"
  ON public.forum_comments FOR SELECT
  USING (true);

CREATE POLICY "forum_comments: authenticated users can create"
  ON public.forum_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_comments: authors can update"
  ON public.forum_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "forum_comments: authors can delete"
  ON public.forum_comments FOR DELETE
  USING (auth.uid() = user_id);


-- ── expert_reviews ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their expert reviews" ON public.expert_reviews;
DROP POLICY IF EXISTS "Users can request expert reviews" ON public.expert_reviews;
DROP POLICY IF EXISTS "Users can update their expert reviews" ON public.expert_reviews;
DROP POLICY IF EXISTS "expert_reviews: owner can select" ON public.expert_reviews;
DROP POLICY IF EXISTS "expert_reviews: owner can insert" ON public.expert_reviews;
DROP POLICY IF EXISTS "expert_reviews: owner can update" ON public.expert_reviews;
DROP POLICY IF EXISTS "expert_reviews: owner can delete" ON public.expert_reviews;

CREATE POLICY "expert_reviews: owner can select"
  ON public.expert_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "expert_reviews: owner can insert"
  ON public.expert_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expert_reviews: owner can update"
  ON public.expert_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "expert_reviews: owner can delete"
  ON public.expert_reviews FOR DELETE
  USING (auth.uid() = user_id);


-- ── diseases_reference (global read-only reference table) ──
DROP POLICY IF EXISTS "Anyone can view diseases reference" ON public.diseases_reference;
DROP POLICY IF EXISTS "diseases_reference: anyone can view" ON public.diseases_reference;

CREATE POLICY "diseases_reference: anyone can view"
  ON public.diseases_reference FOR SELECT
  USING (true);

-- ── pending_signups (no public access, managed by service_role) ──
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.pending_signups FROM anon;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.pending_signups FROM authenticated;

-- ────────────────────────────────────────────────────────────
-- STEP 3: VERIFY CURRENT POLICY STATE
-- Run this query separately to confirm:
-- ────────────────────────────────────────────────────────────
SELECT tablename, cmd, count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
