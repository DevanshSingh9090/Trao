import { Router } from "express";

import {
  createDraftKit,
  generateKitForKit,
  getKit,
  listKits,
} from "../controllers/kit.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", listKits);
router.post("/", createDraftKit);
router.get("/:id", getKit);
router.post("/:id/generate", generateKitForKit);

export default router;