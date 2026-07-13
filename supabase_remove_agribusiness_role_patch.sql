-- ============================================================
-- AgriScan AI - Remove Agribusiness Role Patch
-- Run this after the existing root SQL patch files have been applied.
--
-- This removes only the Agribusiness-specific account type, organization
-- tables, API key tables, audit report tables, and helper functions.
-- Shared Farmer/Nursery/Gardener tables such as farms, field_scans,
-- expenses, farm_tasks, inventory_batches, and batch_scans are untouched.
-- ============================================================

-- Move any existing Agribusiness profiles to the closest remaining
-- commercial workflow before tightening the account_type constraint.
UPDATE public.profiles
SET account_type = 'Farmer'
WHERE account_type = 'Agribusiness';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('Gardener', 'Farmer', 'Nursery'));

DROP TABLE IF EXISTS public.api_usage_logs CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.audit_reports CASCADE;
DROP TABLE IF EXISTS public.organization_farms CASCADE;
DROP TABLE IF EXISTS public.org_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP FUNCTION IF EXISTS public.is_api_key_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_org_member(uuid, text);
DROP FUNCTION IF EXISTS public.is_org_owner(uuid, uuid);
