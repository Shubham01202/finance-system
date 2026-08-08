import { Request, Response } from "express";
import { pool } from "../config/db";
import { encrypt, decrypt } from "../utils/crypto";
import { getTransporter } from "../services/email.service"; // ← reuse the single, fixed transporter builder

/**
 * GET SMTP SETTINGS
 */
export const getSMTPSettings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
          id,
          provider_name,
          host,
          port,
          username,
          encryption_type,
          from_email,
          from_name,
          is_active
       FROM smtp_settings
       WHERE is_active = true
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "SMTP settings not found.",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("SMTP Settings Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * UPDATE SMTP SETTINGS
 */
export const updateSMTPSettings = async (req: Request, res: Response) => {
  try {
    const {
      provider_name,
      host,
      port,
      username,
      password,
      encryption_type,
      from_email,
      from_name,
      is_active,
    } = req.body;

    const encryptedPassword = encrypt(password);

    // Check if settings already exist
    const existing = await pool.query(
      `SELECT id FROM smtp_settings LIMIT 1`
    );

    if (existing.rows.length === 0) {
      // INSERT
      await pool.query(
        `
        INSERT INTO smtp_settings
        (
          provider_name,
          host,
          port,
          username,
          password_encrypted,
          encryption_type,
          from_email,
          from_name,
          is_active,
          created_at,
          updated_at
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
        `,
        [
          provider_name,
          host,
          port,
          username,
          encryptedPassword,
          encryption_type,
          from_email,
          from_name,
          is_active,
        ]
      );
    } else {
      // UPDATE
      await pool.query(
        `
        UPDATE smtp_settings
        SET
          provider_name=$1,
          host=$2,
          port=$3,
          username=$4,
          password_encrypted=$5,
          encryption_type=$6,
          from_email=$7,
          from_name=$8,
          is_active=$9,
          updated_at=NOW()
        WHERE id=$10
        `,
        [
          provider_name,
          host,
          port,
          username,
          encryptedPassword,
          encryption_type,
          from_email,
          from_name,
          is_active,
          existing.rows[0].id,
        ]
      );
    }

    return res.json({
      success: true,
      message: "SMTP settings saved successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to save SMTP settings.",
    });
  }
};

/**
 * TEST SMTP CONNECTION (sends a real test email)
 * Now reuses the shared getTransporter() from email.service.ts —
 * same secure/requireTLS logic, IPv4 forcing, timeouts, and logging
 * as every other outgoing email in the app. No more duplicated,
 * out-of-sync transporter config.
 */
export const testSMTPConnection = async (req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    console.log(`[SMTP TEST ROUTE] ── Sending test email to ${email} ...`);

    const { transporter, smtp } = await getTransporter();

    await transporter.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to: email,
      subject: "SMTP Test Email",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>SMTP Configuration Successful ✅</h2>
          <p>This is a test email from <b>SN Finance</b>.</p>
          <p>Your SMTP settings are working correctly.</p>
        </div>
      `,
    });

    const elapsed = Date.now() - startedAt;
    console.log(`[SMTP TEST ROUTE] ✓ SUCCESS — test email sent in ${elapsed}ms`);

    return res.json({
      success: true,
      message: "Test email sent successfully.",
    });
  } catch (error: any) {
    const elapsed = Date.now() - startedAt;

    console.error("─────────────────────────────────────────────");
    console.error("[SMTP TEST ROUTE] ✗ FAILED after", elapsed, "ms");
    console.error("[SMTP TEST ROUTE] error.message :", error?.message);
    console.error("[SMTP TEST ROUTE] error.code    :", error?.code);
    console.error("[SMTP TEST ROUTE] error.command :", error?.command);
    console.error(
      "[SMTP TEST ROUTE] full error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );
    console.error("─────────────────────────────────────────────");

    let hint = "Unknown error — check the full error object above.";
    if (error?.code === "ETIMEDOUT" && error?.command === "CONN") {
      hint =
        "TCP connection never established — host/port unreachable from this server's network " +
        "(e.g. Render free-tier plans block outbound SMTP ports 25/465/587 entirely; " +
        "upgrade to a paid instance type to lift this restriction). Not a credentials issue.";
    } else if (error?.code === "EAUTH") {
      hint = "Authentication rejected — check smtp.username and the decrypted password/SMTP key.";
    } else if (error?.code === "ECONNREFUSED") {
      hint = "Host actively refused the connection — likely wrong port or service not listening there.";
    }
    console.error("[SMTP TEST ROUTE] Hint:", hint);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};