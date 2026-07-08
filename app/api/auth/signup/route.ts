import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase';
import { setSessionCookie } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, accountType } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const avatarUrl = `https://picsum.photos/seed/${email.replace(/[^a-zA-Z0-9]/g, '')}/150/150`;

    // Generate random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name,
          account_type: accountType || 'Gardener',
          avatar_url: avatarUrl,
          is_verified: false,
          verification_code: verificationCode,
          verification_expires: codeExpiry
        }
      }
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Signup failed' }, { status: 400 });
    }

    const userId = data.user.id;
    const adminClient = getSupabaseAdminClient();

    // Create a default farm/field for Farmers/Nurseries
    if (accountType === 'Farmer' || accountType === 'Nursery' || accountType === 'Agribusiness') {
      const { error: farmError } = await adminClient
        .from('farms')
        .insert({
          name: `${name}'s Primary Zone`,
          user_id: userId,
          zone_count: 3,
        });
      if (farmError) console.error('Error creating default farm:', farmError);
    }

    // Add welcome notification
    const { error: notifError } = await adminClient
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Welcome to AgriScan AI!',
        message: 'Get started by scanning your first plant leaf or setting up your fields.',
        category: 'System',
        read: false,
      });
    if (notifError) console.error('Error creating welcome notification:', notifError);

    // Send real verification email
    const emailSent = await sendVerificationEmail(email.toLowerCase(), name, verificationCode);
    if (!emailSent) {
      console.warn(`Verification email could not be sent to ${email}. Code logged below.`);
      console.log(`\n======================================================\n===> SIGNUP OTP FOR ${email}: ${verificationCode}\n======================================================\n`);
    }

    const userObj = {
      id: userId,
      email: email.toLowerCase(),
      name,
      avatarUrl,
      accountType: accountType || 'Gardener',
      location: '',
      units: 'metric',
      plan: 'Free',
      isVerified: false,
    };

    const res = NextResponse.json({
      success: true,
      user: userObj,
    });

    if (data.session) {
      setSessionCookie(res, data.session.access_token);
    } else {
      // Auto login to get the access token
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (signInData.session) {
        setSessionCookie(res, signInData.session.access_token);
      }
    }

    return res;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
