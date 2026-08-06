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
  deleteUser,
  createUser,
  resetUserPassword,

  getBanks,
  addBank,
  updateBank,
  deleteBank,

  getAdminProfile,
  updateAdminProfile,

  getCAById,
  updateCA,

  getDSAById,
  updateDSA,
} from "../controllers/admin.controller";

import { adminAuth } from "../middleware/adminAuth.middleware";

const router = express.Router();

/* =========================
   DASHBOARD
========================= */

router.get("/dashboard", adminAuth, getDashboardStats);

/* =========================
   APPLICATIONS
========================= */

router.get("/applications", adminAuth, getAllApplications);

router.get("/applications/:id", adminAuth, getApplicationById);

router.put("/applications/:id", adminAuth, updateApplicationStatus);

router.post(
  "/applications/:id/send-to-banker",
  adminAuth,
  sendApplicationToBanker
);

/* =========================
   USERS
========================= */

router.get("/users", adminAuth, getAllUsers);

router.post("/users", adminAuth, createUser);

router.get("/users/:id", adminAuth, getUserById);

router.put("/users/:id", adminAuth, updateUser);

router.put(
  "/users/:id/reset-password",
  adminAuth,
  resetUserPassword
);

router.put("/users/:id/toggle", adminAuth, toggleUserStatus);

router.delete("/users/:id", adminAuth, deleteUser);

/* =========================
   BANKS
========================= */

router.get("/banks", adminAuth, getBanks);

router.post("/banks", adminAuth, addBank);

router.put("/banks/:id", adminAuth, updateBank);

router.delete("/banks/:id", adminAuth, deleteBank);

/* =========================
   DSA
========================= */

router.get("/dsa/:id", adminAuth, getDSAById);

router.put("/dsa/:id", adminAuth, updateDSA);

/* =========================
   CA
========================= */

router.get("/ca/:id", adminAuth, getCAById);

router.put("/ca/:id", adminAuth, updateCA);

/* =========================
   ADMIN PROFILE
========================= */

router.get("/profile", adminAuth, getAdminProfile);

router.put("/profile", adminAuth, updateAdminProfile);

export default router;