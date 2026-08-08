// Path: backend/src/services/email.service.ts
//
// ─────────────────────────────────────────────────────────────
// NOTE ON THIS REWRITE:
// This file now sends email via Brevo's HTTP Transactional Email
// API (https://api.brevo.com/v3/smtp/email) instead of raw SMTP.
// Reason: Render's free-tier plans block outbound traffic on SMTP
// ports 25/465/587 entirely. The API runs over standard HTTPS
// (port 443), which is never blocked.
//
// CREDENTIAL CHANGE: you need a Brevo *API key* now (starts with
// "xkeysib-..."), NOT the SMTP key you used before. Generate one at:
// Brevo Dashboard → Settings → SMTP & API → API Keys tab
// (different tab from the SMTP tab you used previously)
//
// To avoid a DB migration, this reuses the existing
// `password_encrypted` column on smtp_settings to store the
// (encrypted) API key. `host`, `port`, `username`, `encryption_type`
// are no longer used but the columns are left as-is.
// ─────────────────────────────────────────────────────────────

import fs from "fs";
import { pool } from "../config/db";
import { decrypt } from "../utils/crypto";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account";

/* ─────────────────────────────────────────────
   GET ACTIVE BREVO CONFIG
   Fetches the active smtp_settings row, decrypts the
   stored API key, and extracts a clean sender email
   (in case from_email is stored as "Name <email>").
───────────────────────────────────────────── */
async function getBrevoConfig(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName: string;
}> {
  console.log("[BREVO] ── Fetching active smtp_settings row from DB...");
  const result = await pool.query(
    `SELECT *
     FROM smtp_settings
     WHERE is_active = true
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    console.error("[BREVO] ✗ No active smtp_settings row found in DB.");
    throw new Error("Email settings not configured.");
  }

  const row = result.rows[0];

  let apiKey: string;
  try {
    apiKey = decrypt(row.password_encrypted);
  } catch (err: any) {
    console.error("[BREVO] ✗ Failed to decrypt API key:", err?.message);
    throw new Error("Failed to decrypt Brevo API key: " + err?.message);
  }

  if (!apiKey || !apiKey.startsWith("xkeysib-")) {
    console.warn(
      "[BREVO] ⚠ Stored credential does not look like a Brevo API key " +
      "(expected it to start with 'xkeysib-'). Did you paste the SMTP key by mistake?"
    );
  }

  // from_email may be stored either as a bare address or as "Name <email>" —
  // Brevo's API wants sender.email as a bare address, so extract it.
  const rawFromEmail: string = row.from_email || "";
  const match = rawFromEmail.match(/<([^>]+)>/);
  const fromEmail = match ? match[1] : rawFromEmail.trim();
  const fromName = row.from_name || "SN Finance Service";

  console.log("[BREVO] Config resolved:", {
    fromEmail,
    fromName,
    api_key_present: Boolean(apiKey),
    api_key_looks_valid: apiKey?.startsWith("xkeysib-"),
  });

  return { apiKey, fromEmail, fromName };
}

/* ─────────────────────────────────────────────
   VERIFY BREVO API KEY
   Calls Brevo's /account endpoint — a lightweight way to
   confirm the API key is valid without sending an email.
   Use this from a "Test Connection" route/button.
───────────────────────────────────────────── */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const startedAt = Date.now();
  console.log("[BREVO TEST] ── Verifying Brevo API key...");

  try {
    const { apiKey } = await getBrevoConfig();

    const res = await fetch(BREVO_ACCOUNT_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
    });

    const elapsed = Date.now() - startedAt;

    if (!res.ok) {
      const body = await res.text();
      console.error("[BREVO TEST] ✗ FAILED after", elapsed, "ms — status:", res.status, body);
      return { ok: false, error: `Brevo API rejected the key (HTTP ${res.status}): ${body}` };
    }

    const data = await res.json();
    console.log(`[BREVO TEST] ✓ SUCCESS in ${elapsed}ms — account: ${data?.email || "unknown"}`);
    return { ok: true };
  } catch (error: any) {
    const elapsed = Date.now() - startedAt;
    console.error("[BREVO TEST] ✗ FAILED after", elapsed, "ms —", error?.message);
    return { ok: false, error: error?.message || "Brevo API verification failed" };
  }
}

/* ─────────────────────────────────────────────
   CORE SEND FUNCTION
   Every email in this file goes through here. Wraps
   Brevo's HTTP API with the same attachment shape the
   rest of the app already uses: { filename, content?, path? }
───────────────────────────────────────────── */
interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content?: Buffer; path?: string }[];
}

async function sendBrevoEmail({ to, subject, html, attachments }: SendEmailArgs): Promise<void> {
  const { apiKey, fromEmail, fromName } = await getBrevoConfig();

  const brevoAttachments = attachments?.length
    ? attachments.map((a) => {
        let base64Content: string;
        if (a.content) {
          base64Content = a.content.toString("base64");
        } else if (a.path) {
          base64Content = fs.readFileSync(a.path).toString("base64");
        } else {
          throw new Error(`Attachment "${a.filename}" has neither content nor path.`);
        }
        return { name: a.filename, content: base64Content };
      })
    : undefined;

  const payload: Record<string, any> = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (brevoAttachments) payload.attachment = brevoAttachments;

  console.log(`[BREVO] ── Sending email to ${to} — subject: "${subject}"`);
  const startedAt = Date.now();

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const elapsed = Date.now() - startedAt;

  if (!res.ok) {
    const body = await res.text();
    console.error(`[BREVO] ✗ FAILED after ${elapsed}ms — HTTP ${res.status}:`, body);
    throw new Error(`Brevo API error (HTTP ${res.status}): ${body}`);
  }

  const data = await res.json();
  console.log(`[BREVO] ✓ SUCCESS in ${elapsed}ms — messageId: ${data?.messageId}`);
}

/* ─────────────────────────────────────────────
   OTP EMAIL TEMPLATE
   `resetLink` is optional — when provided (i.e. this OTP email was
   triggered by a forgot-password request), a "Reset Password" button
   is rendered below the OTP box so the user can either type the code
   or just click straight through.
───────────────────────────────────────────── */
function otpEmailTemplate(fullName: string, otp: string, role: string, resetLink?: string): string {
  const roleLabel =
    role === "ca" ? "Chartered Accountant" :
    role === "dsa" ? "Direct Selling Agent" :
    "Customer";
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
  const roleLabel =
    role === "ca" ? "Chartered Accountant" :
    role === "dsa" ? "Direct Selling Agent" :
    "Customer";

  const roleMsg =
    role === "ca"
      ? "You can now assist clients with their loan applications on our platform."
      : role === "dsa"
      ? "You can now submit and manage loan applications on behalf of your customers."
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

  await sendBrevoEmail({
    to: toEmail,
    subject: isReset
      ? "Reset your SN Finance Service password"
      : `${otp} is your SN Finance Service verification code`,
    html: otpEmailTemplate(fullName, otp, role, resetLink),
  });
}

/* ─────────────────────────────────────────────
   SEND SETUP-PASSWORD EMAIL
───────────────────────────────────────────── */
export async function sendSetupPasswordEmail(
  toEmail: string,
  fullName: string,
  setupLink: string
): Promise<void> {
  await sendBrevoEmail({
    to: toEmail,
    subject: "Set Your Password - SN Finance Service",
    html: setupPasswordTemplate(fullName, setupLink),
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
  await sendBrevoEmail({
    to: toEmail,
    subject: `Welcome to SN Finance Service, ${fullName}! 🎉`,
    html: welcomeEmailTemplate(fullName, role),
  });
}

/* ─────────────────────────────────────────────
   APPLICATION → BANKER EMAIL TEMPLATE
───────────────────────────────────────────── */
function applicationDetailsRow(label: string, value: any): string {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : String(value);

  return `
    <tr>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;width:220px;">${label}</td>
      <td style="padding:10px 14px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${displayValue}</td>
    </tr>
  `;
}

function applicationToBankerTemplate(application: any, documentNames: string[]): string {
  const fmtAmount = (n: any) =>
    n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—";

  const fmtDate = (d: any) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const isEmpty = (v: any) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  // Only push a row if the value actually has something in it.
  // (Application ID / Status / Created At are always shown regardless.)
  const optionalRow = (label: string, value: any): string =>
    isEmpty(value) ? "" : applicationDetailsRow(label, value);

  const sectionHeaderRow = (title: string): string => `
    <tr>
      <td colspan="2" style="padding:14px 14px 8px;font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;background:#eff6ff;border-bottom:1px solid #e2e8f0;">${title}</td>
    </tr>
  `;

  /* ── CORE (always shown) ── */
  let rows = [
    sectionHeaderRow("Application Info"),
    applicationDetailsRow("Application ID", application.application_number || application.id),
    applicationDetailsRow("Status", (application.status || "pending").toUpperCase()),
    applicationDetailsRow("Bank", application.bank_name || "—"),
    applicationDetailsRow(
      "Created At",
      application.created_at ? new Date(application.created_at).toLocaleString("en-IN") : "—"
    ),
  ].join("");

  /* ── APPLICANT DETAILS ── */
  rows += sectionHeaderRow("Applicant Details");
  rows += [
    applicationDetailsRow("Applicant Name", application.full_name || application.user_name || "—"),
    optionalRow("Email", application.email),
    optionalRow("Mobile", application.mobile),
    optionalRow("Date of Birth", application.dob ? fmtDate(application.dob) : ""),
    optionalRow("Employment Type", application.employment_type),
    optionalRow("Annual Income", application.annual_income != null ? fmtAmount(application.annual_income) : ""),
    optionalRow("Aadhaar Number", application.aadhaar_number),
    optionalRow("PAN Number", application.pan_number),
    optionalRow("GST Number", application.gst_number),
  ].join("");

  /* ── LOAN DETAILS ── */
  rows += sectionHeaderRow("Loan Details");
  rows += [
    optionalRow("Loan Type", application.loan_type),
    optionalRow("Loan Amount", application.loan_amount != null ? fmtAmount(application.loan_amount) : ""),
    optionalRow("Tenure", application.tenure ? `${application.tenure} Year(s)` : ""),
    optionalRow("Loan Purpose", application.loan_purpose),
    optionalRow("Vehicle Details", application.vehicle_details),
  ].join("");

  /* ── ADDRESS DETAILS ── */
  const hasAddress =
    !isEmpty(application.address) ||
    !isEmpty(application.city) ||
    !isEmpty(application.district) ||
    !isEmpty(application.state) ||
    !isEmpty(application.pincode) ||
    !isEmpty(application.country);

  if (hasAddress) {
    rows += sectionHeaderRow("Address Details");
    rows += [
      optionalRow("Address", application.address),
      optionalRow("City", application.city),
      optionalRow("District", application.district),
      optionalRow("State", application.state),
      optionalRow("Pincode", application.pincode),
      optionalRow("Country", application.country),
    ].join("");
  }

  /* ── CO-APPLICANT (only if present) ── */
  if (!isEmpty(application.co_applicant_name)) {
    rows += sectionHeaderRow("Co-Applicant Details");
    rows += [
      applicationDetailsRow("Co-Applicant Name", application.co_applicant_name),
      optionalRow("Co-Applicant Aadhaar", application.co_applicant_aadhaar),
      optionalRow("Co-Applicant PAN", application.co_applicant_pan),
    ].join("");
  }

  /* ── FILED BY (customer / CA / DSA) ── */
  const appliedBy = (application.applied_by || "customer").toLowerCase();
  const agentLabel = appliedBy === "ca" ? "CA" : appliedBy === "dsa" ? "DSA" : null;

  rows += sectionHeaderRow("Filed By");
  if (!agentLabel) {
    rows += applicationDetailsRow("Filed By", "Self (Customer)");
  } else {
    rows += applicationDetailsRow("Filed By", agentLabel);
    rows += [
      optionalRow(`${agentLabel} Name`, application.ca_name),
      optionalRow(`${agentLabel} Email`, application.ca_email),
      optionalRow(`${agentLabel} Firm`, application.ca_firm),
    ].join("");
  }

  const docsListHtml = documentNames.length
    ? documentNames.map((n) => `<li style="margin-bottom:4px;">${n}</li>`).join("")
    : "<li>No documents attached</li>";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Loan Application Details – SN Finance Service</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

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
                    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:2px 0 0;">Loan Application Referral</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="font-size:20px;font-weight:800;color:#1e293b;margin:0 0 6px;">Loan Application Details</p>
              <p style="font-size:14px;color:#64748b;margin:0 0 24px;">
                Please find below the complete details of the approved loan application, along with attached documents.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                ${rows}
              </table>

              <p style="font-size:14px;font-weight:700;color:#1e293b;margin:24px 0 8px;">Attached Documents</p>
              <ul style="font-size:13.5px;color:#475569;margin:0;padding-left:20px;line-height:1.7;">
                ${docsListHtml}
              </ul>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">
                © ${new Date().getFullYear()} SN Finance Service. All rights reserved.<br/>
                This is an automated email sent by an SN Finance Service administrator.
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
   SEND APPLICATION TO BANKER (with attachments)
───────────────────────────────────────────── */
export async function sendApplicationToBankerEmail(
  toEmail: string,
  subject: string,
  application: any,
  documentNames: string[],
  attachments: { filename: string; content?: Buffer; path?: string }[]
): Promise<void> {
  await sendBrevoEmail({
    to: toEmail,
    subject,
    html: applicationToBankerTemplate(application, documentNames),
    attachments,
  });
}

/* ─────────────────────────────────────────────
   SEND A RAW/AD-HOC EMAIL (used by the "Test Connection" route)
───────────────────────────────────────────── */
export async function sendTestEmail(toEmail: string): Promise<void> {
  await sendBrevoEmail({
    to: toEmail,
    subject: "SMTP Test Email",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Email Configuration Successful ✅</h2>
        <p>This is a test email from <b>SN Finance</b>.</p>
        <p>Your Brevo API settings are working correctly.</p>
      </div>
    `,
  });
}