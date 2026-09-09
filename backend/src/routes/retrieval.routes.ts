import {
  Router,
} from "express";

import {
  researchCompanyController,
} from "../controllers/retrieval.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router =
  Router();

router.post(
  "/research",
  requireAuth,
  researchCompanyController
);

export default router;