import { Request, Response } from "express";
import { pool } from "../config/db";
import { encrypt } from "../utils/crypto";
import { sendTestEmail, verifySmtpConnection } from "../services/email.service"; // ← now backed by Brevo's HTTP API

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
 * Now backed by Brevo's HTTP Transactional Email API — goes over
 * HTTPS (443), so it works even on Render's free tier where outbound
 * SMTP ports 25/465/587 are blocked.
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

    console.log(`[SMTP TEST ROUTE] ── Sending test email to ${email} via Brevo API...`);

    await sendTestEmail(email);

    const elapsed = Date.now() - startedAt;
    console.log(`[SMTP TEST ROUTE] ✓ SUCCESS — test email sent in ${elapsed}ms`);

    return res.json({
      success: true,
      message: "Test email sent successfully.",
    });
  } catch (error: any) {
    const elapsed = Date.now() - startedAt;
    console.error("[SMTP TEST ROUTE] ✗ FAILED after", elapsed, "ms —", error?.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * VERIFY CONNECTION ONLY (no email sent) — checks the Brevo API key
 * is valid via Brevo's lightweight /account endpoint.
 */
export const verifyEmailConnection = async (req: Request, res: Response) => {
  const result = await verifySmtpConnection();
  return res.status(result.ok ? 200 : 500).json(result);
};