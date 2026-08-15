import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyResetCode } from '@/services/auth/password-reset';
import { ServiceError } from '@/services/errors';

/**
 * POST /api/auth/reset-password/verify
 * Step 2 of the password reset flow.
 *
 * Validates the OTP only - it does not change the password. On success Supabase
 * establishes a recovery session in cookies, and that session is what
 * authorizes step 3. Nothing is handed back to the client to replay.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const supabase = await createClient();
    await verifyResetCode(supabase, email, code);

    return NextResponse.json({
      success: true,
      message: 'Code verified. You may now set a new password.',
    });
  } catch (error: any) {
    console.error('Reset verify error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
