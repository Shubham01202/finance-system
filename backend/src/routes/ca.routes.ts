// Path: backend/src/routes/ca.routes.ts

import { Router } from "express";
import {
  getCaProfile,
  saveCaProfile,
  updateCaPersonalInfo,   // 👈 1. import the new controller function
  getCaDashboard,
  getCaLoans,
  caApplyLoan,
  getCaApplicationById,
  updateCaApplication,

  getCreatedCas,
  createCa,
} from "../controllers/ca.controller";
import { authenticate, caOnly } from "../middleware/caAuth.middleware";

const router = Router();

// All CA routes require: valid JWT + role === "ca"
router.use(authenticate, caOnly);

router.get("/profile",          getCaProfile);
router.post("/profile",         saveCaProfile);
router.put("/profile/personal", updateCaPersonalInfo);  // 👈 2. add this line
router.get("/dashboard",        getCaDashboard);
router.get("/loans",            getCaLoans);
router.post("/create-ca",       createCa);
router.get("/my-cas",           getCreatedCas);
router.post("/apply",           caApplyLoan);
router.get("/loans/:id",        getCaApplicationById);
router.put("/loans/:id",        updateCaApplication);

export default router;
