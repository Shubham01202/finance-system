// Path: backend/src/routes/auth.routes.ts

import { Router } from "express";
import {
  signup,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  setPasswordFromLink
} from "../controllers/auth.controller";

const router = Router();

router.post("/signup",          signup);
router.post("/login",           login);
router.post("/verify-otp",      verifyOtp);
router.post("/resend-otp",      resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.post("/set-password",    setPasswordFromLink);

export default router;