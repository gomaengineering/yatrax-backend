/**
 * Resend email client and helpers for transactional email.
 *
 * Required env (for password reset):
 *   - RESEND_API_KEY: Resend API key (create at https://resend.com/api-keys)
 *   - RESEND_FROM: Sender, e.g. "YatraX <noreply@yourdomain.com>" (use verified domain)
 *   - FRONTEND_URL or PASSWORD_RESET_BASE_URL: Base URL for reset link (e.g. https://app.yatrax.com)
 */
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send a password reset email via Resend.
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - Full URL for the password reset page (including token)
 * @param {string} [userFirstName] - Optional first name for personalization
 * @returns {{ success: boolean, id?: string, error?: object }}
 */
export async function sendPasswordResetEmail(to, resetUrl, userFirstName) {
  if (!resend) {
    console.error("Resend is not configured: RESEND_API_KEY is missing.");
    return { success: false, error: { message: "Email service not configured" } };
  }

  const firstName = userFirstName || "there";
  const subject = "Reset your YatraX password";
  // Brand colors: dark teal #005147, orange #e55100 (match frontend/logo)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password – YatraX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #e8f0ef;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f0ef;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,81,71,0.12); border-top: 4px solid #005147;">
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 22px; font-weight: 700; color: #005147; letter-spacing: -0.02em;">Yatra<span style="color: #e55100">X</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; font-size: 22px; font-weight: 600; color: #005147;">Reset your password</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">We received a request to reset the password for your YatraX account. Click the button below to choose a new password.</p>
              <p style="margin: 0 0 24px;">
                <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #e55100; text-decoration: none; border-radius: 8px;">Reset password</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; line-height: 20px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">This link expires in 1 hour.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 18px; font-weight:600 line-height: 18px; color: #005147; opacity: 0.85;">Yatra<span style="color: #e55100">X</span> - Serving The <span style="color: #e55100">Nepali Experience</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend send error:", error);
    return { success: false, error };
  }
  return { success: true, id: data?.id };
}

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}

export { resend };
