import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();

    // Fetch the full user data from Supabase Auth admin to get metadata
    const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(user.id);
    if (fetchError || !userData?.user) {
      return NextResponse.json({ error: 'Failed to retrieve user data.' }, { status: 500 });
    }

    const meta = userData.user.user_metadata || {};
    const storedCode: string = meta.verification_code || '';
    const expiresAt: string = meta.verification_expires || '';

    if (!storedCode) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (new Date() > new Date(expiresAt)) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    if (code.trim() !== storedCode) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Mark user as verified and clear verification fields
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        is_verified: true,
        verification_code: null,
        verification_expires: null,
      }
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json({ error: 'Failed to verify account.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email verified successfully.' });
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
