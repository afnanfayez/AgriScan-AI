import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `"AgriScan AI" <${SMTP_USER}>`;

// Create NodeMailer transporter using Gmail SMTP service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

const APP_NAME = 'AgriScan AI';

/** Sends an email verification OTP */
export async function sendVerificationEmail(toEmail: string, userName: string, code: string): Promise<boolean> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('SMTP credentials are missing. Logged OTP code below instead.');
      console.log(`\n======================================================\n===> SIGNUP OTP FOR ${toEmail}: ${code}\n======================================================\n`);
      return false;
    }

    await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `${code} — Verify your ${APP_NAME} account`,
      html: buildVerificationEmailHtml(userName, code),
    });

    return true;
  } catch (err) {
    console.error('Failed to send verification email via Gmail SMTP:', err);
    return false;
  }
}

/** Sends a password reset OTP */
export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<boolean> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('SMTP credentials are missing. Logged Reset OTP code below instead.');
      console.log(`\n======================================================\n===> RESET OTP FOR ${toEmail}: ${code}\n======================================================\n`);
      return false;
    }

    await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `${code} — Reset your ${APP_NAME} password`,
      html: buildPasswordResetEmailHtml(toEmail, code),
    });

    return true;
  } catch (err) {
    console.error('Failed to send password reset email via Gmail SMTP:', err);
    return false;
  }
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

function buildVerificationEmailHtml(name: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email — AgriScan AI</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(5,150,105,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:28px;">🌱</span>
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">AgriScan AI</span>
              </div>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;font-family:monospace;">Pathology Intelligence</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#064e3b;">Verify your email address</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Hi ${name}, welcome to AgriScan AI! Use the code below to verify your email address and activate your account.
              </p>
              <!-- OTP Box -->
              <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#059669;letter-spacing:3px;text-transform:uppercase;font-family:monospace;">YOUR VERIFICATION CODE</p>
                <p style="margin:0;font-size:42px;font-weight:800;color:#064e3b;letter-spacing:12px;font-family:monospace;">${code}</p>
                <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">This code expires in <strong>15 minutes</strong></p>
              </div>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                If you didn't create an AgriScan AI account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                AgriScan AI Professional &bull; Powered by Google Gemini Vision<br/>
                &copy; 2026 AgriScan AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function buildPasswordResetEmailHtml(email: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password — AgriScan AI</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(5,150,105,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:28px;">🔑</span>
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">AgriScan AI</span>
              </div>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;font-family:monospace;">Password Reset</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#064e3b;">Reset your password</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                We received a request to reset your password. Use the code below:
              </p>
              <!-- OTP Box -->
              <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#059669;letter-spacing:3px;text-transform:uppercase;font-family:monospace;">YOUR RESET CODE</p>
                <p style="margin:0;font-size:42px;font-weight:800;color:#064e3b;letter-spacing:12px;font-family:monospace;">${code}</p>
                <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">This code expires in <strong>15 minutes</strong></p>
              </div>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                AgriScan AI Professional &bull; Powered by Google Gemini Vision<br/>
                &copy; 2026 AgriScan AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
