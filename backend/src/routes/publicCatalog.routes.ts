import express from "express";
import {
  getPublicLoanServices,
  getPublicEmploymentTypes,
  getPublicStates,
  getPublicLoanTenures,
  getPublicDocumentTypes,
} from "../controllers/publicCatalog.controller";

const router = express.Router();

router.get("/loan-services", getPublicLoanServices);
router.get("/employment-types", getPublicEmploymentTypes);
router.get("/states", getPublicStates);
router.get("/loan-tenures", getPublicLoanTenures);
router.get("/document-types", getPublicDocumentTypes);

export default router;