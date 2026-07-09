import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required to verify.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Resolve user registration details from pending_signups table
    const { data: pendingData, error: fetchError } = await adminClient
      .from('pending_signups')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError || !pendingData) {
      console.error('Fetch pending error:', fetchError);
      return NextResponse.json({ error: 'No pending registration found for this email. Please sign up again.' }, { status: 400 });
    }

    // Verify OTP code
    if (code.trim() !== pendingData.code) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Verify expiration
    if (new Date() > new Date(pendingData.expires_at)) {
      return NextResponse.json({ error: 'Verification code has expired. Please sign up again.' }, { status: 400 });
    }

    // ── Create user in Supabase Auth as auto-confirmed ────────────────────────
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: pendingData.password,
      email_confirm: true, // Automatically confirms the email in auth.users
      user_metadata: {
        name: pendingData.name,
        account_type: pendingData.account_type,
        avatar_url: pendingData.avatar_url,
        is_verified: true, // Marked as verified
      }
    });

    if (createError || !createdUser?.user) {
      console.error('Failed to create verified user:', createError);
      return NextResponse.json({ error: createError?.message || 'Failed to create user account.' }, { status: 500 });
    }

    const userId = createdUser.user.id;

    // ── Delete pending signup record ──────────────────────────────────────────
    await adminClient
      .from('pending_signups')
      .delete()
      .eq('email', normalizedEmail);

    // ── Create database records (farms, notifications) ───────────────────────
    const accountType = pendingData.account_type || 'Gardener';
    const userName = pendingData.name || normalizedEmail.split('@')[0];

    // Create default farm for relevant account types
    if (['Farmer', 'Nursery', 'Agribusiness'].includes(accountType)) {
      const { error: farmError } = await adminClient
        .from('farms')
        .insert({
          name: `${userName}'s Primary Zone`,
          user_id: userId,
          zone_count: 3,
        });
      if (farmError) console.error('Error creating default farm after verify:', farmError);
    }

    // Create welcome notification
    const { error: notifError } = await adminClient
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Welcome to AgriScan AI! 🌱',
        message: 'Your email is verified. Get started by scanning your first plant leaf or setting up your fields.',
        category: 'System',
        read: false,
      });
    if (notifError) console.error('Error creating welcome notification:', notifError);

    // ── Log the user in to retrieve session token ───────────────────────────
    const supabase = getSupabaseServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: pendingData.password,
    });

    if (signInError || !signInData?.session) {
      console.error('Auto login after verify failed:', signInError);
      return NextResponse.json({ error: 'Account verified but session generation failed. Please log in manually.' }, { status: 500 });
    }

    const res = NextResponse.json({
      success: true,
      message: 'Email verified successfully. Welcome to AgriScan AI!',
      user: {
        id: userId,
        email: normalizedEmail,
        name: pendingData.name,
        avatarUrl: pendingData.avatar_url,
        accountType: pendingData.account_type,
        location: '',
        units: 'metric',
        plan: 'Free',
        isVerified: true,
      }
    });

    // Set the session cookie so the user is logged in immediately
    setSessionCookie(res, signInData.session.access_token);

    return res;
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
