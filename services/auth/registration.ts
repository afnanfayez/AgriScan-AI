import { getSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import type { AccountType } from '@/types/domain';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Signup verification runs on Supabase Auth's own email OTP rather than an
 * app-generated code delivered over our own SMTP transport. Supabase sends the
 * "Confirm signup" template, which must contain {{ .Token }} to render a
 * 6-digit code (see docs/auth-emails.md).
 *
 * Consequences of that change, both deliberate:
 *  - The account row is created immediately as unconfirmed instead of being
 *    parked in a `pending_signups` table, so we no longer hold a reversibly
 *    encrypted password at rest waiting for the user to type a code.
 *  - The `on_auth_user_created` trigger therefore creates the public.profiles
 *    row at signup time, not at verification time - so "does an account exist"
 *    has to ask whether the auth user is *confirmed*, not whether a profile row
 *    is present.
 */

/** Resolves the auth user behind an email, or null. Uses the indexed profiles
 *  table rather than paginating auth.admin.listUsers(). */
async function findAuthUserByEmail(
  adminClient: ReturnType<typeof getSupabaseAdminClient>,
  email: string
) {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) return null;

  const { data, error } = await adminClient.auth.admin.getUserById(profile.id);
  if (error || !data?.user) return null;
  return data.user;
}

/** Supabase surfaces send-rate limiting as a 429; everything else is ours to phrase. */
function describeAuthError(error: { message?: string; status?: number } | null, fallback: string): ServiceError {
  const message = error?.message || '';

  if (error?.status === 429 || /rate limit/i.test(message)) {
    return new ServiceError(
      'Too many email requests. Please wait a minute before trying again.',
      429,
      { code: 'email_rate_limited' }
    );
  }

  // Supabase reports SMTP problems as "Error sending confirmation email". Name
  // the actual cause so this is not mistaken for a bad password or address.
  if (/error sending/i.test(message)) {
    return new ServiceError(
      'We could not send the verification code. The email service is not configured correctly - check the Supabase SMTP settings and Auth logs.',
      502,
      { code: 'email_send_failed' }
    );
  }

  return new ServiceError(message || fallback, error?.status && error.status < 500 ? error.status : 500);
}

export async function signup(
  supabase: SupabaseClient,
  input: {
    email: string;
    password: string;
    name: string;
    accountType?: AccountType;
  }
): Promise<{ email: string }> {
  const email = input.email.toLowerCase().trim();
  const adminClient = getSupabaseAdminClient();

  // Only a *confirmed* account blocks signup. An unconfirmed one means the user
  // abandoned the flow earlier; signUp below resends their code rather than
  // leaving them permanently stuck on "email already exists".
  const existing = await findAuthUserByEmail(adminClient, email);
  if (existing?.email_confirmed_at) {
    throw new ServiceError('An account with this email already exists.', 400);
  }

  const avatarUrl = `https://picsum.photos/seed/${email.replace(/[^a-zA-Z0-9]/g, '')}/150/150`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      // Read by the on_auth_user_created trigger to populate public.profiles.
      data: {
        name: input.name,
        account_type: input.accountType || 'Gardener',
        avatar_url: avatarUrl,
        is_verified: false,
      },
    },
  });

  if (error) {
    console.error('Signup failed:', { status: error.status, message: error.message });
    throw describeAuthError(error, 'Failed to start signup. Please try again.');
  }

  // A session here means Supabase's "Confirm email" is OFF: it auto-confirmed
  // the account and sent no code. Left alone this fails in a way that looks
  // like an email problem but is not - the SSR client has already written
  // session cookies, so the browser is now authenticated, and middleware
  // bounces /register straight to /dashboard. The user lands on the dashboard
  // wondering where their code went, holding an account that was never
  // verified.
  if (data.session) {
    await supabase.auth.signOut();

    // `existing` was null above, so this account did not exist before this
    // request - it is purely an artifact of the misconfiguration. Removing it
    // keeps the error message honest and lets the same address retry once the
    // setting is fixed, instead of hitting "an account already exists".
    if (!existing && data.user) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);
      if (cleanupError) {
        console.error('Failed to remove auto-confirmed signup:', cleanupError.message);
      }
    }

    console.error('Signup blocked: Supabase "Confirm email" is disabled', {
      email,
      hint: 'Authentication -> Sign In / Providers -> Email -> Confirm email',
    });

    throw new ServiceError(
      'Email verification is turned off for this project, so no code was sent. Enable "Confirm email" in Supabase under Authentication → Sign In / Providers → Email, then try again.',
      503,
      { code: 'email_confirmation_disabled' }
    );
  }

  return { email };
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

  // Consumes the OTP and establishes the session cookie in one step - this
  // replaces the previous "look up pending row, compare strings, then create
  // the user and sign in with the decrypted password" sequence.
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: code.trim(),
    type: 'signup',
  });

  if (error || !data?.user || !data?.session) {
    console.error('Signup OTP verification failed:', { status: error?.status, message: error?.message });
    if (error?.status === 429 || /rate limit/i.test(error?.message || '')) {
      throw describeAuthError(error, 'Verification failed.');
    }
    throw new ServiceError(
      /expired/i.test(error?.message || '')
        ? 'Verification code has expired. Request a new one.'
        : 'Invalid verification code. Please try again.',
      400
    );
  }

  const user = data.user;
  const meta = user.user_metadata || {};
  const accountType: AccountType = meta.account_type || 'Gardener';
  const name: string = meta.name || normalizedEmail.split('@')[0];
  const avatarUrl: string = meta.avatar_url || '';

  const adminClient = getSupabaseAdminClient();

  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, is_verified: true },
  });

  // Default farm for account types that need one. Safe against double-runs:
  // the OTP is consumed above, so a replayed request never reaches this.
  if (['Farmer', 'Nursery'].includes(accountType)) {
    const { error: farmError } = await adminClient
      .from('farms')
      .insert({ name: `${name}'s Primary Zone`, user_id: user.id, zone_count: 3 });
    if (farmError) console.error('Error creating default farm after verify:', farmError);
  }

  const { error: notifError } = await adminClient.from('notifications').insert({
    user_id: user.id,
    title: 'Welcome to AgriScan AI! 🌱',
    message:
      'Your email is verified. Get started by scanning your first plant leaf or setting up your fields.',
    category: 'System',
    read: false,
  });
  if (notifError) console.error('Error creating welcome notification:', notifError);

  const { data: profile } = await adminClient
    .from('profiles')
    .select('location, units, plan')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: normalizedEmail,
    name,
    avatarUrl,
    accountType,
    location: profile?.location || '',
    units: profile?.units || 'metric',
    plan: profile?.plan || 'Free',
    isVerified: true,
  };
}

export async function resendVerificationCode(supabase: SupabaseClient, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabase.auth.resend({ type: 'signup', email: normalizedEmail });

  if (error) {
    console.error('Resend verification failed:', {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    if (error.status === 429 || /rate limit/i.test(error.message || '')) {
      throw describeAuthError(error, 'Failed to resend the verification code.');
    }

    // A 5xx (or an explicit "error sending") is the email service failing, not
    // the address being wrong. Reporting "no pending registration" for that
    // sends the operator hunting in entirely the wrong place.
    if ((error.status ?? 500) >= 500 || /error sending/i.test(error.message || '')) {
      throw new ServiceError(
        'We could not send the verification code. The email service is not configured correctly - check the Supabase SMTP settings and Auth logs.',
        502,
        { code: 'email_send_failed' }
      );
    }

    // Supabase rejects a resend when there is nothing pending for the address.
    throw new ServiceError(
      'No pending registration found for this email. Please sign up first.',
      400
    );
  }
}
