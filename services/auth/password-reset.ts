import { getSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email';
import { ServiceError } from '../errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const ANTI_ENUMERATION_MESSAGE = 'If this email is registered, a reset code has been sent.';

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const adminClient = getSupabaseAdminClient();

  // Look up the user by email via the indexed profiles table
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  // Always return success to prevent email enumeration attacks
  if (!targetProfile) {
    return { message: ANTI_ENUMERATION_MESSAGE };
  }

  const { data: targetUserData, error: getUserError } = await adminClient.auth.admin.getUserById(targetProfile.id);
  if (getUserError || !targetUserData?.user) {
    return { message: ANTI_ENUMERATION_MESSAGE };
  }
  const targetUser = targetUserData.user;

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
    user_metadata: {
      ...targetUser.user_metadata,
      reset_code: resetCode,
      reset_expires: codeExpiry,
    },
  });

  if (updateError) {
    console.error('Failed to store reset code:', updateError);
    throw new ServiceError('Failed to initiate password reset.', 500);
  }

  // Send real email
  const emailSent = await sendPasswordResetEmail(normalizedEmail, resetCode);
  if (!emailSent) {
    console.error(`Password reset email failed for ${normalizedEmail}. Code: ${resetCode}`);
    throw new ServiceError('Failed to send password reset email. Please check your SMTP configuration.', 500);
  }

  return { message: 'A password reset code has been sent to your email.' };
}

export async function verifyResetCode(email: string, code: string): Promise<{ verifiedToken: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const adminClient = getSupabaseAdminClient();

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (!targetProfile) {
    throw new ServiceError('Invalid code or email.', 400);
  }

  const { data: targetUserData, error: getUserError } = await adminClient.auth.admin.getUserById(targetProfile.id);
  if (getUserError || !targetUserData?.user) {
    throw new ServiceError('Invalid code or email.', 400);
  }
  const targetUser = targetUserData.user;

  const meta = targetUser.user_metadata || {};
  const storedCode: string = meta.reset_code || '';
  const expiresAt: string = meta.reset_expires || '';

  if (!storedCode) {
    throw new ServiceError('No reset code found. Please request a new one.', 400);
  }
  if (new Date() > new Date(expiresAt)) {
    throw new ServiceError('Reset code has expired. Please request a new one.', 400);
  }
  if (code.trim() !== storedCode) {
    throw new ServiceError('Invalid reset code. Please try again.', 400);
  }

  // OTP is valid — mark it as verified with a short-lived token so confirm step works
  // We generate a "verified_reset" flag so confirm route knows OTP was already checked
  const verifiedToken = `vrt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await adminClient.auth.admin.updateUserById(targetUser.id, {
    user_metadata: {
      ...meta,
      reset_verified_token: verifiedToken,
      reset_verified_expires: tokenExpiry,
    },
  });

  return { verifiedToken };
}

export interface ConfirmResetResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: string;
  location: string;
  units: string;
  plan: string;
  isVerified: boolean;
}

export async function confirmPasswordReset(
  supabase: SupabaseClient,
  input: { email: string; verifiedToken: string; newPassword: string }
): Promise<ConfirmResetResult | null> {
  const { verifiedToken, newPassword } = input;
  const normalizedEmail = input.email.toLowerCase().trim();
  const adminClient = getSupabaseAdminClient();

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (!targetProfile) {
    throw new ServiceError('User not found.', 400);
  }

  const { data: targetUserData, error: getUserError } = await adminClient.auth.admin.getUserById(targetProfile.id);
  if (getUserError || !targetUserData?.user) {
    throw new ServiceError('User not found.', 400);
  }
  const targetUser = targetUserData.user;

  const meta = targetUser.user_metadata || {};

  // Validate the verified token from the OTP step
  if (!meta.reset_verified_token || meta.reset_verified_token !== verifiedToken) {
    throw new ServiceError('Invalid or expired session. Please restart the reset process.', 400);
  }
  if (new Date() > new Date(meta.reset_verified_expires || '')) {
    throw new ServiceError('Reset session expired. Please restart the reset process.', 400);
  }

  // Update password and clear all reset metadata
  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
    password: newPassword,
    user_metadata: {
      ...meta,
      is_verified: true,
      reset_code: null,
      reset_expires: null,
      reset_verified_token: null,
      reset_verified_expires: null,
    },
  });

  if (updateError) {
    console.error('Failed to update password:', updateError);
    throw new ServiceError('Failed to reset password. Please try again.', 500);
  }

  // Auto sign-in with the new password
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: newPassword,
  });

  return signInData?.user
    ? {
        id: signInData.user.id,
        email: signInData.user.email || '',
        name: signInData.user.user_metadata?.name || '',
        avatarUrl: signInData.user.user_metadata?.avatar_url || '',
        accountType: signInData.user.user_metadata?.account_type || 'Gardener',
        location: '',
        units: 'metric',
        plan: 'Free',
        isVerified: true,
      }
    : null;
}
