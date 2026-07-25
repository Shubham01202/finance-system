// Path: backend/src/services/email.service.ts

import nodemailer from "nodemailer";

/* ─────────────────────────────────────────────
   TRANSPORTER
───────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST?.trim(),
  port: parseInt(process.env.SMTP_PORT?.trim(), 10),
  secure: process.env.SMTP_PORT?.trim() === '465',
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.trim(),
  },
  connectionTimeout: 10000, // 10s instead of default (often 2 min), fails fast for debugging
});

transporter.verify((err, success) => {
  if (err) console.error('SMTP verify failed:', err);
  else console.log('SMTP server is ready to take messages');
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP SERVER READY");
  }
});

/* ─────────────────────────────────────────────
   OTP EMAIL TEMPLATE
   `resetLink` is optional — when provided (i.e. this OTP email was
   triggered by a forgot-password request), a "Reset Password" button
   is rendered below the OTP box so the user can either type the code
   or just click straight through.
───────────────────────────────────────────── */
function otpEmailTemplate(fullName: string, otp: string, role: string, resetLink?: string): string {
  const roleLabel = role === "ca" ? "Chartered Accountant" : "Customer";
  const isReset = Boolean(resetLink);

  const heading = isReset ? "Reset Your Password 🔑" : "Verify Your Email 📧";
  const introText = isReset
    ? `Hi <strong style="color:#1e293b;">${fullName}</strong>, we received a request to reset your password.<br/>
       Click the button below to set a new password, or use the OTP if you'd rather enter a code. Both expire soon.`
    : `Hi <strong style="color:#1e293b;">${fullName}</strong>, welcome to SN Finance Service as a <strong style="color:#1e3a5f;">${roleLabel}</strong>!<br/>
       Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.`;

  const resetButtonBlock = isReset ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5986);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;">
                      Reset Password →
                    </a>
                    <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">This link is valid for 1 hour.</p>
                    <p style="font-size:12px;color:#cbd5e1;margin:6px 0 0;word-break:break-all;">
                      Or copy this link: ${resetLink}
                    </p>
                  </td>
                </tr>
              </table>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${isReset ? "Password Reset" : "Email Verification"} – SN Finance Service</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5986 100%);padding:32px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;margin-right:12px;">
                    <span style="font-size:20px;">🏦</span>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-0.3px;">SN Finance Service</p>
                    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:2px 0 0;">Trusted Loan Solutions</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="font-size:22px;font-weight:800;color:#1e293b;margin:0 0 8px;">${heading}</p>
              <p style="font-size:15px;color:#64748b;margin:0 0 28px;line-height:1.6;">
                ${introText}
              </p>

              <!-- OTP BOX -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:14px;padding:28px 20px;">
                    <p style="font-size:13px;font-weight:700;color:#0369a1;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">Your One-Time Password</p>
                    <p style="font-size:42px;font-weight:900;color:#1e3a5f;margin:0;letter-spacing:16px;font-family:monospace;">${otp}</p>
                    <p style="font-size:12px;color:#94a3b8;margin:12px 0 0;">Valid for 10 minutes only</p>
                  </td>
                </tr>
              </table>

              ${resetButtonBlock}

              <p style="font-size:14px;color:#64748b;margin:24px 0 0;line-height:1.6;">
                ${isReset
                  ? "If you did not request a password reset, please ignore this email — your password will remain unchanged."
                  : "If you did not create an account, please ignore this email. Do not share this OTP with anyone."}
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">
                © ${new Date().getFullYear()} SN Finance Service. All rights reserved.<br/>
                This is an automated email. Please do not reply.
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

/* ─────────────────────────────────────────────
   WELCOME / CONFIRMATION EMAIL TEMPLATE
───────────────────────────────────────────── */
function welcomeEmailTemplate(fullName: string, role: string): string {
  const roleLabel = role === "ca" ? "Chartered Accountant" : "Customer";
  const roleMsg   = role === "ca"
    ? "You can now assist clients with their loan applications on our platform."
    : "You can now apply for personal, home, business, and other loans easily.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to SN Finance Service</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5986 100%);padding:32px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;">
                    <span style="font-size:20px;">🏦</span>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-0.3px;">SN Finance Service</p>
                    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:2px 0 0;">Trusted Loan Solutions</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUCCESS BANNER -->
          <tr>
            <td style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:20px 40px;">
              <p style="font-size:16px;font-weight:700;color:#16a34a;margin:0;">
                ✅ Email Verified Successfully!
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="font-size:22px;font-weight:800;color:#1e293b;margin:0 0 8px;">
                Welcome aboard, ${fullName}! 🎉
              </p>
              <p style="font-size:15px;color:#64748b;margin:0 0 24px;line-height:1.6;">
                Your account has been successfully created as a <strong style="color:#1e3a5f;">${roleLabel}</strong>.<br/>
                ${roleMsg}
              </p>

              <!-- WHAT'S NEXT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px;">
                <tr><td>
                  <p style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.06em;">What's next?</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;">🔐 &nbsp; Login with your email and password</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;">📋 &nbsp; Complete your loan application</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;">📊 &nbsp; Track your application status in real-time</td>
                    </tr>
                  </table>
                </td></tr>
              </table>

              <!-- LOGIN BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="http://localhost:3000" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d5986);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;">
                      Login Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">
                © ${new Date().getFullYear()} SN Finance Service. All rights reserved.<br/>
                This is an automated email. Please do not reply.
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

function setupPasswordTemplate(
  fullName: string,
  setupLink: string
): string {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:40px;">

    <div style="
      max-width:600px;
      margin:auto;
      background:white;
      border-radius:12px;
      padding:40px;
      box-shadow:0 2px 15px rgba(0,0,0,.08);
    ">

      <h2 style="color:#1e3a5f;">
        Welcome to SN Finance Service
      </h2>

      <p>Hi ${fullName},</p>

      <p>
        An account has been created for you by an administrator.
      </p>

      <p>
        Click the button below to set your password and activate your account.
      </p>

      <div style="text-align:center;margin:35px 0;">
        <a
          href="${setupLink}"
          style="
            background:#2563eb;
            color:#ffffff;
            text-decoration:none;
            padding:14px 28px;
            border-radius:8px;
            display:inline-block;
            font-weight:bold;
          "
        >
          Set Password
        </a>
      </div>

      <p>
        This link will expire in 24 hours.
      </p>

      <p>
        If you were not expecting this email, please ignore it.
      </p>

      <hr />

      <p style="font-size:12px;color:#666;">
        SN Finance Service
      </p>

    </div>

  </body>
  </html>
  `;
}

/* ─────────────────────────────────────────────
   SEND OTP EMAIL
   `resetLink` is optional (5th param) — pass it when this is being
   triggered by forgotPassword so the email includes a working
   "Reset Password" button, not just the OTP.
───────────────────────────────────────────── */
export async function sendOtpEmail(
  toEmail: string,
  fullName: string,
  otp: string,
  role: string,
  resetLink?: string
): Promise<void> {
  const isReset = Boolean(resetLink);
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to:      toEmail,
    subject: isReset
      ? "Reset your SN Finance Service password"
      : `${otp} is your SN Finance Service verification code`,
    html:    otpEmailTemplate(fullName, otp, role, resetLink),
  });
}

export async function sendSetupPasswordEmail(
  toEmail: string,
  fullName: string,
  setupLink: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: "Set Your Password - SN Finance Service",
    html: setupPasswordTemplate(
      fullName,
      setupLink
    ),
  });
}

/* ─────────────────────────────────────────────
   SEND WELCOME EMAIL
───────────────────────────────────────────── */
export async function sendWelcomeEmail(
  toEmail: string,
  fullName: string,
  role: string
): Promise<void> {
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to:      toEmail,
    subject: `Welcome to SN Finance Service, ${fullName}! 🎉`,
    html:    welcomeEmailTemplate(fullName, role),
  });
}