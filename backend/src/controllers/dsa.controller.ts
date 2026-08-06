// Path: backend/src/controllers/dsa.controller.ts

import { Request, Response } from "express";
import { pool } from "../config/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import bcrypt from "bcryptjs"; // 👈 needed to hash manually-set passwords
import { sendSetupPasswordEmail } from "../services/email.service";
import path from "path";
import fs from "fs";
import { DSARequest } from "../middleware/dsaAuth.middleware";

/* ─────────────────────────────────────────────
   HELPER: Save base64 file to disk
───────────────────────────────────────────── */
function saveBase64File(
  base64DataUrl: string,
  originalName: string,
  folder: string
): string {
  const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 data");

  const ext      = originalName.split(".").pop() || "bin";
  const fileName = `${uuidv4()}_${Date.now()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "uploads", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));

  return `uploads/${folder}/${fileName}`;
}

/* ─────────────────────────────────────────────
   GET DSA PROFILE
───────────────────────────────────────────── */
export const getDsaProfile = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const result = await pool.query(
      `SELECT dp.*, u.full_name, u.email, u.mobile
       FROM dsa_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, profile_completed: false });
    }

    return res.json({ success: true, data: result.rows[0], profile_completed: result.rows[0].profile_completed });
  } catch (error: any) {
    console.error("Get DSA Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   SAVE / UPDATE DSA PROFILE
───────────────────────────────────────────── */
export const saveDsaProfile = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const {
      agency_name, dsa_code, empanelment_date,
      pan_number, aadhaar_number, office_address,
      city, state, pincode, certificate,
    } = req.body;

    const missing: string[] = [];
    if (!agency_name)       missing.push("agency_name");
    if (!dsa_code)          missing.push("dsa_code");
    if (!empanelment_date)  missing.push("empanelment_date");
    if (!pan_number)        missing.push("pan_number");
    if (!aadhaar_number)    missing.push("aadhaar_number");
    if (!office_address)    missing.push("office_address");
    if (!city)              missing.push("city");
    if (!state)             missing.push("state");
    if (!pincode)           missing.push("pincode");

    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: `Missing: ${missing.join(", ")}` });
    }

    let certificatePath = "";
    if (certificate?.dataUrl) {
      try {
        certificatePath = saveBase64File(certificate.dataUrl, certificate.name, "dsa_certificates");
      } catch (e) {
        console.error("Certificate save error:", e);
      }
    }

    const existing = await pool.query(
      "SELECT id, certificate_path FROM dsa_profiles WHERE user_id = $1",
      [user_id]
    );

    if (existing.rows.length > 0) {
      const finalCertPath = certificatePath || existing.rows[0].certificate_path || "";
      await pool.query(
        `UPDATE dsa_profiles SET
          agency_name = $1, dsa_code = $2, empanelment_date = $3,
          pan_number = $4, aadhaar_number = $5, office_address = $6,
          city = $7, state = $8, pincode = $9,
          certificate_path = $10, profile_completed = true
         WHERE user_id = $11`,
        [agency_name, dsa_code, empanelment_date, pan_number.toUpperCase(),
         aadhaar_number, office_address, city, state, pincode, finalCertPath, user_id]
      );
    } else {
      await pool.query(
        `INSERT INTO dsa_profiles (
          id, user_id, agency_name, dsa_code, empanelment_date,
          pan_number, aadhaar_number, office_address, city, state, pincode,
          certificate_path, profile_completed, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW())`,
        [uuidv4(), user_id, agency_name, dsa_code, empanelment_date,
         pan_number.toUpperCase(), aadhaar_number, office_address, city, state,
         pincode, certificatePath]
      );
    }

    return res.json({ success: true, message: "Profile saved successfully." });
  } catch (error: any) {
    console.error("Save DSA Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   DSA DASHBOARD STATS
───────────────────────────────────────────── */
export const getDsaDashboard = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const stats = await pool.query(
      `SELECT
         COUNT(*)                                         AS total,
         COUNT(*) FILTER (WHERE status = 'approved')     AS approved,
         COUNT(*) FILTER (WHERE status = 'pending')      AS pending,
         COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected,
         COALESCE(SUM(loan_amount), 0)                   AS total_amount
       FROM loan_applications WHERE dsa_id = $1`,
      [user_id]
    );

    const recent = await pool.query(
      `SELECT la.id, la.full_name, la.loan_type, la.loan_amount,
              la.tenure, la.status, la.created_at, b.bank_name
       FROM loan_applications la
       LEFT JOIN banks b ON b.id = la.bank_id
       WHERE la.dsa_id = $1
       ORDER BY la.created_at DESC LIMIT 5`,
      [user_id]
    );

    return res.json({ success: true, stats: stats.rows[0], recent: recent.rows });
  } catch (error: any) {
    console.error("DSA Dashboard Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   GET DSA LOANS — with search & filters
───────────────────────────────────────────── */
export const getDsaLoans = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const { search, bank, loan_type, pincode, status, partner } = req.query;

    let query = `
      SELECT la.id, la.full_name, la.email, la.mobile,
             la.loan_type, la.loan_amount, la.tenure,
             la.status, la.pincode, la.created_at,
             la.dsa_name, la.dsa_email, la.dsa_agency,
             la.employment_type, la.loan_purpose, b.bank_name
      FROM loan_applications la
      LEFT JOIN banks b ON b.id = la.bank_id
      WHERE la.dsa_id = $1
    `;

    const params: any[] = [user_id];
    let idx = 2;

    if (search)    { query += ` AND LOWER(la.full_name) LIKE LOWER($${idx})`; params.push(`%${search}%`); idx++; }
    if (bank)      { query += ` AND LOWER(b.bank_name) LIKE LOWER($${idx})`; params.push(`%${bank}%`); idx++; }
    if (loan_type) { query += ` AND la.loan_type = $${idx}`; params.push(loan_type); idx++; }
    if (pincode)   { query += ` AND la.pincode LIKE $${idx}`; params.push(`%${pincode}%`); idx++; }
    if (status)    { query += ` AND la.status = $${idx}`; params.push(status); idx++; }
    if (partner)   { query += ` AND LOWER(la.dsa_name) LIKE LOWER($${idx})`; params.push(`%${partner}%`); idx++; }

    query += ` ORDER BY la.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error("Get DSA Loans Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   DSA APPLY LOAN FOR CUSTOMER
───────────────────────────────────────────── */
export const dsaApplyLoan = async (req: DSARequest, res: Response) => {
  try {
    const dsa_user_id = req.user?.id;
    if (!dsa_user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const dsaProfile = await pool.query(
      `SELECT dp.agency_name, u.full_name, u.email
       FROM dsa_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1 AND dp.profile_completed = true`,
      [dsa_user_id]
    );

    if (dsaProfile.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Please complete your DSA profile first." });
    }

    const dsa = dsaProfile.rows[0];
    console.log("DSA DATA:", dsa);

    const {
      bank_id, loan_service, loan_type, employment_type,
      loan_amount, tenure, aadhaar_number, pan_number, gst_number,
      full_name, email, mobile, dob,
      address, city, state, pincode, annual_income,
      co_applicant_name, co_applicant_aadhaar, co_applicant_pan,
      vehicle_details, documents,
    } = req.body;

    const missing: string[] = [];
    if (!bank_id)                    missing.push("bank_id");
    if (!loan_service && !loan_type) missing.push("loan_service");
    if (!employment_type)            missing.push("employment_type");
    if (!loan_amount)                missing.push("loan_amount");
    if (!tenure)                     missing.push("tenure");
    if (!aadhaar_number)             missing.push("aadhaar_number");
    if (!pan_number)                 missing.push("pan_number");
    if (!full_name)                  missing.push("full_name");

    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: `Missing: ${missing.join(", ")}` });
    }

    const bankCheck = await pool.query("SELECT id FROM banks WHERE id = $1", [bank_id]);
    if (bankCheck.rowCount === 0) {
      return res.status(400).json({ success: false, message: "Selected bank does not exist." });
    }

    const applicationId = uuidv4();
    const finalLoanType = loan_service || loan_type || "personal";

    const documentMeta: Record<string, { name: string; uploadedAt: string; filePath: string }> = {};
    if (documents && typeof documents === "object") {
      for (const [docKey, docData] of Object.entries(documents as Record<string, any>)) {
        if (!docData) continue;
        let savedPath = "";
        if (docData.dataUrl) {
          try { savedPath = saveBase64File(docData.dataUrl, docData.name, `documents/${applicationId}`); }
          catch (e) { console.error(`Failed to save ${docKey}:`, e); }
        }
        documentMeta[docKey] = {
          name:       docData.name,
          uploadedAt: docData.uploadedAt || new Date().toLocaleDateString("en-IN"),
          filePath:   savedPath,
        };
      }
    }

    const result = await pool.query(
      `INSERT INTO loan_applications (
        id, user_id, bank_id, loan_type, employment_type,
        loan_amount, tenure, aadhaar_number, pan_number, gst_number,
        full_name, email, mobile, dob,
        address, city, state, pincode, annual_income, loan_purpose,
        co_applicant_name, co_applicant_aadhaar, co_applicant_pan,
        vehicle_details, documents,
        dsa_id, dsa_name, dsa_email, dsa_agency, applied_by,
        status, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,'dsa',
        'pending',NOW()
      ) RETURNING *`,
      [
        applicationId, dsa_user_id, bank_id, finalLoanType, employment_type,
        Number(loan_amount), tenure, aadhaar_number, pan_number, gst_number || null,
        full_name, email || null, mobile || null, dob || null,
        address || null, city || null, state || null, pincode || null,
        annual_income ? Number(annual_income) : null, finalLoanType,
        co_applicant_name || null, co_applicant_aadhaar || null, co_applicant_pan || null,
        vehicle_details || null, JSON.stringify(documentMeta),
        dsa_user_id, dsa.full_name, dsa.email, dsa.agency_name,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully on behalf of customer.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("DSA Apply Loan Error:", error);
    if (error.code === "23503") return res.status(400).json({ success: false, message: "Reference not found." });
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   GET SINGLE APPLICATION — DSA
───────────────────────────────────────────── */
export const getDsaApplicationById = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id }  = req.params;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const result = await pool.query(
      `SELECT la.*, b.bank_name
       FROM loan_applications la
       LEFT JOIN banks b ON b.id = la.bank_id
       WHERE la.id = $1 AND la.dsa_id = $2`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("DSA Get Application Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   UPDATE APPLICATION — DSA (pending only)
───────────────────────────────────────────── */
export const updateDsaApplication = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id }  = req.params;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const existing = await pool.query(
      "SELECT id, status FROM loan_applications WHERE id = $1 AND dsa_id = $2",
      [id, user_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    if (existing.rows[0].status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending applications can be edited." });
    }

    const {
      full_name, email, mobile, dob,
      employment_type, annual_income,
      address, city, state, pincode,
      bank_id, loan_service, loan_amount, tenure,
      loan_purpose, vehicle_details,
      co_applicant_name, co_applicant_aadhaar, co_applicant_pan,
      documents,
    } = req.body;

    if (bank_id) {
      const bankCheck = await pool.query("SELECT id FROM banks WHERE id = $1", [bank_id]);
      if (bankCheck.rowCount === 0) {
        return res.status(400).json({ success: false, message: "Selected bank does not exist." });
      }
    }

    const documentMeta = documents && typeof documents === "object"
      ? JSON.stringify(documents) : null;

    await pool.query(
      `UPDATE loan_applications SET
        full_name            = COALESCE($1,  full_name),
        email                = COALESCE($2,  email),
        mobile               = COALESCE($3,  mobile),
        dob                  = COALESCE($4,  dob),
        employment_type      = COALESCE($5,  employment_type),
        annual_income        = COALESCE($6,  annual_income),
        address              = COALESCE($7,  address),
        city                 = COALESCE($8,  city),
        state                = COALESCE($9,  state),
        pincode              = COALESCE($10, pincode),
        bank_id              = COALESCE($11, bank_id),
        loan_type            = COALESCE($12, loan_type),
        loan_amount          = COALESCE($13, loan_amount),
        tenure               = COALESCE($14, tenure),
        loan_purpose         = COALESCE($15, loan_purpose),
        vehicle_details      = COALESCE($16, vehicle_details),
        co_applicant_name    = COALESCE($17, co_applicant_name),
        co_applicant_aadhaar = COALESCE($18, co_applicant_aadhaar),
        co_applicant_pan     = COALESCE($19, co_applicant_pan),
        documents            = COALESCE($20::jsonb, documents),
        updated_at           = NOW()
       WHERE id = $21 AND dsa_id = $22`,
      [
        full_name || null, email || null, mobile || null, dob || null,
        employment_type || null,
        annual_income ? Number(annual_income) : null,
        address || null, city || null, state || null, pincode || null,
        bank_id || null, loan_service || null,
        loan_amount ? Number(loan_amount) : null,
        tenure || null, loan_purpose || null, vehicle_details || null,
        co_applicant_name || null, co_applicant_aadhaar || null, co_applicant_pan || null,
        documentMeta, id, user_id,
      ]
    );

    return res.json({ success: true, message: "Application updated successfully." });
  } catch (error: any) {
    console.error("DSA Update Application Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   UPDATE DSA PERSONAL INFO (name / email / mobile)
   These fields live on the `users` table, not
   `dsa_profiles`, so they need their own endpoint.
───────────────────────────────────────────── */
export const updateDsaPersonalInfo = async (req: DSARequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const { full_name, email, mobile } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: "Full name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    // Make sure no other user already has this email
    const emailCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, user_id]
    );
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: "This email is already in use by another account." });
    }

    const result = await pool.query(
      `UPDATE users
         SET full_name = $1, email = $2, mobile = $3
       WHERE id = $4
       RETURNING id, full_name, email, mobile, role`,
      [full_name.trim(), email.trim(), mobile ? mobile.trim() : null, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      message: "Personal information updated successfully.",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Update DSA Personal Info Error:", error);
    if (error.code === "23505") {
      return res.status(400).json({ success: false, message: "This email is already in use." });
    }
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   CREATE NEW DSA
   Supports two setup_method values sent from the frontend:
     - "email"  → sends a password-setup link (original behaviour)
     - "manual" → DSA is created with a password set right now,
                  no email is sent, password_created = true
───────────────────────────────────────────── */
export const createDsa = async (
  req: DSARequest,
  res: Response
) => {
  try {

    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const {
      full_name,
      email,
      mobile,
      setup_method, // "email" | "manual"
      password,     // only present when setup_method === "manual"
    } = req.body;

    if (!full_name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and mobile are required."
      });
    }

    const method = setup_method === "manual" ? "manual" : "email";

    if (method === "manual") {
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters."
        });
      }
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (existing.rowCount) {
      return res.status(400).json({
        success: false,
        message: "Email already exists."
      });
    }

    const newUserId = uuidv4();

    let result;

    if (method === "manual") {
      // Hash the password now, no setup token/email needed
      const passwordHash = await bcrypt.hash(password, 10);

      result = await pool.query(
        `
        INSERT INTO users
        (
          id,
          full_name,
          email,
          mobile,
          role,
          is_verified,
          is_active,
          created_by,
          password_hash,
          password_created,
          setup_token,
          setup_token_expires
        )
        VALUES
        (
          $1, $2, $3, $4, 'dsa', false, true, $5, $6, true, NULL, NULL
        )
        RETURNING id, full_name, email, mobile, is_verified, is_active, password_created, created_at
        `,
        [newUserId, full_name, email, mobile, creatorId, passwordHash]
      );

    } else {
      // Original flow: send a password setup link via email
      const setupToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      result = await pool.query(
        `
        INSERT INTO users
        (
          id,
          full_name,
          email,
          mobile,
          role,
          is_verified,
          is_active,
          created_by,
          setup_token,
          setup_token_expires
        )
        VALUES
        (
          $1, $2, $3, $4, 'dsa', false, true, $5, $6, $7
        )
        RETURNING id, full_name, email, mobile, is_verified, is_active, password_created, created_at
        `,
        [newUserId, full_name, email, mobile, creatorId, setupToken, expires]
      );

      const setupLink = `${process.env.FRONTEND_URL}/set-password?token=${setupToken}`;

      await sendSetupPasswordEmail(email, full_name, setupLink);
    }

    return res.json({
      success: true,
      message:
        method === "manual"
          ? "DSA created successfully with password set."
          : "DSA created successfully. Password setup email sent.",
      data: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};

/* ─────────────────────────────────────────────
   GET ALL CREATED DSAs
───────────────────────────────────────────── */
export const getCreatedDsas = async (
  req: DSARequest,
  res: Response
) => {
  try {

    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        mobile,
        is_verified,
        is_active,
        password_created,
        created_at
      FROM users
      WHERE
        role = 'dsa'
        AND created_by = $1
      ORDER BY created_at DESC
      `,
      [creatorId]
    );

    return res.json({
      success: true,
      total: result.rowCount,
      data: result.rows
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};