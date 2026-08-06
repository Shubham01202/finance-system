
import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcrypt";
import {
  sendOtpEmail,
  sendSetupPasswordEmail,
  sendApplicationToBankerEmail,
} from "../services/email.service";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

// NOTE: adjust this if your uploads folder lives somewhere else.
// This assumes: backend/uploads  and  documents.filePath is stored like "uploads/xxx.pdf"
const UPLOAD_ROOT = path.join(__dirname, "../../");

const setupToken = crypto.randomBytes(32).toString("hex");

const expiresAt = new Date(
  Date.now() + 24 * 60 * 60 * 1000
);

// Fetches the current list of active role names from the roles table,
// so createUser/updateUser accept any role added via the Role page
// (e.g. "dsa") without needing a code change here.
async function getValidRoles(): Promise<string[]> {
  const result = await pool.query(
    `SELECT role_name FROM roles WHERE is_active = true`
  );
  return result.rows.map((r) => r.role_name.toLowerCase());
}


export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalApps,
      approvedApps,
      pendingApps,
      rejectedApps,
      totalAmount,
      totalUsers,
      totalCA,
      totalBanks,
      totalDSA,
      recentApplications,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM loan_applications`),

      pool.query(`
        SELECT COUNT(*)
        FROM loan_applications
        WHERE LOWER(status) = 'approved'
      `),

      pool.query(`
        SELECT COUNT(*)
        FROM loan_applications
        WHERE LOWER(status) = 'pending'
      `),

      pool.query(`
        SELECT COUNT(*)
        FROM loan_applications
        WHERE LOWER(status) = 'rejected'
      `),

      pool.query(`
        SELECT COALESCE(SUM(loan_amount), 0) AS total
        FROM loan_applications
      `),

      pool.query(`SELECT COUNT(*) FROM users`),

      pool.query(`
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(role) = 'ca'
      `),

     pool.query(`SELECT COUNT(*) FROM banks`),

      pool.query(`
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(role) = 'dsa'
      `),

      pool.query(`
     SELECT
  la.id,
  la.full_name,
  la.loan_type,
  la.loan_amount,
  la.tenure,
  LOWER(COALESCE(la.status, 'pending')) AS status,
  la.created_at,
  b.bank_name,

  LOWER(COALESCE(la.applied_by, 'customer')) AS applied_by,

  CASE
    WHEN LOWER(COALESCE(la.applied_by, 'customer')) = 'ca'
      THEN la.ca_name
    WHEN LOWER(COALESCE(la.applied_by, 'customer')) = 'dsa'
      THEN la.dsa_name
    ELSE NULL
  END AS agent_name

FROM loan_applications la
LEFT JOIN banks b ON la.bank_id = b.id
ORDER BY la.created_at DESC
LIMIT 10
      `),
    ]);

    return res.json({
      success: true,
      stats: {
        total_applications: Number(totalApps.rows[0].count),
        approved: Number(approvedApps.rows[0].count),
        pending: Number(pendingApps.rows[0].count),
        rejected: Number(rejectedApps.rows[0].count),
        total_amount: Number(totalAmount.rows[0].total),
        total_users: Number(totalUsers.rows[0].count),
        total_ca: Number(totalCA.rows[0].count),
        total_banks: Number(totalBanks.rows[0].count),
      },
      recent: recentApplications.rows,
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};


export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        la.*,
        u.full_name AS user_name,
        b.bank_name AS bank_name
      FROM loan_applications la
      LEFT JOIN users u ON la.user_id = u.id
      LEFT JOIN banks b ON la.bank_id = b.id
      ORDER BY la.created_at DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error("getAllApplications error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const applicationResult = await pool.query(
  `
  SELECT
    la.*,

    u.full_name AS user_name,
    u.email AS user_email,

    b.bank_name AS bank_name,

    dsa.full_name AS dsa_name,
    dsa.email AS dsa_email,
    dp.agency_name AS agency_name

  FROM loan_applications la

  LEFT JOIN users u 
    ON la.user_id = u.id

  LEFT JOIN banks b 
    ON la.bank_id = b.id

  LEFT JOIN users dsa
    ON la.dsa_id = dsa.id

  LEFT JOIN dsa_profiles dp
    ON dp.user_id = dsa.id

  WHERE la.id = $1
  `,
  [id]
);

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    const remarksResult = await pool.query(
      `
      SELECT
        ar.*,
        u.full_name AS admin_name
      FROM application_remarks ar
      LEFT JOIN users u ON ar.admin_id = u.id
      WHERE ar.application_id = $1
      ORDER BY ar.created_at DESC
      `,
      [id]
    );

    return res.json({
      application: applicationResult.rows[0],
      remarks: remarksResult.rows,
    });
  } catch (err) {
    console.error("getApplicationById error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateApplicationStatus = async (
  req: any,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    await pool.query(
      `
      UPDATE loan_applications
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [status, id]
    );

    if (remark && remark.trim()) {
      await pool.query(
        `
        INSERT INTO application_remarks (
          application_id,
          admin_id,
          status,
          remark
        )
        VALUES ($1, $2, $3, $4)
        `,
        [id, req.user?.id ?? null, status, remark.trim()]
      );
    }

   return res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("updateApplicationStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const sendApplicationToBanker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, subject } = req.body;

    if (!email || !email.trim() || !subject || !subject.trim()) {
      return res.status(400).json({ message: "Email and subject are required" });
    }

    const result = await pool.query(
      `
      SELECT
        la.*,
        u.full_name AS user_name,
        b.bank_name AS bank_name
      FROM loan_applications la
      LEFT JOIN users u ON la.user_id = u.id
      LEFT JOIN banks b ON la.bank_id = b.id
      WHERE la.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    const application = result.rows[0];

    if ((application.status || "").toLowerCase() !== "approved") {
      return res.status(400).json({
        message: "Only approved applications can be sent to bankers",
      });
    }

  // Build a single zip attachment from the documents jsonb column
    const documentNames: string[] = [];
    const documents = application.documents || {};

    const filesToZip: { absolutePath: string; zipEntryName: string }[] = [];

    for (const key of Object.keys(documents)) {
      const doc = documents[key];
      if (!doc?.filePath) continue;

      const cleanPath = String(doc.filePath).replace(/^\/+/, "");
      const absolutePath = path.join(UPLOAD_ROOT, cleanPath);

      documentNames.push(doc.name || key);

      if (fs.existsSync(absolutePath)) {
        const ext = path.extname(absolutePath);
        const baseName = doc.name ? doc.name.replace(ext, "") : key;
        filesToZip.push({
          absolutePath,
          zipEntryName: `${key}_${baseName}${ext}`,
        });
      } else {
        console.warn(`sendApplicationToBanker: file not found on disk -> ${absolutePath}`);
      }
    }

    // Build the zip in memory
    const zip = new JSZip();

    for (const file of filesToZip) {
      const fileBuffer = fs.readFileSync(file.absolutePath);
      zip.file(file.zipEntryName, fileBuffer);
    }

    const zipBuffer: Buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    const zipAttachment = {
      filename: `application_${application.application_number || id}_documents.zip`,
      content: zipBuffer,
    };

    await sendApplicationToBankerEmail(
      email.trim(),
      subject.trim(),
      application,
      documentNames,
      [zipAttachment]
    );

    return res.json({
      success: true,
      message: "Application details sent to banker successfully",
    });
  } catch (err) {
    console.error("sendApplicationToBanker error:", err);
    return res.status(500).json({
      message: "Failed to send application to banker",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        mobile,
        role,
        is_verified,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Delete CA profile (if exists)
    await client.query(
      `DELETE FROM ca_profiles
       WHERE user_id = $1`,
      [id]
    );

    // Delete loan applications created by this customer
    await client.query(
      `DELETE FROM loan_applications
       WHERE user_id = $1`,
      [id]
    );

    // Remove this CA from loan applications
    await client.query(
      `UPDATE loan_applications
       SET ca_id = NULL
       WHERE ca_id = $1`,
      [id]
    );

    // Remove created_by reference
    await client.query(
      `UPDATE users
       SET created_by = NULL
       WHERE created_by = $1`,
      [id]
    );

    // Finally delete the user
    const result = await client.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "User not found",
      });
    }

    await client.query("COMMIT");

    return res.json({
      message: "User deleted successfully",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteUser error:", err);

    return res.status(500).json({
      message: "Failed to delete user",
    });

  } finally {
    client.release();
  }
};
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE users
      SET is_active = NOT COALESCE(is_active, true)
      WHERE id = $1
      RETURNING id, is_active
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User status updated",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("toggleUserStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getBanks = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        bank_name AS name,
        created_at,
        is_active
      FROM banks
      ORDER BY bank_name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("getBanks error:", err);
    res.status(500).json({
      message: "Server error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const addBank = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Bank name is required" });
    }

    const existing = await pool.query(
      `SELECT id FROM banks WHERE LOWER(bank_name) = LOWER($1)`,
      [name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Bank already exists" });
    }

    const result = await pool.query(
      `
      INSERT INTO banks (bank_name)
      VALUES ($1)
      RETURNING
        id,
        bank_name AS name,
        created_at,
        is_active
      `,
      [name.trim()]
    );

    res.json({
      message: "Bank added successfully",
      bank: result.rows[0],
    });
  } catch (err) {
    console.error("addBank error:", err);
    res.status(500).json({
      message: "Server error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateBank = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    await pool.query(
      `
      UPDATE banks
      SET bank_name = $1, is_active = $2
      WHERE id = $3
      `,
      [name, is_active, id]
    );

    res.json({ message: "Bank updated successfully" });
  } catch (err) {
    console.error("updateBank error:", err);
    res.status(500).json({
      message: "Failed to update bank",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteBank = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM banks
      WHERE id = $1
      RETURNING id, bank_name
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Bank not found",
      });
    }

    return res.json({
      message: "Bank deleted successfully",
      bank: result.rows[0],
    });
  } catch (err) {
    console.error("deleteBank error:", err);

    return res.status(500).json({
      message: "Failed to delete bank",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAdminProfile = async (req: any, res: Response) => {
  try {
    const adminId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        mobile,
        role
      FROM users
      WHERE id::text = $1
      LIMIT 1
      `,
      [String(adminId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("getAdminProfile error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateAdminProfile = async (req: any, res: Response) => {
  try {
    const adminId = req.user.id;
    const { full_name, email, mobile } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        email = $2,
        mobile = $3
      WHERE id::text = $4
      RETURNING id, full_name, email, mobile, role
      `,
      [full_name, email, mobile, String(adminId)]
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateAdminProfile error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getCAById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
          u.id,
          u.full_name,
          u.email,
          u.mobile,
          u.role,
          u.is_active,

          cp.firm_name,
          cp.membership_number,
          cp.enrollment_date,
          cp.pan_number,
          cp.aadhaar_number,
          cp.office_address,
          cp.city,
          cp.state,
          cp.pincode,
          cp.certificate_path,
          cp.profile_completed

      FROM users u
      LEFT JOIN ca_profiles cp
          ON cp.user_id = u.id

      WHERE u.id = $1
      AND u.role = 'ca'
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "CA not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Get CA Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateCA = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const {
      full_name,
      email,
      mobile,
      firm_name,
      membership_number,
      enrollment_date,
      pan_number,
      aadhaar_number,
      office_address,
      city,
      state,
      pincode,
      certificate,
    } = req.body;

    // Check if CA exists
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'ca'`,
      [id]
    );

    if (userCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "CA not found",
      });
    }

    // Get existing certificate
    let certificatePath: string | null = null;

    const existingProfile = await client.query(
      `SELECT certificate_path FROM ca_profiles WHERE user_id = $1`,
      [id]
    );

    if (
      existingProfile.rowCount &&
      existingProfile.rows[0].certificate_path
    ) {
      certificatePath = existingProfile.rows[0].certificate_path;
    }

    // Replace with new uploaded certificate if provided
    if (certificate?.dataUrl) {
      certificatePath = certificate.dataUrl;
    }

    // Update users table
    await client.query(
      `
      UPDATE users
      SET
        full_name = $1,
        email = $2,
        mobile = $3
      WHERE id = $4
      `,
      [full_name, email, mobile, id]
    );

    // Check if CA profile exists
    const profile = await client.query(
      `SELECT id FROM ca_profiles WHERE user_id = $1`,
      [id]
    );

    if (profile.rowCount === 0) {
      // Insert new profile
      await client.query(
        `
        INSERT INTO ca_profiles (
          user_id,
          firm_name,
          membership_number,
          enrollment_date,
          pan_number,
          aadhaar_number,
          office_address,
          city,
          state,
          pincode,
          certificate_path,
          profile_completed
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true
        )
        `,
        [
          id,
          firm_name,
          membership_number,
          enrollment_date || null,
          pan_number,
          aadhaar_number,
          office_address,
          city,
          state,
          pincode,
          certificatePath,
        ]
      );
    } else {
      // Update existing profile
      await client.query(
        `
        UPDATE ca_profiles
        SET
          firm_name = $1,
          membership_number = $2,
          enrollment_date = $3,
          pan_number = $4,
          aadhaar_number = $5,
          office_address = $6,
          city = $7,
          state = $8,
          pincode = $9,
          certificate_path = $10,
          profile_completed = true
        WHERE user_id = $11
        `,
        [
          firm_name,
          membership_number,
          enrollment_date || null,
          pan_number,
          aadhaar_number,
          office_address,
          city,
          state,
          pincode,
          certificatePath,
          id,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "CA updated successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update CA Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update CA",
    });
  } finally {
    client.release();
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      email,
      mobile,
      role,
      setupMethod,
      password,
    } = req.body;

    if (!full_name || !email || !mobile || !role) {
      return res.status(400).json({
        error: "Full name, email, mobile and role are required",
      });
    }

   const validRoles = await getValidRoles();

    if (!validRoles.includes(String(role).toLowerCase())) {
      return res.status(400).json({
        error: "Invalid role",
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1 OR mobile = $2
      `,
      [email, mobile]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "User already exists",
      });
    }

    // =====================================
    // OPTION 1 : SEND SET PASSWORD EMAIL
    // =====================================
    if (setupMethod === "email") {
      const setupToken = crypto
        .randomBytes(32)
        .toString("hex");

      const setupTokenExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      const tempPasswordHash = await bcrypt.hash(
  crypto.randomBytes(16).toString("hex"),
  10
);

await pool.query(
`
INSERT INTO users
(
  full_name,
  email,
  mobile,
  password_hash,
  role,
  is_verified,
  is_active,
  setup_token,
  setup_token_expires
)
VALUES
(
  $1,$2,$3,$4,$5,false,true,$6,$7
)
`,
[
  full_name,
  email,
  mobile,
  tempPasswordHash,
  role,
  setupToken,
  setupTokenExpires,
]
);

      const setupLink =
        `${process.env.FRONTEND_URL}/setup-password?token=${setupToken}`;

     console.log("Sending email to:", email);
console.log("Setup link:", setupLink);

await sendSetupPasswordEmail(
  email,
  full_name,
  setupLink
);

console.log("Email sent successfully");

      return res.status(201).json({
        success: true,
        message:
          "User created successfully. Setup password email sent.",
      });
    }

    // =====================================
    // OPTION 2 : ADMIN SETS PASSWORD
    // =====================================
    if (setupMethod === "manual") {
      if (!password) {
        return res.status(400).json({
          error: "Password is required",
        });
      }

      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      await pool.query(
        `
        INSERT INTO users
        (
          full_name,
          email,
          mobile,
          password_hash,
          role,
          is_verified,
          is_active
        )
        VALUES
        (
          $1,$2,$3,$4,$5,true,true
        )
        `,
        [
          full_name,
          email,
          mobile,
          hashedPassword,
          role,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          "User created successfully.",
      });
    }

    return res.status(400).json({
      error: "Invalid setup method",
    });

  } catch (error: any) {
    console.error("Create User Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
/* ===========================
   GET SINGLE USER
=========================== */

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        role
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("getUserById error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    // Check user exists
    const user = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [hashedPassword, id]
    );

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Server error",
    });
  }
};

/* ===========================
   UPDATE USER
=========================== */

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        message: "Name, Email and Role are required",
      });
    }

   const validRoles = await getValidRoles();

    if (!validRoles.includes(String(role).toLowerCase())) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Check if another user already has this email
    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      AND id <> $2
      `,
      [email, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        email = $2,
        role = $3
      WHERE id = $4
      RETURNING
        id,
        full_name,
        email,
        role
      `,
      [
        full_name,
        email,
        role,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("updateUser error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const getDSAById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
          u.id,
          u.full_name,
          u.email,
          u.mobile,
          u.role,
          u.is_active,
dp.agency_name AS firm_name,
dp.dsa_code AS membership_number,
dp.empanelment_date AS enrollment_date,
          dp.pan_number,
          dp.aadhaar_number,
          dp.office_address,
          dp.city,
          dp.state,
          dp.pincode,
          dp.certificate_path,
          dp.profile_completed

      FROM users u
      LEFT JOIN dsa_profiles dp
        ON dp.user_id = u.id

      WHERE u.id = $1
        AND u.role = 'dsa'
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "DSA not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Get DSA Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateDSA = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      full_name,
      email,
      mobile,
      role,
      agency_name,
      dsa_code,
      empanelment_date,
      pan_number,
      aadhaar_number,
      office_address,
      city,
      state,
      pincode,
      certificate,
    } = req.body;

    // ── SERVER-SIDE VALIDATION ──
    // This is what stops a bad/incomplete request from ever reaching
    // the database and crashing with a NOT NULL violation.
    const required: Record<string, unknown> = {
      full_name,
      email,
      mobile,
      agency_name,
      dsa_code,
      empanelment_date,
      pan_number,
      aadhaar_number,
      office_address,
      city,
      state,
      pincode,
    };

    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || String(v).trim() === "")
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    await client.query("BEGIN");

    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'dsa'`,
      [id]
    );

    if (userCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "DSA not found" });
    }

    let certificatePath: string | null = null;

    const existingProfile = await client.query(
      `SELECT certificate_path FROM dsa_profiles WHERE user_id = $1`,
      [id]
    );

    if (existingProfile.rowCount && existingProfile.rows[0].certificate_path) {
      certificatePath = existingProfile.rows[0].certificate_path;
    }

    if (certificate?.dataUrl) {
      certificatePath = certificate.dataUrl;
    }

    await client.query(
      `
      UPDATE users
      SET full_name = $1, email = $2, mobile = $3, role = COALESCE($4, role)
      WHERE id = $5
      `,
      [full_name, email, mobile, role || null, id]
    );

    if (existingProfile.rowCount === 0) {
      await client.query(
        `
        INSERT INTO dsa_profiles (
          user_id, agency_name, dsa_code, empanelment_date, pan_number,
          aadhaar_number, office_address, city, state, pincode,
          certificate_path, profile_completed
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
        `,
        [
          id, agency_name, dsa_code, empanelment_date,
          String(pan_number).toUpperCase(), aadhaar_number,
          office_address, city, state, pincode, certificatePath,
        ]
      );
    } else {
      await client.query(
        `
        UPDATE dsa_profiles
        SET
          agency_name = $1, dsa_code = $2, empanelment_date = $3,
          pan_number = $4, aadhaar_number = $5, office_address = $6,
          city = $7, state = $8, pincode = $9, certificate_path = $10,
          profile_completed = true
        WHERE user_id = $11
        `,
        [
          agency_name, dsa_code, empanelment_date,
          String(pan_number).toUpperCase(), aadhaar_number,
          office_address, city, state, pincode, certificatePath, id,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({ success: true, message: "DSA updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update DSA Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update DSA" });
  } finally {
    client.release();
  }
};
