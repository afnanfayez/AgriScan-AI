import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationCode } from '@/services/auth/registration';
import { ServiceError } from '@/services/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required to resend verification code.' }, { status: 400 });
    }

    await resendVerificationCode(email);

    return NextResponse.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error: any) {
    console.error('Resend code error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
