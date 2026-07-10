import { NextRequest, NextResponse } from 'next/server';
import { signup } from '@/services/auth/registration';
import { ServiceError } from '@/services/errors';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, accountType } = await req.json();

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string' || !name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const result = await signup({ email, password, name, accountType });

    return NextResponse.json({
      success: true,
      message: 'A verification code has been sent to your email.',
      email: result.email,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
