/**
 * How many digits the auth OTP inputs expect.
 *
 * This MUST match Supabase's "Email OTP length" setting
 * (Authentication -> Sign In / Providers -> Email). A mismatch is silent and
 * very hard to diagnose: if the dashboard issues an 8-digit code while the UI
 * only accepts 6, the user physically cannot type the whole thing, a truncated
 * token reaches GoTrue, and it answers `otp_expired` - "token has expired or is
 * invalid" - which reads like an expiry problem even when the code is seconds
 * old.
 *
 * Overridable so the two can be aligned without a code change:
 *   NEXT_PUBLIC_AUTH_OTP_LENGTH=8
 *
 * Supabase permits 6-10 digits; anything outside that (or unset) falls back to
 * 6, which is the Supabase default.
 */
const DEFAULT_OTP_LENGTH = 6;
const MIN_OTP_LENGTH = 6;
const MAX_OTP_LENGTH = 10;

function resolveOtpLength(): number {
  const configured = Number(process.env.NEXT_PUBLIC_AUTH_OTP_LENGTH);
  if (Number.isInteger(configured) && configured >= MIN_OTP_LENGTH && configured <= MAX_OTP_LENGTH) {
    return configured;
  }
  return DEFAULT_OTP_LENGTH;
}

export const OTP_LENGTH = resolveOtpLength();

/** An empty digit array sized for the configured OTP length. */
export const emptyOtpDigits = (): string[] => Array(OTP_LENGTH).fill('');

/**
 * Sizing for one OTP box. Six boxes at w-12 fit a 375px phone; eight do not
 * (8 x 48px + gaps overflows), so longer codes get a narrower box that grows
 * back at the sm breakpoint. Identical to the original styling at length 6.
 */
export const OTP_BOX_CLASS =
  OTP_LENGTH > 6 ? 'w-9 h-12 text-xl sm:w-11 sm:h-14 sm:text-2xl' : 'w-12 h-14 text-2xl';
