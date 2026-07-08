import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const adminClient = getSupabaseAdminClient();

    // Fetch the full user data from Supabase Auth admin to get metadata
    const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(user.id);
    if (fetchError || !userData?.user) {
      return NextResponse.json({ error: 'Failed to retrieve user data.' }, { status: 500 });
    }

    const meta = userData.user.user_metadata || {};

    // Generate a new 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        is_verified: false,
        verification_code: verificationCode,
        verification_expires: codeExpiry,
      }
    });

    if (updateError) {
      return NextResponse.json({ error: 'Failed to generate new verification code.' }, { status: 500 });
    }

    // Send real email
    const userName = meta.name || user.email?.split('@')[0] || 'User';
    const emailSent = await sendVerificationEmail(user.email, userName, verificationCode);
    if (!emailSent) {
      console.warn(`Resend verification email failed for ${user.email}. Code: ${verificationCode}`);
    }

    return NextResponse.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error: any) {
    console.error('Resend code error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
