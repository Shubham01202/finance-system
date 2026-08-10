// Path: backend/src/controllers/auth.controller.ts

import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOtpEmail, sendWelcomeEmail } from "../services/email.service";

/* ─────────────────────────────────────────────
   HELPER: Generate 6-digit OTP
───────────────────────────────────────────── */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ─────────────────────────────────────────────
   SIGNUP
───────────────────────────────────────────── */
export const signup = async (req: Request, res: Response) => {
  try {
    const { full_name, email, mobile, password, role } = req.body;

    if (!full_name || !email || !mobile || !password || !role) {
      return res.status(400).json({
        error: "All fields are required including role",
      });
    }

   const validRoles = ["customer", "ca", "dsa"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role.",
      });
    }

    // Check only verified users table
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email=$1 OR mobile=$2",
      [email, mobile]
    );

    if (existingUser.rowCount! > 0) {
      return res.status(400).json({
        error: "Email or Mobile already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOtp();

    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Check pending signup
    const pending = await pool.query(
      "SELECT id FROM pending_users WHERE email=$1 OR mobile=$2",
      [email, mobile]
    );

    if (pending.rowCount! > 0) {
      await pool.query(
        `
        UPDATE pending_users
        SET
            full_name=$1,
            password_hash=$2,
            role=$3,
            otp=$4,
            otp_expires_at=$5
        WHERE email=$6
        `,
        [
          full_name,
          hashedPassword,
          role,
          otp,
          otpExpires,
          email,
        ]
      );
    } else {
      await pool.query(
        `
        INSERT INTO pending_users
        (
            full_name,
            email,
            mobile,
            password_hash,
            role,
            otp,
            otp_expires_at
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          full_name,
          email,
          mobile,
          hashedPassword,
          role,
          otp,
          otpExpires,
        ]
      );
    }

    await sendOtpEmail(email, full_name, otp, role);

    return res.status(201).json({
      success: true,
      message: "OTP sent successfully.",
    });

  } catch (error: any) {

    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

/* ─────────────────────────────────────────────
   VERIFY OTP
───────────────────────────────────────────── */
export const verifyOtp = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required",
      });
    }

    const result = await client.query(
      "SELECT * FROM pending_users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.otp !== otp) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({
        error: "OTP has expired",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO users
      (
        full_name,
        email,
        mobile,
        password_hash,
        role,
        is_verified
      )
      VALUES
      ($1,$2,$3,$4,$5,true)
      `,
      [
        user.full_name,
        user.email,
        user.mobile,
        user.password_hash,
        user.role,
      ]
    );

    await client.query(
      "DELETE FROM pending_users WHERE email = $1",
      [email]
    );

    await client.query("COMMIT");

    await sendWelcomeEmail(
      user.email,
      user.full_name,
      user.role
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });

  } catch (error: any) {

    await client.query("ROLLBACK");

    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    });

  } finally {

    client.release();

  }
};

/* ─────────────────────────────────────────────
   RESEND OTP
───────────────────────────────────────────── */
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM pending_users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        error: "No pending signup found.",
      });
    }

    const user = result.rows[0];

    const otp = generateOtp();

    const otpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await pool.query(
      `
      UPDATE pending_users
      SET
        otp=$1,
        otp_expires_at=$2
      WHERE email=$3
      `,
      [
        otp,
        otpExpires,
        email,
      ]
    );

    await sendOtpEmail(
      email,
      user.full_name,
      otp,
      user.role
    );

    return res.json({
      success: true,
      message: "OTP sent successfully.",
    });

  } catch (error: any) {

    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

/* ─────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────── */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(400).json({
        error: "Email not verified. Please check your inbox for the OTP.",
      });
    }

    if (!user.is_active) {
  return res.status(403).json({
    error: "Your account has been deactivated. Please contact the administrator.",
  });
}

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role,
        mobile:    user.mobile,
      },
    });

  } catch (error: any) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ─────────────────────────────────────────────
   FORGOT PASSWORD — send OTP *and* a clickable reset link
   Reuses the same setup_token / setup_token_expires columns and the
   same /set-password page you already built for new-CA account setup,
   so no new page or endpoint is needed for password resets.
───────────────────────────────────────────── */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "No account found with this email",
      });
    }

    const user = result.rows[0];

    // OTP — kept for the in-app "enter code" flow
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Reset token — reuses the same setup_token columns your existing
    // /set-password page and setPasswordFromLink controller already read.
    const setupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `
      UPDATE users
      SET otp = $1,
          otp_expires_at = $2,
          setup_token = $3,
          setup_token_expires = $4
      WHERE email = $5
      `,
      [otp, otpExpires, setupToken, setupTokenExpires, email]
    );

    // Points at your EXISTING set-password page — no new page needed.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/set-password?token=${setupToken}`;

    await sendOtpEmail(
      email,
      user.full_name,
      otp,
      user.role,
      resetLink
    );

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully.",
    });

  } catch (error: any) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

/* ─────────────────────────────────────────────
   RESET PASSWORD — verify OTP + set new password
   (unchanged — this is the "type the 6-digit code" path)
───────────────────────────────────────────── */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
         SET password_hash = $1, otp = NULL, otp_expires_at = NULL,
             setup_token = NULL, setup_token_expires = NULL
       WHERE email = $2`,
      [hashedPassword, email]
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now login with your new password.",
    });

  } catch (error: any) {
    console.error("Reset Password Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const setPasswordFromLink = async (
  req: Request,
  res: Response
) => {
  try {
    const { token, password } = req.body;

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE setup_token = $1
     AND setup_token_expires > NOW()
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid or expired link",
      });
    }

    const user = result.rows[0];

    const hashedPassword =
      await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        is_verified = true,
        setup_token = NULL,
        setup_token_expires = NULL
      WHERE id = $2
      `,
      [hashedPassword, user.id]
    );

    return res.json({
      success: true,
      message: "Password created successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

/* ═══════════════════════════════════════════
   ROLES — manage which roles exist (label only,
   used to populate users.role on create/edit)
═══════════════════════════════════════════ */

export const getRoles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM roles ORDER BY role_name ASC`
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("getRoles error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { role_name, description } = req.body;

    if (!role_name || !role_name.trim()) {
      return res.status(400).json({
        error: "Role name is required",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM roles WHERE LOWER(role_name) = LOWER($1)`,
      [role_name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "This role already exists",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO roles (role_name, description)
      VALUES ($1, $2)
      RETURNING *
      `,
      [role_name.trim(), description || null]
    );

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("createRole error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role_name, description, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE roles
      SET role_name = COALESCE($1, role_name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active)
      WHERE id = $4
      RETURNING *
      `,
      [role_name, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Role not found",
      });
    }

    return res.json({
      success: true,
      message: "Role updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("updateRole error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM roles WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Role not found",
      });
    }

    return res.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("deleteRole error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};