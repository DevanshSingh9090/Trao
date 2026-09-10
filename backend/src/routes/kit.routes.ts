import { Router } from "express";

import {
  createDraftKit,
  generateKitForKit,
  getKit,
  listKits,
  deleteKit,
} from "../controllers/kit.controller.js";

import {
  addFlashcard,
  addQuestion,
  deleteFlashcard,
  deleteQuestion,
  getKitStatus,
  patchBrief,
  patchFlashcard,
  patchQuestion,
  regenerateSection,
  reorderQuestions,
} from "../controllers/builder.controller.js";

import {
  getNextPracticeCard,
  getPracticeCoverage,
  recordPracticeConfidence,
  resetPracticeLog,
} from "../controllers/practice.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

// Phase 1 — CRUD + generation
router.get("/", listKits);
router.post("/", createDraftKit);
router.get("/:id", getKit);
router.delete("/:id", deleteKit);
router.post("/:id/generate", generateKitForKit);

// Phase 7 — builder: status, edit/add/delete, reorder, regenerate
router.get("/:id/status", getKitStatus);

router.patch("/:id/questions/:qid", patchQuestion);
router.post("/:id/questions", addQuestion);
router.delete("/:id/questions/:qid", deleteQuestion);

router.patch("/:id/flashcards/:fid", patchFlashcard);
router.post("/:id/flashcards", addFlashcard);
router.delete("/:id/flashcards/:fid", deleteFlashcard);

router.patch("/:id/brief", patchBrief);

router.post("/:id/reorder", reorderQuestions);
router.post("/:id/regenerate", regenerateSection);

// Phase 8 — practice mode
router.post("/:id/practice/session/next", getNextPracticeCard);
router.post("/:id/practice/session/:cardId", recordPracticeConfidence);
router.get("/:id/practice/coverage", getPracticeCoverage);
router.post("/:id/practice/reset", resetPracticeLog);

export default router;