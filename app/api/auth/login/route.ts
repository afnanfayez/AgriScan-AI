import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: error?.message || 'Invalid email or password' }, { status: 401 });
    }

    // Fetch user profile from public.profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const userObj = {
      id: data.user.id,
      email: data.user.email || '',
      name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
      avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || `https://picsum.photos/seed/${data.user.id}/150/150`,
      accountType: profile?.account_type || data.user.user_metadata?.account_type || 'Gardener',
      location: profile?.location || '',
      units: profile?.units || 'metric',
      plan: profile?.plan || 'Free',
    };

    const res = NextResponse.json({
      success: true,
      user: userObj,
    });

    setSessionCookie(res, data.session.access_token);
    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
