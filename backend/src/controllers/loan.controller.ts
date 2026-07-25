// Path: backend/src/controllers/loan.controller.ts

import { Response } from "express";
import { pool } from "../config/db";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../middleware/auth.middleware";

/* ─────────────────────────────────────────────
   HELPER: Save base64 file to local disk
───────────────────────────────────────────── */
function saveBase64File(
  base64DataUrl: string,
  originalName: string,
  docKey: string,
  applicationId: string
): string {
  const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 data");

  const ext      = originalName.split(".").pop() || "bin";
  const fileName = `${applicationId}__${docKey}__${Date.now()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "uploads", "documents", applicationId);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filePath   = path.join(uploadDir, fileName);
  const base64Data = matches[2];
  fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

  return `uploads/documents/${applicationId}/${fileName}`;
}

/* ─────────────────────────────────────────────
   APPLY LOAN
───────────────────────────────────────────── */
export const applyLoan = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const {
      bank_id, loan_service, loan_type, employment_type,
      loan_amount, tenure, aadhaar_number, pan_number, gst_number,
      full_name, email, mobile, dob,
      address, city, state, pincode, annual_income, loan_purpose,
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
          try { savedPath = saveBase64File(docData.dataUrl, docData.name, docKey, applicationId); }
          catch (e) { console.error(`Failed to save file for ${docKey}:`, e); }
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
        vehicle_details, documents, status, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,'pending',NOW()
      ) RETURNING *`,
      [
        applicationId, user_id, bank_id, finalLoanType, employment_type,
        Number(loan_amount), tenure, aadhaar_number, pan_number, gst_number || null,
        full_name || null, email || null, mobile || null, dob || null,
        address || null, city || null, state || null, pincode || null,
        annual_income ? Number(annual_income) : null, loan_purpose || finalLoanType,
        co_applicant_name || null, co_applicant_aadhaar || null, co_applicant_pan || null,
        vehicle_details || null, JSON.stringify(documentMeta),
      ]
    );

    return res.status(201).json({ success: true, message: "Loan application submitted successfully", data: result.rows[0] });

  } catch (error: any) {
    console.error("Loan Apply Error:", error);
    if (error.code === "23503") return res.status(400).json({ success: false, message: "User account not found." });
    if (error.code === "23505") return res.status(409).json({ success: false, message: "Duplicate application detected." });
    if (error.code === "42703") return res.status(500).json({ success: false, message: `Column missing: ${error.message}` });
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   GET MY APPLICATIONS
───────────────────────────────────────────── */
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const result = await pool.query(
      `SELECT la.id, la.loan_type, la.loan_amount, la.tenure, la.status,
              la.loan_purpose, la.employment_type, la.created_at, b.bank_name
       FROM loan_applications la
       LEFT JOIN banks b ON b.id = la.bank_id
       WHERE la.user_id = $1
       ORDER BY la.created_at DESC`,
      [user_id]
    );

    return res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error("Get My Applications Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   GET SINGLE APPLICATION — customer
───────────────────────────────────────────── */
export const getApplicationById = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id }  = req.params;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const result = await pool.query(
      `SELECT la.*, b.bank_name
       FROM loan_applications la
       LEFT JOIN banks b ON b.id = la.bank_id
       WHERE la.id = $1 AND la.user_id = $2`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("Get Application Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   UPDATE APPLICATION — customer (pending only)
───────────────────────────────────────────── */

const DOC_KEYS = [
  "pan_aadhaar", "bank_statement", "passport_photo", "co_applicant_kyc",
  "salary_slip", "itr_3years", "electricity_bill", "gst_registration",
  "udyam_registration", "property_paper", "seller_buyer_agreement",
  "vehicle_details_doc",
];

export const updateApplication = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id }  = req.params;
    if (!user_id) return res.status(401).json({ success: false, message: "Authentication required." });

    const existing = await pool.query(
      "SELECT id, status, documents FROM loan_applications WHERE id = $1 AND user_id = $2",
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
    } = req.body;

    if (bank_id) {
      const bankCheck = await pool.query("SELECT id FROM banks WHERE id = $1", [bank_id]);
      if (bankCheck.rowCount === 0) {
        return res.status(400).json({ success: false, message: "Selected bank does not exist." });
      }
    }

    const existingDocuments =
      existing.rows[0].documents && typeof existing.rows[0].documents === "object"
        ? existing.rows[0].documents
        : (existing.rows[0].documents ? JSON.parse(existing.rows[0].documents) : {});

    const mergedDocuments = { ...existingDocuments };

    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    uploadedFiles.forEach((file) => {
      if (!DOC_KEYS.includes(file.fieldname)) return;

      mergedDocuments[file.fieldname] = {
        name: file.originalname,
        url: `/uploads/documents/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      };
    });

    const hasNewDocs = uploadedFiles.length > 0;
    const documentMeta = hasNewDocs ? JSON.stringify(mergedDocuments) : null;

    const updateResult = await pool.query(
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
       WHERE id = $21 AND user_id = $22
       RETURNING documents`,
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

    const savedDocuments = updateResult.rows[0]?.documents || mergedDocuments;

    return res.json({
      success: true,
      message: "Application updated successfully.",
      data: { documents: savedDocuments },
    });
  } catch (error: any) {
    console.error("Update Application Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   GET BANKS
───────────────────────────────────────────── */
export const getBanks = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query("SELECT id, bank_name FROM banks ORDER BY bank_name");
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get Banks Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ─────────────────────────────────────────────
   GET USER PROFILE
───────────────────────────────────────────── */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, mobile, role, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ─────────────────────────────────────────────
   UPDATE USER PROFILE
───────────────────────────────────────────── */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { full_name, email, mobile } = req.body;

    await pool.query(
      `UPDATE users SET full_name = $1, email = $2, mobile = $3 WHERE id = $4`,
      [full_name, email, mobile, userId]
    );

    const updated = await pool.query(
      `SELECT id, full_name, email, mobile, role, created_at FROM users WHERE id = $1`,
      [userId]
    );

    return res.json({ success: true, message: "Profile updated successfully.", data: updated.rows[0] });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};