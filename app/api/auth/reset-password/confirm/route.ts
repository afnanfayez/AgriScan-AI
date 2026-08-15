import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { confirmPasswordReset } from '@/services/auth/password-reset';
import { ServiceError } from '@/services/errors';

/**
 * POST /api/auth/reset-password/confirm
 * Step 3 of the password reset flow.
 *
 * Authorization comes from the Supabase recovery session that /verify
 * established, so the only input needed is the new password. The user stays
 * logged in on that session afterwards.
 */
export async function POST(req: NextRequest) {
  try {
    const { newPassword } = await req.json();

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'A new password is required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await confirmPasswordReset(supabase, { newPassword });

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
