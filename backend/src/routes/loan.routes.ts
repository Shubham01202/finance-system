// Path: backend/src/routes/loan.routes.ts

import { Router } from "express";
import {
  applyLoan,
  getBanks,
  getMyApplications,
  getApplicationById,
  updateApplication,
  getProfile,
  updateProfile,
} from "../controllers/loan.controller";
import { authenticate } from "../middleware/auth.middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

/* ==========================================================
   MULTER CONFIGURATION
========================================================== */

// Create uploads/documents folder if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads", "documents");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

/* ==========================================================
   PUBLIC ROUTES
========================================================== */

router.get("/banks", getBanks);

/* ==========================================================
   PROTECTED ROUTES
========================================================== */

router.post(
  "/apply",
  authenticate,
  upload.any(),
  applyLoan
);

router.get(
  "/my-applications",
  authenticate,
  getMyApplications
);

router.get(
  "/applications/:id",
  authenticate,
  getApplicationById
);

router.put(
  "/applications/:id",
  authenticate,
  upload.any(),
  updateApplication
);

router.get(
  "/profile",
  authenticate,
  getProfile
);

router.put(
  "/profile",
  authenticate,
  updateProfile
);

export default router;