-- Billing patch: real Stripe-backed subscriptions + Gemini usage metering.
-- Run after supabase_schema.sql and supabase_rls_patch.sql.
--
-- `profiles.plan` remains the fast-read cache used everywhere in the app
-- (lib/auth.ts getSessionUser()), but from here on the ONLY writer of that
-- column is the Stripe webhook handler (services/billing-service.ts), via
-- the service-role admin client. Neither table below grants `authenticated`
-- any insert/update path that could self-grant a paid plan.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_price_id text,
  plan text not null default 'Free' check (plan in ('Free', 'Pro', 'Enterprise')),
  status text not null default 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "select own subscription" on public.subscriptions;
create policy "select own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Intentionally no insert/update/delete policy for `authenticated`.
-- Only the service-role key (checkout/portal/webhook routes) may write here.
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'scan' check (kind in ('scan', 'field_scan', 'batch_scan')),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_period_idx on public.usage_events (user_id, created_at);

alter table public.usage_events enable row level security;

drop policy if exists "select own usage" on public.usage_events;
create policy "select own usage" on public.usage_events
  for select using (auth.uid() = user_id);

drop policy if exists "insert own usage" on public.usage_events;
create policy "insert own usage" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Intentionally no update/delete policy: usage_events is an append-only
-- audit log, so a user cannot erase their own usage to dodge the quota.
grant select, insert on public.usage_events to authenticated;
grant all on public.usage_events to service_role;
