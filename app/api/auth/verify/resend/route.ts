import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const adminClient = getSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required to resend verification code.' }, { status: 400 });
    }

    // Retrieve the user from pending_signups table
    const { data: pendingData, error: fetchError } = await adminClient
      .from('pending_signups')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError || !pendingData) {
      return NextResponse.json({ error: 'No pending registration found for this email. Please sign up first.' }, { status: 400 });
    }

    // Generate a new 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Update the pending signup record with the new code and expiry
    const { error: updateError } = await adminClient
      .from('pending_signups')
      .update({
        code: verificationCode,
        expires_at: codeExpiry,
      })
      .eq('email', email);

    if (updateError) {
      console.error('Failed to update resend code:', updateError);
      return NextResponse.json({ error: 'Failed to generate new verification code.' }, { status: 500 });
    }

    // Send the verification email
    const userName = pendingData.name || email.split('@')[0];
    const emailSent = await sendVerificationEmail(email, userName, verificationCode);
    if (!emailSent) {
      console.error(`Resend verification email failed for ${email}. Code: ${verificationCode}`);
      return NextResponse.json({ error: 'Failed to send verification email. Please check your SMTP configuration.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error: any) {
    console.error('Resend code error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
