import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Look up the user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Always return success to prevent email enumeration attacks
    if (!targetUser) {
      return NextResponse.json({ success: true, message: 'If this email is registered, a reset code has been sent.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...targetUser.user_metadata,
        reset_code: resetCode,
        reset_expires: codeExpiry,
      }
    });

    if (updateError) {
      console.error('Failed to store reset code:', updateError);
      return NextResponse.json({ error: 'Failed to initiate password reset.' }, { status: 500 });
    }

    // Send real email
    const emailSent = await sendPasswordResetEmail(normalizedEmail, resetCode);
    if (!emailSent) {
      console.warn(`Password reset email failed for ${normalizedEmail}. Code: ${resetCode}`);
    }

    return NextResponse.json({
      success: true,
      message: 'A password reset code has been sent to your email.',
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
