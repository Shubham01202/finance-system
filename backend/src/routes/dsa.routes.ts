// Path: backend/src/routes/dsa.routes.ts

import { Router } from "express";
import { authenticate, dsaOnly } from "../middleware/dsaAuth.middleware";
import {
  getDsaProfile,
  saveDsaProfile,
  getDsaDashboard,
  getDsaLoans,
  dsaApplyLoan,
  getDsaApplicationById,
  updateDsaApplication,
  updateDsaPersonalInfo,
  createDsa,
  getCreatedDsas,
} from "../controllers/dsa.controller";

const router = Router();

// All DSA routes require a valid token belonging to a DSA user
router.use(authenticate, dsaOnly);

// Profile
router.get("/profile", getDsaProfile);
router.post("/profile", saveDsaProfile);
router.put("/profile/personal", updateDsaPersonalInfo);

// Dashboard
router.get("/dashboard", getDsaDashboard);

// Loans
router.get("/loans", getDsaLoans);
router.post("/loans/apply", dsaApplyLoan);
router.get("/loans/:id", getDsaApplicationById);
router.put("/loans/:id", updateDsaApplication);

// DSA-under-DSA hierarchy (create/list sub-DSAs)
router.post("/create", createDsa);
router.get("/created", getCreatedDsas);

export default router;