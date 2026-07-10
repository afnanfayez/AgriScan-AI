import { NextRequest, NextResponse } from 'next/server';
import { verifyResetCode } from '@/services/auth/password-reset';
import { ServiceError } from '@/services/errors';

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

    const { verifiedToken } = await verifyResetCode(email, code);

    return NextResponse.json({
      success: true,
      verifiedToken,
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
