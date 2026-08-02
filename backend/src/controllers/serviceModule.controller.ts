import { Request, Response } from "express";
import { pool } from "../config/db";

/* ═══════════════════════════════════════════
   1. LOAN SERVICES
═══════════════════════════════════════════ */
export const getLoanServices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM loan_services ORDER BY name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getLoanServices error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createLoanService = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existing = await pool.query(
      `SELECT id FROM loan_services WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Loan service already exists" });
    }

    const result = await pool.query(
      `INSERT INTO loan_services (name, description) VALUES ($1, $2) RETURNING *`,
      [name.trim(), description || null]
    );

    return res.status(201).json({ success: true, message: "Loan service created", data: result.rows[0] });
  } catch (err) {
    console.error("createLoanService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateLoanService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE loan_services
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [name, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loan service not found" });
    }

    return res.json({ success: true, message: "Loan service updated", data: result.rows[0] });
  } catch (err) {
    console.error("updateLoanService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteLoanService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM loan_services WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loan service not found" });
    }
    return res.json({ success: true, message: "Loan service deleted" });
  } catch (err: any) {
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete: this loan service has linked documents or tenures. Remove those first.",
      });
    }
    console.error("deleteLoanService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════════
   2. DOCUMENT TYPES (linked to a loan service)
═══════════════════════════════════════════ */
export const getDocumentTypes = async (req: Request, res: Response) => {
  try {
    const { loan_service_id } = req.query;

    let query = `
      SELECT
        dt.*,
        ls.name AS loan_service_name
      FROM document_types dt
      LEFT JOIN loan_services ls ON dt.loan_service_id = ls.id
    `;
    const params: any[] = [];

    if (loan_service_id) {
      query += ` WHERE dt.loan_service_id = $1`;
      params.push(loan_service_id);
    }

    query += ` ORDER BY dt.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getDocumentTypes error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createDocumentType = async (req: Request, res: Response) => {
  try {
    const {
      loan_service_id,
      document_name,
      is_required,
      max_size_mb,
      allowed_file_types,
    } = req.body;

    if (!loan_service_id || !document_name || !document_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Loan service and document name are required",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM document_types WHERE loan_service_id = $1 AND LOWER(document_name) = LOWER($2)`,
      [loan_service_id, document_name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This document type already exists for the selected loan service",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO document_types
        (loan_service_id, document_name, is_required, max_size_mb, allowed_file_types)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        loan_service_id,
        document_name.trim(),
        is_required ?? true,
        max_size_mb ?? 5,
        JSON.stringify(allowed_file_types && allowed_file_types.length > 0 ? allowed_file_types : ["pdf", "jpg", "jpeg", "png"]),
      ]
    );

    return res.status(201).json({ success: true, message: "Document type created", data: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23503") {
      return res.status(400).json({ success: false, message: "Invalid loan service selected" });
    }
    console.error("createDocumentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateDocumentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      loan_service_id,
      document_name,
      is_required,
      is_active,
      max_size_mb,
      allowed_file_types,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE document_types
      SET loan_service_id = COALESCE($1, loan_service_id),
          document_name = COALESCE($2, document_name),
          is_required = COALESCE($3, is_required),
          is_active = COALESCE($4, is_active),
          max_size_mb = COALESCE($5, max_size_mb),
          allowed_file_types = COALESCE($6, allowed_file_types),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        loan_service_id,
        document_name,
        is_required,
        is_active,
        max_size_mb,
        allowed_file_types ? JSON.stringify(allowed_file_types) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Document type not found" });
    }

    return res.json({ success: true, message: "Document type updated", data: result.rows[0] });
  } catch (err) {
    console.error("updateDocumentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export const deleteDocumentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM document_types WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Document type not found" });
    }
    return res.json({ success: true, message: "Document type deleted" });
  } catch (err) {
    console.error("deleteDocumentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════════
   3. EMPLOYMENT TYPES
═══════════════════════════════════════════ */
export const getEmploymentTypes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM employment_types ORDER BY name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getEmploymentTypes error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createEmploymentType = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existing = await pool.query(
      `SELECT id FROM employment_types WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Employment type already exists" });
    }

    const result = await pool.query(
      `INSERT INTO employment_types (name, description) VALUES ($1, $2) RETURNING *`,
      [name.trim(), description || null]
    );

    return res.status(201).json({ success: true, message: "Employment type created", data: result.rows[0] });
  } catch (err) {
    console.error("createEmploymentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateEmploymentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE employment_types
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [name, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employment type not found" });
    }

    return res.json({ success: true, message: "Employment type updated", data: result.rows[0] });
  } catch (err) {
    console.error("updateEmploymentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteEmploymentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM employment_types WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employment type not found" });
    }
    return res.json({ success: true, message: "Employment type deleted" });
  } catch (err) {
    console.error("deleteEmploymentType error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════════
   4. STATES
═══════════════════════════════════════════ */
export const getStates = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM states ORDER BY state_name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getStates error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createState = async (req: Request, res: Response) => {
  try {
    const { state_name, state_code } = req.body;
    if (!state_name || !state_name.trim()) {
      return res.status(400).json({ success: false, message: "State name is required" });
    }

    const existing = await pool.query(
      `SELECT id FROM states WHERE LOWER(state_name) = LOWER($1)`,
      [state_name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "State already exists" });
    }

    const result = await pool.query(
      `INSERT INTO states (state_name, state_code) VALUES ($1, $2) RETURNING *`,
      [state_name.trim(), state_code || null]
    );

    return res.status(201).json({ success: true, message: "State created", data: result.rows[0] });
  } catch (err) {
    console.error("createState error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { state_name, state_code, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE states
      SET state_name = COALESCE($1, state_name),
          state_code = COALESCE($2, state_code),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [state_name, state_code, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "State not found" });
    }

    return res.json({ success: true, message: "State updated", data: result.rows[0] });
  } catch (err) {
    console.error("updateState error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM states WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "State not found" });
    }
    return res.json({ success: true, message: "State deleted" });
  } catch (err) {
    console.error("deleteState error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════════
   5. LOAN TENURES (linked to a loan service)
═══════════════════════════════════════════ */
export const getLoanTenures = async (req: Request, res: Response) => {
  try {
    const { loan_service_id } = req.query;

    let query = `
      SELECT
        lt.*,
        ls.name AS loan_service_name
      FROM loan_tenures lt
      LEFT JOIN loan_services ls ON lt.loan_service_id = ls.id
    `;
    const params: any[] = [];

    if (loan_service_id) {
      query += ` WHERE lt.loan_service_id = $1`;
      params.push(loan_service_id);
    }

    query += ` ORDER BY lt.tenure_months ASC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getLoanTenures error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createLoanTenure = async (req: Request, res: Response) => {
  try {
    const { loan_service_id, tenure_months, display_name } = req.body;

    if (!loan_service_id || !tenure_months) {
      return res.status(400).json({
        success: false,
        message: "Loan service and tenure (months) are required",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM loan_tenures WHERE loan_service_id = $1 AND tenure_months = $2`,
      [loan_service_id, tenure_months]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This tenure already exists for the selected loan service",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO loan_tenures (loan_service_id, tenure_months, display_name)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [loan_service_id, tenure_months, display_name || null]
    );

    return res.status(201).json({ success: true, message: "Loan tenure created", data: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23503") {
      return res.status(400).json({ success: false, message: "Invalid loan service selected" });
    }
    console.error("createLoanTenure error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateLoanTenure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { loan_service_id, tenure_months, display_name, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE loan_tenures
      SET loan_service_id = COALESCE($1, loan_service_id),
          tenure_months = COALESCE($2, tenure_months),
          display_name = COALESCE($3, display_name),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
      `,
      [loan_service_id, tenure_months, display_name, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loan tenure not found" });
    }

    return res.json({ success: true, message: "Loan tenure updated", data: result.rows[0] });
  } catch (err) {
    console.error("updateLoanTenure error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteLoanTenure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM loan_tenures WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loan tenure not found" });
    }
    return res.json({ success: true, message: "Loan tenure deleted" });
  } catch (err) {
    console.error("deleteLoanTenure error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};