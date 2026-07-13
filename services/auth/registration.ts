import { getSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import { sendVerificationEmail } from '@/lib/email';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import type { AccountType } from '@/types/domain';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function signup(input: {
  email: string;
  password: string;
  name: string;
  accountType?: AccountType;
}): Promise<{ email: string }> {
  const { email, password, name, accountType } = input;
  const adminClient = getSupabaseAdminClient();

  // 1. Check if a confirmed account already exists for this email
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (existingProfile) {
    throw new ServiceError('An account with this email already exists.', 400);
  }

  const avatarUrl = `https://picsum.photos/seed/${email.replace(/[^a-zA-Z0-9]/g, '')}/150/150`;

  // 2. Generate 6-digit OTP code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // 3. Send OTP email first — if SMTP fails, we don't save anything in DB
  const emailSent = await sendVerificationEmail(email.toLowerCase(), name, verificationCode);
  if (!emailSent) {
    console.error(`Verification email failed for ${email}.`);
    throw new ServiceError('Failed to send verification email. Please check your SMTP configuration.', 500);
  }

  // 4. Save/Upsert temporary details in pending_signups table
  // This table holds registration details until the user confirms the code.
  const { error: dbError } = await adminClient
    .from('pending_signups')
    .upsert({
      email: email.toLowerCase(),
      password: encryptSecret(password),
      name,
      account_type: accountType || 'Gardener',
      avatar_url: avatarUrl,
      code: verificationCode,
      expires_at: codeExpiry,
    }, { onConflict: 'email' });

  if (dbError) {
    console.error('Failed to store pending signup:', dbError);
    throw new ServiceError('Failed to initiate signup. Please run the updated SQL schema.', 500);
  }

  return { email: email.toLowerCase() };
}

export interface VerifyEmailResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: AccountType;
  location: string;
  units: string;
  plan: string;
  isVerified: boolean;
}

export async function verifyEmail(
  supabase: SupabaseClient,
  code: string,
  email: string
): Promise<VerifyEmailResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const adminClient = getSupabaseAdminClient();

  // Resolve user registration details from pending_signups table
  const { data: pendingData, error: fetchError } = await adminClient
    .from('pending_signups')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (fetchError || !pendingData) {
    console.error('Fetch pending error:', fetchError);
    throw new ServiceError('No pending registration found for this email. Please sign up again.', 400);
  }

  // Verify OTP code
  if (code.trim() !== pendingData.code) {
    throw new ServiceError('Invalid verification code. Please try again.', 400);
  }

  // Verify expiration
  if (new Date() > new Date(pendingData.expires_at)) {
    throw new ServiceError('Verification code has expired. Please sign up again.', 400);
  }

  const plainPassword = decryptSecret(pendingData.password);

  // ── Create user in Supabase Auth as auto-confirmed ────────────────────────
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: plainPassword,
    email_confirm: true, // Automatically confirms the email in auth.users
    user_metadata: {
      name: pendingData.name,
      account_type: pendingData.account_type,
      avatar_url: pendingData.avatar_url,
      is_verified: true, // Marked as verified
    },
  });

  if (createError || !createdUser?.user) {
    console.error('Failed to create verified user:', createError);
    throw new ServiceError(createError?.message || 'Failed to create user account.', 500);
  }

  const userId = createdUser.user.id;

  // ── Delete pending signup record ──────────────────────────────────────────
  await adminClient
    .from('pending_signups')
    .delete()
    .eq('email', normalizedEmail);

  // ── Create database records (farms, notifications) ───────────────────────
  const accountType = pendingData.account_type || 'Gardener';
  const userName = pendingData.name || normalizedEmail.split('@')[0];

  // Create default farm for relevant account types
  if (['Farmer', 'Nursery'].includes(accountType)) {
    const { error: farmError } = await adminClient
      .from('farms')
      .insert({
        name: `${userName}'s Primary Zone`,
        user_id: userId,
        zone_count: 3,
      });
    if (farmError) console.error('Error creating default farm after verify:', farmError);
  }

  // Create welcome notification
  const { error: notifError } = await adminClient
    .from('notifications')
    .insert({
      user_id: userId,
      title: 'Welcome to AgriScan AI! 🌱',
      message: 'Your email is verified. Get started by scanning your first plant leaf or setting up your fields.',
      category: 'System',
      read: false,
    });
  if (notifError) console.error('Error creating welcome notification:', notifError);

  // ── Log the user in so a Supabase session cookie is set ──────────────────
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: plainPassword,
  });

  if (signInError || !signInData?.session) {
    console.error('Auto login after verify failed:', signInError);
    throw new ServiceError('Account verified but session generation failed. Please log in manually.', 500);
  }

  return {
    id: userId,
    email: normalizedEmail,
    name: pendingData.name,
    avatarUrl: pendingData.avatar_url,
    accountType: pendingData.account_type,
    location: '',
    units: 'metric',
    plan: 'Free',
    isVerified: true,
  };
}

export async function resendVerificationCode(email: string): Promise<void> {
  const adminClient = getSupabaseAdminClient();

  // Retrieve the user from pending_signups table
  const { data: pendingData, error: fetchError } = await adminClient
    .from('pending_signups')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchError || !pendingData) {
    throw new ServiceError('No pending registration found for this email. Please sign up first.', 400);
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
    throw new ServiceError('Failed to generate new verification code.', 500);
  }

  // Send the verification email
  const userName = pendingData.name || email.split('@')[0];
  const emailSent = await sendVerificationEmail(email, userName, verificationCode);
  if (!emailSent) {
    console.error(`Resend verification email failed for ${email}. Code: ${verificationCode}`);
    throw new ServiceError('Failed to send verification email. Please check your SMTP configuration.', 500);
  }
}
