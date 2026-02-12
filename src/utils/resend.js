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
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">Reset your password</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">Hi ${escapeHtml(firstName)},</p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">We received a request to reset the password for your YatraX account. Click the button below to choose a new password.</p>
              <p style="margin: 0 0 24px;">
                <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500; color: #ffffff; background-color: #18181b; text-decoration: none; border-radius: 6px;">Reset password</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; line-height: 20px; color: #71717a;">If you didn't request this, you can safely ignore this email.</p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">This link expires in 1 hour.</p>
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
