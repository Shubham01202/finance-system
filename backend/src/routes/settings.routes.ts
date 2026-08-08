import { Router } from "express";
import {
  getSMTPSettings,
  updateSMTPSettings,
  testSMTPConnection,
} from "../controllers/settings.controller";

import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/smtp", authenticate, getSMTPSettings);

router.put("/smtp", authenticate, updateSMTPSettings);
router.post(
  "/smtp/test",
  authenticate,
  testSMTPConnection
);

export default router;