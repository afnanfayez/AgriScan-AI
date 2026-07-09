import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

/**
 * POST /api/auth/reset-password/verify
 * Step 2 of the password reset flow.
 * Validates the OTP code only — does NOT change the password yet.
 * Returns a short-lived verification token that the confirm step will use.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!targetUser) {
      return NextResponse.json({ error: 'Invalid code or email.' }, { status: 400 });
    }

    const meta = targetUser.user_metadata || {};
    const storedCode: string = meta.reset_code || '';
    const expiresAt: string = meta.reset_expires || '';

    if (!storedCode) {
      return NextResponse.json({ error: 'No reset code found. Please request a new one.' }, { status: 400 });
    }
    if (new Date() > new Date(expiresAt)) {
      return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 });
    }
    if (code.trim() !== storedCode) {
      return NextResponse.json({ error: 'Invalid reset code. Please try again.' }, { status: 400 });
    }

    // OTP is valid — mark it as verified with a short-lived token so confirm step works
    // We generate a "verified_reset" flag so confirm route knows OTP was already checked
    const verifiedToken = `vrt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    await adminClient.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...meta,
        reset_verified_token: verifiedToken,
        reset_verified_expires: tokenExpiry,
      }
    });

    return NextResponse.json({
      success: true,
      verifiedToken,
      message: 'Code verified. You may now set a new password.',
    });
  } catch (error: any) {
    console.error('Reset verify error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
