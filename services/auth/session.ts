import { createClient } from '@/utils/supabase/server';
import type { AccountType } from '@/types/domain';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface LoginResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: AccountType;
  location: string;
  units: string;
  plan: string;
  isVerified: boolean;
}

export async function login(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.user || !data.session) {
    throw new ServiceError(error?.message || 'Invalid email or password', 401);
  }

  // Fetch user profile from public.profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const isVerified = data.user.user_metadata?.is_verified ?? false;

  return {
    id: data.user.id,
    email: data.user.email || '',
    name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
    avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || `https://picsum.photos/seed/${data.user.id}/150/150`,
    accountType: profile?.account_type || data.user.user_metadata?.account_type || 'Gardener',
    location: profile?.location || '',
    units: profile?.units || 'metric',
    plan: profile?.plan || 'Free',
    isVerified,
  };
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
