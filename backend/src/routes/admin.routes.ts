import express from "express";
import {
  getDashboardStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  sendApplicationToBanker,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  getBanks,
  addBank,
  updateBank,
  deleteBank,
  deleteUser,
  getAdminProfile,
  updateAdminProfile,
  getCAById,
  updateCA,
  resetUserPassword,
  createUser,
} from "../controllers/admin.controller";

import { adminAuth } from "../middleware/adminAuth.middleware";

const router = express.Router();

/* =========================
   DASHBOARD
========================= */
router.get(
  "/dashboard",
  adminAuth,
  getDashboardStats
);

/* =========================
   APPLICATIONS
========================= */
router.get(
  "/applications",
  adminAuth,
  getAllApplications
);

router.get(
  "/applications/:id",
  adminAuth,
  getApplicationById
);

router.put(
  "/applications/:id",
  adminAuth,
  updateApplicationStatus
);

router.post(
  "/applications/:id/send-to-banker",
  adminAuth,
  sendApplicationToBanker
);

router.put(
  "/users/:id/reset-password",
  adminAuth,
  resetUserPassword
);

/* =========================
   USERS
========================= */
router.get(
  "/users",
  adminAuth,
  getAllUsers
);

router.get(
  "/users/:id",
  adminAuth,
  getUserById
);

router.put(
  "/users/:id",
  adminAuth,
  updateUser
);
router.post(
  "/users",
  adminAuth,
  createUser
);

router.put(
  "/users/:id/toggle",
  adminAuth,
  toggleUserStatus
);

router.delete(
  "/users/:id",
  adminAuth,
  deleteUser
);

/* =========================
   BANKS
========================= */
router.get(
  "/banks",
  adminAuth,
  getBanks
);

router.post(
  "/banks",
  adminAuth,
  addBank
);

router.put(
  "/banks/:id",
  adminAuth,
  updateBank
);

router.delete(
  "/banks/:id",
  adminAuth,
  deleteBank
);

/* =========================
   ADMIN PROFILE
========================= */
router.get(
  "/profile",
  adminAuth,
  getAdminProfile
);
router.get("/ca/:id", adminAuth, getCAById);
router.put("/ca/:id", adminAuth, updateCA);
router.put(
  "/profile",
  adminAuth,
  updateAdminProfile
);

export default router;