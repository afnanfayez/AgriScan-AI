import { getSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import type { AccountType } from '@/types/domain';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const ANTI_ENUMERATION_MESSAGE = 'If this email is registered, a reset code has been sent.';

/**
 * Password reset runs on Supabase Auth's recovery OTP rather than an
 * app-generated code stored in user_metadata and delivered over our own SMTP
 * transport. Supabase sends the "Reset password" template, which must contain
 * {{ .Token }} to render a 6-digit code (see docs/auth-emails.md).
 *
 * The security model changed with it, for the better: verifying the OTP now
 * establishes a real Supabase recovery *session* (a cookie), and that session
 * is what authorizes the password change. The previous flow minted its own
 * `reset_verified_token`, stored it in user_metadata, and trusted the client to
 * hand it back - so the callers no longer pass a token around at all.
 */

function isRateLimited(error: { message?: string; status?: number } | null): boolean {
  return !!error && (error.status === 429 || /rate limit/i.test(error.message || ''));
}

const RATE_LIMIT_ERROR = () =>
  new ServiceError('Too many email requests. Please wait a minute before trying again.', 429, {
    code: 'email_rate_limited',
  });

export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string
): Promise<{ message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

  if (isRateLimited(error)) {
    throw RATE_LIMIT_ERROR();
  }

  if (error) {
    // Supabase already provides the anti-enumeration guarantee here: an address
    // that is not registered comes back as SUCCESS, not as an error. So any
    // error we receive is a genuine system failure - almost always SMTP not
    // being configured, or the provider rejecting the send - and reporting
    // "a code has been sent" over the top of it makes a broken email setup
    // impossible to diagnose from the outside.
    console.error('Password reset email failed to send:', {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    throw new ServiceError(
      'We could not send the reset code. The email service is not configured correctly - check the Supabase SMTP settings and Auth logs.',
      502,
      { code: 'email_send_failed' }
    );
  }

  return { message: ANTI_ENUMERATION_MESSAGE };
}

/**
 * Verifies the recovery OTP. On success the recovery session is written to
 * cookies by the SSR client, which is what confirmPasswordReset() then relies
 * on - no token is returned to the caller.
 */
export async function verifyResetCode(
  supabase: SupabaseClient,
  email: string,
  code: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: code.trim(),
    type: 'recovery',
  });

  if (isRateLimited(error)) {
    throw RATE_LIMIT_ERROR();
  }

  if (error || !data?.session) {
    console.error('Reset OTP verification failed:', { status: error?.status, message: error?.message });
    throw new ServiceError(
      /expired/i.test(error?.message || '')
        ? 'Reset code has expired. Please request a new one.'
        : 'Invalid reset code. Please try again.',
      400
    );
  }
}

export interface ConfirmResetResult {
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

/**
 * Sets the new password using the recovery session established by
 * verifyResetCode(). The session IS the proof that the OTP was verified, so
 * there is nothing else to validate.
 */
export async function confirmPasswordReset(
  supabase: SupabaseClient,
  input: { newPassword: string }
): Promise<ConfirmResetResult | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !sessionData?.user) {
    throw new ServiceError(
      'Reset session expired or missing. Please restart the reset process.',
      400
    );
  }

  const user = sessionData.user;

  const { error: updateError } = await supabase.auth.updateUser({ password: input.newPassword });

  if (isRateLimited(updateError)) {
    throw RATE_LIMIT_ERROR();
  }

  if (updateError) {
    console.error('Failed to update password:', { status: updateError.status, message: updateError.message });
    throw new ServiceError(
      // Supabase rejects reusing the current password on projects that require it.
      /different from the old password/i.test(updateError.message || '')
        ? 'Your new password must be different from your current one.'
        : 'Failed to reset password. Please try again.',
      400
    );
  }

  // Recovery sessions leave the account confirmed; mirror that in the metadata
  // flag the rest of the app reads.
  const meta = user.user_metadata || {};
  const adminClient = getSupabaseAdminClient();
  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, is_verified: true },
  });

  const { data: profile } = await adminClient
    .from('profiles')
    .select('name, avatar_url, account_type, location, units, plan')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || '',
    name: profile?.name || meta.name || '',
    avatarUrl: profile?.avatar_url || meta.avatar_url || '',
    accountType: (profile?.account_type as AccountType) || meta.account_type || 'Gardener',
    location: profile?.location || '',
    units: profile?.units || 'metric',
    plan: profile?.plan || 'Free',
    isVerified: true,
  };
}
