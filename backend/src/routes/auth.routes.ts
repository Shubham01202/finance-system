// Path: backend/src/routes/auth.routes.ts

import { Router } from "express";
import {
  signup,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  setPasswordFromLink,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/auth.controller";
import { adminAuth } from "../middleware/adminAuth.middleware";

const router = Router();


router.post("/signup",          signup);
router.post("/login",           login);
router.post("/verify-otp",      verifyOtp);
router.post("/resend-otp",      resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.post("/set-password",    setPasswordFromLink);

/* ── ROLES (admin only) ── */
router.get("/roles",          adminAuth, getRoles);
router.post("/roles",         adminAuth, createRole);
router.put("/roles/:id",      adminAuth, updateRole);
router.delete("/roles/:id",   adminAuth, deleteRole);

export default router;