import { createClient } from '@/utils/supabase/server';
import type { AccountType } from '@/types/domain';

export interface SupabaseUserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: AccountType;
  location: string;
  units: 'metric' | 'imperial';
  plan: 'Free' | 'Pro' | 'Enterprise';
  isVerified: boolean;
}

// Get the authenticated user for the current request, from the Supabase session cookie.
export async function getSessionUser(): Promise<SupabaseUserProfile | null> {
  try {
    const supabase = await createClient();

    // Retrieve authenticated user from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const isVerified = user.user_metadata?.is_verified ?? false;
    
    // Fetch user profile from public.profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      // Fallback if profile row is not yet created/propagated
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        avatarUrl: user.user_metadata?.avatar_url || `https://picsum.photos/seed/${user.id}/150/150`,
        accountType: user.user_metadata?.account_type || 'Gardener',
        location: '',
        units: 'metric',
        plan: 'Free',
        isVerified,
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || '',
      avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${profile.id}/150/150`,
      accountType: profile.account_type || 'Gardener',
      location: profile.location || '',
      units: profile.units || 'metric',
      plan: profile.plan || 'Free',
      isVerified,
    };
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}
