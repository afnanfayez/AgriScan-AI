import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';

/**
 * POST /api/auth/reset-password/confirm
 * Step 3 of the password reset flow.
 * Accepts the verifiedToken from /verify and the new password.
 * Updates the password and auto-logs the user in.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, verifiedToken, newPassword } = await req.json();

    if (!email || !verifiedToken || !newPassword) {
      return NextResponse.json({ error: 'Email, verified token, and new password are all required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 400 });
    }

    const meta = targetUser.user_metadata || {};

    // Validate the verified token from the OTP step
    if (!meta.reset_verified_token || meta.reset_verified_token !== verifiedToken) {
      return NextResponse.json({ error: 'Invalid or expired session. Please restart the reset process.' }, { status: 400 });
    }
    if (new Date() > new Date(meta.reset_verified_expires || '')) {
      return NextResponse.json({ error: 'Reset session expired. Please restart the reset process.' }, { status: 400 });
    }

    // Update password and clear all reset metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      user_metadata: {
        ...meta,
        is_verified: true,
        reset_code: null,
        reset_expires: null,
        reset_verified_token: null,
        reset_verified_expires: null,
      }
    });

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
    }

    // Auto sign-in with the new password
    const supabase = getSupabaseServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: newPassword,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      user: signInData?.user ? {
        id: signInData.user.id,
        email: signInData.user.email,
        name: signInData.user.user_metadata?.name || '',
        avatarUrl: signInData.user.user_metadata?.avatar_url || '',
        accountType: signInData.user.user_metadata?.account_type || 'Gardener',
        location: '',
        units: 'metric',
        plan: 'Free',
        isVerified: true,
      } : null,
    });

    if (signInData?.session && !signInError) {
      setSessionCookie(res, signInData.session.access_token);
    }

    return res;
  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
