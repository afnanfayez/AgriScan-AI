import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, accountType } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();

    // 1. Check if user already exists in auth.users
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers();
    const alreadyExists = existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (alreadyExists) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const avatarUrl = `https://picsum.photos/seed/${email.replace(/[^a-zA-Z0-9]/g, '')}/150/150`;

    // 2. Generate 6-digit OTP code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // 3. Send OTP email first — if SMTP fails, we don't save anything in DB
    const emailSent = await sendVerificationEmail(email.toLowerCase(), name, verificationCode);
    if (!emailSent) {
      console.error(`Verification email failed for ${email}.`);
      return NextResponse.json({ error: 'Failed to send verification email. Please check your SMTP configuration.' }, { status: 500 });
    }

    // 4. Save/Upsert temporary details in pending_signups table
    // This table holds registration details until the user confirms the code.
    const { error: dbError } = await adminClient
      .from('pending_signups')
      .upsert({
        email: email.toLowerCase(),
        password,
        name,
        account_type: accountType || 'Gardener',
        avatar_url: avatarUrl,
        code: verificationCode,
        expires_at: codeExpiry,
      }, { onConflict: 'email' });

    if (dbError) {
      console.error('Failed to store pending signup:', dbError);
      return NextResponse.json({ error: 'Failed to initiate signup. Please run the updated SQL schema.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'A verification code has been sent to your email.',
      email: email.toLowerCase(),
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
