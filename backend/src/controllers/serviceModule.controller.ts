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
    2. DOCUMENT TYPES (linked to MANY loan services
        via the document_type_loan_services join table)
  ═══════════════════════════════════════════ */
 export const getDocumentTypes = async (req: Request, res: Response) => {
    try {
      const { loan_service_id } = req.query;

      let query = `
        SELECT
          dt.*,
          COALESCE(
            ARRAY_AGG(DISTINCT ls.id) FILTER (WHERE ls.id IS NOT NULL),
            '{}'
          ) AS loan_service_ids,
          COALESCE(
            ARRAY_AGG(DISTINCT ls.name) FILTER (WHERE ls.id IS NOT NULL),
            '{}'
          ) AS loan_service_names,
          COALESCE(
            ARRAY_AGG(DISTINCT et.id) FILTER (WHERE et.id IS NOT NULL),
            '{}'
          ) AS employment_type_ids,
          COALESCE(
            ARRAY_AGG(DISTINCT et.name) FILTER (WHERE et.id IS NOT NULL),
            '{}'
          ) AS employment_type_names
        FROM document_types dt
        LEFT JOIN document_type_loan_services dtls ON dtls.document_type_id = dt.id
        LEFT JOIN loan_services ls ON ls.id = dtls.loan_service_id
        LEFT JOIN document_type_employment_types dtet ON dtet.document_type_id = dt.id
        LEFT JOIN employment_types et ON et.id = dtet.employment_type_id
      `;
      const params: any[] = [];

      if (loan_service_id) {
        params.push(loan_service_id);
        query += `
          WHERE dt.id IN (
            SELECT document_type_id FROM document_type_loan_services WHERE loan_service_id = $1
          )
        `;
      }

      query += `
        GROUP BY dt.id
        ORDER BY dt.created_at DESC
      `;

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
        loan_service_ids,
        employment_type_ids,
        document_name,
        is_required,
        max_size_mb,
        allowed_file_types,
      } = req.body;

      if (!Array.isArray(loan_service_ids) || loan_service_ids.length === 0 || !document_name || !document_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "At least one loan service and a document name are required",
        });
      }

      const employmentTypeIds: number[] = Array.isArray(employment_type_ids) ? employment_type_ids : [];

      // Block duplicate document names on any of the selected services
      const existing = await pool.query(
        `SELECT dt.id
        FROM document_types dt
        JOIN document_type_loan_services dtls ON dtls.document_type_id = dt.id
        WHERE dtls.loan_service_id = ANY($1::int[]) AND LOWER(dt.document_name) = LOWER($2)`,
        [loan_service_ids, document_name.trim()]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This document type already exists for one of the selected loan services",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const docResult = await client.query(
          `
          INSERT INTO document_types
            (document_name, is_required, max_size_mb, allowed_file_types)
          VALUES ($1, $2, $3, $4)
          RETURNING *
          `,
          [
            document_name.trim(),
            is_required ?? true,
            max_size_mb ?? 5,
            JSON.stringify(allowed_file_types && allowed_file_types.length > 0 ? allowed_file_types : ["pdf", "jpg", "jpeg", "png"]),
          ]
        );

        const newDoc = docResult.rows[0];

        const valuePlaceholders = loan_service_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `INSERT INTO document_type_loan_services (document_type_id, loan_service_id) VALUES ${valuePlaceholders}`,
          [newDoc.id, ...loan_service_ids]
        );

        if (employmentTypeIds.length > 0) {
          const empPlaceholders = employmentTypeIds.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
          await client.query(
            `INSERT INTO document_type_employment_types (document_type_id, employment_type_id) VALUES ${empPlaceholders}`,
            [newDoc.id, ...employmentTypeIds]
          );
        }

        await client.query("COMMIT");

        return res.status(201).json({
          success: true,
          message: "Document type created",
          data: { ...newDoc, loan_service_ids, employment_type_ids: employmentTypeIds },
        });
      } catch (innerErr) {
        await client.query("ROLLBACK");
        throw innerErr;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err.code === "23503") {
        return res.status(400).json({ success: false, message: "Invalid loan service or employment type selected" });
      }
      console.error("createDocumentType error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  export const updateDocumentType = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        loan_service_ids,
        employment_type_ids,
        document_name,
        is_required,
        is_active,
        max_size_mb,
        allowed_file_types,
      } = req.body;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const result = await client.query(
          `
          UPDATE document_types
          SET document_name = COALESCE($1, document_name),
              is_required = COALESCE($2, is_required),
              is_active = COALESCE($3, is_active),
              max_size_mb = COALESCE($4, max_size_mb),
              allowed_file_types = COALESCE($5, allowed_file_types),
              updated_at = NOW()
          WHERE id = $6
          RETURNING *
          `,
          [
            document_name,
            is_required,
            is_active,
            max_size_mb,
            allowed_file_types ? JSON.stringify(allowed_file_types) : null,
            id,
          ]
        );

        if (result.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, message: "Document type not found" });
        }

        // Only touch the loan-service links if the caller actually sent an array.
        // (Lets toggleActive() call this same endpoint with just { is_active } and
        // not accidentally wipe out the document's linked services.)
        if (Array.isArray(loan_service_ids)) {
          if (loan_service_ids.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "At least one loan service is required" });
          }

          await client.query(
            `DELETE FROM document_type_loan_services WHERE document_type_id = $1`,
            [id]
          );

          const valuePlaceholders = loan_service_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
          await client.query(
            `INSERT INTO document_type_loan_services (document_type_id, loan_service_id) VALUES ${valuePlaceholders}`,
            [id, ...loan_service_ids]
          );
        }

        // Only touch the employment-type links if the caller sent an array.
        // Empty array is allowed here (means "visible to all employment types").
        if (Array.isArray(employment_type_ids)) {
          await client.query(
            `DELETE FROM document_type_employment_types WHERE document_type_id = $1`,
            [id]
          );

          if (employment_type_ids.length > 0) {
            const empPlaceholders = employment_type_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
            await client.query(
              `INSERT INTO document_type_employment_types (document_type_id, employment_type_id) VALUES ${empPlaceholders}`,
              [id, ...employment_type_ids]
            );
          }
        }

        await client.query("COMMIT");

        const finalResult = await pool.query(
          `
          SELECT
            dt.*,
            COALESCE(ARRAY_AGG(DISTINCT ls.id) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_ids,
            COALESCE(ARRAY_AGG(DISTINCT ls.name) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_names,
            COALESCE(ARRAY_AGG(DISTINCT et.id) FILTER (WHERE et.id IS NOT NULL), '{}') AS employment_type_ids,
            COALESCE(ARRAY_AGG(DISTINCT et.name) FILTER (WHERE et.id IS NOT NULL), '{}') AS employment_type_names
          FROM document_types dt
          LEFT JOIN document_type_loan_services dtls ON dtls.document_type_id = dt.id
          LEFT JOIN loan_services ls ON ls.id = dtls.loan_service_id
          LEFT JOIN document_type_employment_types dtet ON dtet.document_type_id = dt.id
          LEFT JOIN employment_types et ON et.id = dtet.employment_type_id
          WHERE dt.id = $1
          GROUP BY dt.id
          `,
          [id]
        );

        return res.json({ success: true, message: "Document type updated", data: finalResult.rows[0] });
      } catch (innerErr) {
        await client.query("ROLLBACK");
        throw innerErr;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err.code === "23503") {
        return res.status(400).json({ success: false, message: "Invalid loan service or employment type selected" });
      }
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
          COALESCE(ARRAY_AGG(ls.id ORDER BY ls.name) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_ids,
          COALESCE(ARRAY_AGG(ls.name ORDER BY ls.name) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_names
        FROM loan_tenures lt
        LEFT JOIN loan_tenure_loan_services ltls ON ltls.loan_tenure_id = lt.id
        LEFT JOIN loan_services ls ON ls.id = ltls.loan_service_id
      `;
      const params: any[] = [];

      if (loan_service_id) {
        params.push(loan_service_id);
        query += `
          WHERE lt.id IN (
            SELECT loan_tenure_id FROM loan_tenure_loan_services WHERE loan_service_id = $1
          )
        `;
      }

      query += ` GROUP BY lt.id ORDER BY lt.tenure_months ASC`;

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("getLoanTenures error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  export const createLoanTenure = async (req: Request, res: Response) => {
    try {
      const { loan_service_ids, tenure_months, display_name } = req.body;

      if (!Array.isArray(loan_service_ids) || loan_service_ids.length === 0 || !tenure_months) {
        return res.status(400).json({
          success: false,
          message: "At least one loan service and tenure (months) are required",
        });
      }

      const existing = await pool.query(
        `SELECT lt.id
        FROM loan_tenures lt
        JOIN loan_tenure_loan_services ltls ON ltls.loan_tenure_id = lt.id
        WHERE ltls.loan_service_id = ANY($1::int[]) AND lt.tenure_months = $2`,
        [loan_service_ids, tenure_months]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This tenure already exists for one of the selected loan services",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const tenureResult = await client.query(
          `INSERT INTO loan_tenures (tenure_months, display_name) VALUES ($1, $2) RETURNING *`,
          [tenure_months, display_name || null]
        );
        const newTenure = tenureResult.rows[0];

        const valuePlaceholders = loan_service_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `INSERT INTO loan_tenure_loan_services (loan_tenure_id, loan_service_id) VALUES ${valuePlaceholders}`,
          [newTenure.id, ...loan_service_ids]
        );

        await client.query("COMMIT");

        return res.status(201).json({
          success: true,
          message: "Loan tenure created",
          data: { ...newTenure, loan_service_ids },
        });
      } catch (innerErr) {
        await client.query("ROLLBACK");
        throw innerErr;
      } finally {
        client.release();
      }
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
      const { loan_service_ids, tenure_months, display_name, is_active } = req.body;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const result = await client.query(
          `
          UPDATE loan_tenures
          SET tenure_months = COALESCE($1, tenure_months),
              display_name = COALESCE($2, display_name),
              is_active = COALESCE($3, is_active),
              updated_at = NOW()
          WHERE id = $4
          RETURNING *
          `,
          [tenure_months, display_name, is_active, id]
        );

        if (result.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, message: "Loan tenure not found" });
        }

        if (Array.isArray(loan_service_ids)) {
          if (loan_service_ids.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "At least one loan service is required" });
          }

          await client.query(`DELETE FROM loan_tenure_loan_services WHERE loan_tenure_id = $1`, [id]);

          const valuePlaceholders = loan_service_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(", ");
          await client.query(
            `INSERT INTO loan_tenure_loan_services (loan_tenure_id, loan_service_id) VALUES ${valuePlaceholders}`,
            [id, ...loan_service_ids]
          );
        }

        await client.query("COMMIT");

        const finalResult = await pool.query(
          `
          SELECT
            lt.*,
            COALESCE(ARRAY_AGG(ls.id ORDER BY ls.name) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_ids,
            COALESCE(ARRAY_AGG(ls.name ORDER BY ls.name) FILTER (WHERE ls.id IS NOT NULL), '{}') AS loan_service_names
          FROM loan_tenures lt
          LEFT JOIN loan_tenure_loan_services ltls ON ltls.loan_tenure_id = lt.id
          LEFT JOIN loan_services ls ON ls.id = ltls.loan_service_id
          WHERE lt.id = $1
          GROUP BY lt.id
          `,
          [id]
        );

        return res.json({ success: true, message: "Loan tenure updated", data: finalResult.rows[0] });
      } catch (innerErr) {
        await client.query("ROLLBACK");
        throw innerErr;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err.code === "23503") {
        return res.status(400).json({ success: false, message: "Invalid loan service selected" });
      }
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