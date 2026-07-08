import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from './supabase';

export interface SupabaseUserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: string;
  location: string;
  units: 'metric' | 'imperial';
  plan: 'Free' | 'Pro' | 'Enterprise';
  isVerified: boolean;
  token: string;
}

// Get authenticated user from request cookie or Authorization header
export async function getSessionUser(req: NextRequest): Promise<SupabaseUserProfile | null> {
  try {
    // 1. Check cookies
    const authCookie = req.cookies.get('agriscan_session')?.value;
    
    // 2. Fallback to Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authCookie || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (!token) return null;
    
    // Create supabase client with this token
    const supabase = getSupabaseServerClient(token);
    
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
        token,
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
      token,
    };
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

// Create a session cookie on response
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set('agriscan_session', token, {
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Required for cross-origin iframe in AI Studio
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

// Clear session cookie
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set('agriscan_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
    path: '/',
  });
}
