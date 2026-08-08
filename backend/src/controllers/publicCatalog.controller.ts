import { Request, Response } from "express";
import { pool } from "../config/db";

export const getPublicLoanServices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM loan_services WHERE is_active = true ORDER BY name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getPublicLoanServices error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPublicEmploymentTypes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM employment_types WHERE is_active = true ORDER BY name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getPublicEmploymentTypes error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPublicStates = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, state_name, state_code FROM states WHERE is_active = true ORDER BY state_name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getPublicStates error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPublicLoanTenures = async (req: Request, res: Response) => {
  try {
    const { loan_service_id } = req.query;
    if (!loan_service_id) {
      return res.status(400).json({ success: false, message: "loan_service_id is required" });
    }
    const result = await pool.query(
      `
      SELECT lt.id, lt.tenure_months, lt.display_name
      FROM loan_tenures lt
      JOIN loan_tenure_loan_services ltls ON ltls.loan_tenure_id = lt.id
      WHERE ltls.loan_service_id = $1 AND lt.is_active = true
      ORDER BY lt.tenure_months ASC
      `,
      [loan_service_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getPublicLoanTenures error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getPublicDocumentTypes = async (req: Request, res: Response) => {
  try {
    const { loan_service_id, employment_type_id } = req.query;
    if (!loan_service_id) {
      return res.status(400).json({ success: false, message: "loan_service_id is required" });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT dt.id, dt.document_name, dt.is_required, dt.max_size_mb, dt.allowed_file_types
      FROM document_types dt
      JOIN document_type_loan_services dtls ON dtls.document_type_id = dt.id
      WHERE dtls.loan_service_id = $1
        AND dt.is_active = true
        AND (
          -- doc has NO employment types tagged -> visible to everyone
          NOT EXISTS (
            SELECT 1 FROM document_type_employment_types dtet
            WHERE dtet.document_type_id = dt.id
          )
          OR
          -- doc HAS employment types tagged -> must match the applicant's employment_type_id
          ($2::int IS NOT NULL AND EXISTS (
            SELECT 1 FROM document_type_employment_types dtet
            WHERE dtet.document_type_id = dt.id
              AND dtet.employment_type_id = $2::int
          ))
        )
      ORDER BY dt.id ASC
      `,
      [loan_service_id, employment_type_id || null]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getPublicDocumentTypes error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getPublicRoles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, role_name
      FROM roles
      WHERE is_active = true
      ORDER BY role_name
    `);

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success:false,
      message:"Server Error"
    });
  }
};