import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Plan = 'Free' | 'Pro' | 'Enterprise';

export type UsageKind = 'scan' | 'field_scan' | 'batch_scan';

// Single source of truth for what each subscription tier gets: how many
// Gemini analyses per calendar month, and which models are tried (in order)
// for that tier. `monthlyScans: null` means unlimited.
export const PLAN_LIMITS: Record<Plan, { monthlyScans: number | null; modelChain: string[] }> = {
  Free: {
    monthlyScans: 5,
    modelChain: ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  },
  Pro: {
    monthlyScans: null,
    modelChain: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  },
  Enterprise: {
    monthlyScans: null,
    modelChain: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
  },
};

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Throws a 429 ServiceError if recording `weight` more Gemini analyses this
// calendar month would put the user over their plan's quota. `weight` lets
// batch/field scans check `images.length` in one call before spending any
// Gemini calls.
export async function assertWithinQuota(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  weight: number = 1
): Promise<void> {
  const limit = PLAN_LIMITS[user.plan].monthlyScans;
  if (limit === null) return;

  const { count, error } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfCurrentMonthIso());

  if (error) {
    console.error('Error checking usage quota:', error);
    throw new ServiceError(error.message, 500);
  }

  const used = count ?? 0;
  if (used + weight > limit) {
    throw new ServiceError(
      `Your ${user.plan} plan includes ${limit} AI scans per month and you've used ${used}. Upgrade to Pro or Enterprise for unlimited scans.`,
      429
    );
  }
}

export async function recordUsage(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  kind: UsageKind,
  count: number = 1
): Promise<void> {
  if (count <= 0) return;
  const rows = Array.from({ length: count }, () => ({ user_id: user.id, kind }));
  const { error } = await supabase.from('usage_events').insert(rows);
  if (error) console.error('Error recording usage event:', error);
}
