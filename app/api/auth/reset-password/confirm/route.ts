import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are all required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Look up the user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!targetUser) {
      return NextResponse.json({ error: 'Invalid reset code or email.' }, { status: 400 });
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

    // Update the password and clear reset fields
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      user_metadata: {
        ...meta,
        is_verified: true, // Mark as verified since they confirmed email via reset code
        reset_code: null,
        reset_expires: null,
      }
    });

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
