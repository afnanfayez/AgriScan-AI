import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { confirmPasswordReset } from '@/services/auth/password-reset';
import { ServiceError } from '@/services/errors';

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

    const supabase = await createClient();
    const user = await confirmPasswordReset(supabase, { email, verifiedToken, newPassword });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      user,
    });
  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
