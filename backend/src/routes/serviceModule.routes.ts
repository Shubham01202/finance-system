import express from "express";
import {
  getLoanServices,
  createLoanService,
  updateLoanService,
  deleteLoanService,

  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,

  getEmploymentTypes,
  createEmploymentType,
  updateEmploymentType,
  deleteEmploymentType,

  getStates,
  createState,
  updateState,
  deleteState,

  getLoanTenures,
  createLoanTenure,
  updateLoanTenure,
  deleteLoanTenure,
} from "../controllers/serviceModule.controller";

import { adminAuth } from "../middleware/adminAuth.middleware";

const router = express.Router();

/* =========================
   LOAN SERVICES
========================= */
router.get("/loan-services", adminAuth, getLoanServices);
router.post("/loan-services", adminAuth, createLoanService);
router.put("/loan-services/:id", adminAuth, updateLoanService);
router.delete("/loan-services/:id", adminAuth, deleteLoanService);

/* =========================
   DOCUMENT TYPES
========================= */
router.get("/document-types", adminAuth, getDocumentTypes);
router.post("/document-types", adminAuth, createDocumentType);
router.put("/document-types/:id", adminAuth, updateDocumentType);
router.delete("/document-types/:id", adminAuth, deleteDocumentType);

/* =========================
   EMPLOYMENT TYPES
========================= */
router.get("/employment-types", adminAuth, getEmploymentTypes);
router.post("/employment-types", adminAuth, createEmploymentType);
router.put("/employment-types/:id", adminAuth, updateEmploymentType);
router.delete("/employment-types/:id", adminAuth, deleteEmploymentType);

/* =========================
   STATES
========================= */
router.get("/states", adminAuth, getStates);
router.post("/states", adminAuth, createState);
router.put("/states/:id", adminAuth, updateState);
router.delete("/states/:id", adminAuth, deleteState);

/* =========================
   LOAN TENURES
========================= */
router.get("/loan-tenures", adminAuth, getLoanTenures);
router.post("/loan-tenures", adminAuth, createLoanTenure);
router.put("/loan-tenures/:id", adminAuth, updateLoanTenure);
router.delete("/loan-tenures/:id", adminAuth, deleteLoanTenure);

export default router;