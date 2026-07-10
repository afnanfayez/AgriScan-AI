import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyEmail } from '@/services/auth/registration';
import { ServiceError } from '@/services/errors';

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required to verify.' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await verifyEmail(supabase, code, email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. Welcome to AgriScan AI!',
      user,
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
