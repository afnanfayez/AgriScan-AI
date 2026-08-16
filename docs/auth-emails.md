# Auth emails (Supabase)

Signup verification codes and password reset codes are sent by **Supabase Auth**,
not by this application. There is no SMTP code, no email template, and no email
environment variable in this repo any more — all of it lives in the Supabase
dashboard.

The app's side of the contract is only this:

| Flow | Sends | Verifies |
|---|---|---|
| Signup | `supabase.auth.signUp()` | `verifyOtp({ type: 'signup' })` |
| Resend signup code | `supabase.auth.resend({ type: 'signup' })` | — |
| Password reset | `supabase.auth.resetPasswordForEmail()` | `verifyOtp({ type: 'recovery' })` |
| Set new password | — | `updateUser({ password })` on the recovery session |

---

## Required dashboard setup

Nothing below can be done from code. Do all five steps, in order.

### 1. Turn on email confirmation

**Authentication → Sign In / Providers → Email**

Enable **Confirm email**. This is the single most likely thing to be wrong.

**Symptom when it is off:** registering takes you straight to the dashboard and
no email ever arrives. That is not an email problem — no email was requested.
With confirmation disabled, `signUp()` auto-confirms the account and returns a
*session*; the SSR client writes those cookies, so the browser is immediately
authenticated, and middleware redirects `/register` to `/dashboard` before the
OTP screen can render. The account exists and was never verified.

`services/auth/registration.ts` now detects this: if `signUp()` comes back with
a session it clears the cookies, removes the account it just created, and fails
with *"Email verification is turned off for this project"* rather than silently
signing in an unverified user.

### 2. Make the templates send a CODE, not a link

**[Authentication → Emails → Templates](https://supabase.com/dashboard/project/_/auth/templates)**

By default both templates contain `{{ .ConfirmationURL }}`, which produces a
magic link. This app asks the user to type a 6-digit code, so both templates
**must** contain `{{ .Token }}`.

The full branded templates live in this repo so the dashboard is not the only
copy of them:

- **Confirm signup** -> [`docs/email-templates/confirm-signup.html`](email-templates/confirm-signup.html)
- **Reset password** -> [`docs/email-templates/reset-password.html`](email-templates/reset-password.html)

Paste each file's contents into the matching template's **Body (Source)** box,
and set the subjects to:

| Template | Subject |
|---|---|
| Confirm signup | `{{ .Token }} - Verify your AgriScan AI account` |
| Reset password | `{{ .Token }} - Reset your AgriScan AI password` |

Putting `{{ .Token }}` in the subject means the code shows in the inbox preview
and phone notification, which is how the previous Gmail-sent emails behaved.

The minimum a template needs is just the token:

```html
<p style="font-size:32px;font-weight:700;letter-spacing:10px;font-family:monospace;">{{ .Token }}</p>
```

> If you leave `{{ .ConfirmationURL }}` in place the emails still send, and the
> flow still *looks* fine right up until the user has no code to type.

### 3. Configure SMTP

**[Authentication → Emails → SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp)**

Enable **custom SMTP** and fill in sender details plus host/port/username/password.

**Do not use Gmail here.** The dashboard warns about this, and it is worth
heeding: Gmail is built for personal mail, enforces low daily send caps, and
rewrites the sender — deliverability for transactional mail is poor and it will
start silently dropping messages as signups grow. Use a transactional provider:

| Provider | Host | Port |
|---|---|---|
| Resend | `smtp.resend.com` | 587 |
| SendGrid | `smtp.sendgrid.net` | 587 |
| Postmark | `smtp.postmarkapp.com` | 587 |
| Mailgun | `smtp.mailgun.org` | 587 |

Use port **587** (STARTTLS). Avoid 25 — providers commonly block it.

`resend` is already a dependency in `package.json` (currently unused), so Resend
is the path of least resistance if you have no preference.

Without custom SMTP, Supabase's built-in sender is capped at a few emails per
hour and is **not** intended for production.

### 4. Check the rate limits

**[Authentication → Rate Limits](https://supabase.com/dashboard/project/_/auth/rate-limits)**

The default of 30 emails/hour is a project-wide cap that will throttle real
signups quickly. Raise it once custom SMTP is on.

There is also **Minimum interval per user** in the SMTP settings — the gap
enforced between two emails to the same address. The UI's resend buttons use a
60-second cooldown, so keep this at or below 60 seconds or a legitimate "resend
code" click returns a rate-limit error.

The app maps these to a `429` with the message *"Too many email requests. Please
wait a minute before trying again."*

### 5. Match the OTP length

**Authentication -> Sign In / Providers -> Email -> Email OTP length**

Whatever this is set to, `NEXT_PUBLIC_AUTH_OTP_LENGTH` must equal it (default 6).

A mismatch fails in a genuinely misleading way. If Supabase issues 8 digits but
the UI renders 6 boxes, the user physically cannot enter the whole code; a
truncated token reaches GoTrue, and GoTrue answers `otp_expired` - "token has
expired or is invalid" - because it uses that one error for *invalid* tokens as
well as expired ones. The logs then show a code failing 90 seconds after being
issued against a 3600-second expiry, which points at everything except the real
cause.

---

## What changed in the code

- **Deleted** `lib/email.ts` (nodemailer transport + HTML templates) and
  `lib/crypto.ts` (encrypted the parked password). `nodemailer` is uninstalled.
- **Removed** the `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` and
  `PENDING_SIGNUP_SECRET` environment variables. Delete them from Cloud Run too.
- **Dropped** the `pending_signups` table — run `supabase_auth_emails_patch.sql`.

### Two behaviour changes worth knowing

**Accounts are created unconfirmed.** Previously an account did not exist until
the code was entered. Now `signUp()` creates the row immediately and the
`on_auth_user_created` trigger writes `public.profiles` at that moment. So
"does this account exist?" means *is there a **confirmed** auth user*, not *is
there a profile row* — otherwise abandoning signup once would lock that address
out permanently. Signing up again with an unconfirmed address re-sends the code.

**Password reset is authorized by a session, not a token.** The old flow minted
its own `reset_verified_token`, stored it in `user_metadata`, and trusted the
client to hand it back. Verifying the OTP now establishes a real Supabase
recovery session in cookies, and that session is what authorizes the password
change — so `/reset-password/confirm` takes only `newPassword`.

---

## Verifying it works

1. Register a new account. The code should arrive from your configured sender.
2. Enter a wrong code → *"Invalid verification code."* Enter the right one → you
   land on the dashboard, and a welcome notification exists.
3. Sign up again with that same address → *"An account with this email already
   exists."*
4. Start a signup, abandon it, then sign up again with that address → a new code
   is sent rather than an "already exists" error.
5. Request a password reset for an address that does not exist → still reports
   success (this is deliberate: it prevents account enumeration).
6. Reset a real account's password, then confirm the old password no longer works.
7. Click "Resend code" several times quickly → a `429` with the wait message.
