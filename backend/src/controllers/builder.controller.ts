import type { Response } from "express";
import mongoose from "mongoose";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Kit } from "../models/Kit.js";
import { ensureItemState, setEntry, deleteEntry } from "../builder/item-state.js";
import { regenerateBrief, regenerateSchedule, regenerateCategory, RegenerateError } from "../builder/regenerate.js";

async function loadOwnedKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return null;
  }

  const rawKitId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (typeof rawKitId !== "string" || !mongoose.isValidObjectId(rawKitId)) {
    res.status(400).json({ success: false, message: "Invalid kit id" });
    return null;
  }

  const kit = await Kit.findOne({
    _id: new mongoose.Types.ObjectId(rawKitId),
    userId: new mongoose.Types.ObjectId(req.user.id),
  });

  if (!kit) {
    res.status(404).json({ success: false, message: "Kit not found" });
    return null;
  }

  return kit;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function patchQuestion(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const qid = req.params.qid;

  if (typeof qid !== "string") {
    return res.status(400).json({ success: false, message: "Invalid question id" });
  }

  const { prompt, answer_outline, category, difficulty } = req.body ?? {};

  const questions = (kit.questions ?? []) as any[];
  const index = questions.findIndex((question) => question.id === qid);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "Question not found" });
  }

  const updated = { ...questions[index] };
  if (typeof prompt === "string") updated.prompt = prompt;
  if (typeof answer_outline === "string") updated.answer_outline = answer_outline;
  if (typeof category === "string") updated.category = category;
  if ([1, 2, 3].includes(difficulty)) updated.difficulty = difficulty;

  questions[index] = updated;
  kit.questions = questions as any;

  const itemState = ensureItemState(kit as any);
  setEntry(itemState.questions, qid, "edited");

  await kit.save();
  return res.json({ success: true, kit });
}

export async function addQuestion(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { prompt, answer_outline, category, difficulty, requirement_ids, pinned } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ success: false, message: "prompt is required" });
  }

  const questions = (kit.questions ?? []) as any[];
  const existingIds = new Set(questions.map((question) => question.id));
  let counter = questions.length;
  let newId = `q${++counter}`;
  while (existingIds.has(newId)) newId = `q${++counter}`;

  const newQuestion = {
    id: newId,
    requirement_ids: Array.isArray(requirement_ids) ? requirement_ids : [],
    category: typeof category === "string" ? category : "technical",
    prompt,
    answer_outline: typeof answer_outline === "string" ? answer_outline : "",
    difficulty: [1, 2, 3].includes(difficulty) ? difficulty : 2,
  };

  kit.questions = [...questions, newQuestion] as any;

  const itemState = ensureItemState(kit as any);
  setEntry(itemState.questions, newId, pinned === true ? "pinned" : "edited");

  await kit.save();
  return res.status(201).json({ success: true, kit });
}

export async function deleteQuestion(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const qid = req.params.qid;

  if (typeof qid !== "string") {
    return res.status(400).json({ success: false, message: "Invalid question id" });
  }

  const questions = (kit.questions ?? []) as any[];

  if (!questions.some((question) => question.id === qid)) {
    return res.status(404).json({ success: false, message: "Question not found" });
  }

  kit.questions = questions.filter((question) => question.id !== qid) as any;

  const itemState = ensureItemState(kit as any);
  deleteEntry(itemState.questions, qid);

  await kit.save();
  return res.json({ success: true, kit });
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export async function patchFlashcard(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const fid = req.params.fid;

  if (typeof fid !== "string") {
    return res.status(400).json({ success: false, message: "Invalid flashcard id" });
  }

  const { front, back } = req.body ?? {};

  const flashcards = (kit.flashcards ?? []) as any[];
  const index = flashcards.findIndex((flashcard) => flashcard.id === fid);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "Flashcard not found" });
  }

  const updated = { ...flashcards[index] };
  if (typeof front === "string") updated.front = front;
  if (typeof back === "string") updated.back = back;

  flashcards[index] = updated;
  kit.flashcards = flashcards as any;

  const itemState = ensureItemState(kit as any);
  setEntry(itemState.flashcards, fid, "edited");

  await kit.save();
  return res.json({ success: true, kit });
}

export async function addFlashcard(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { front, back, requirement_ids, pinned } = req.body ?? {};

  if (typeof front !== "string" || !front.trim() || typeof back !== "string" || !back.trim()) {
    return res.status(400).json({ success: false, message: "front and back are required" });
  }

  const flashcards = (kit.flashcards ?? []) as any[];
  const existingIds = new Set(flashcards.map((flashcard) => flashcard.id));
  let counter = flashcards.length;
  let newId = `f${++counter}`;
  while (existingIds.has(newId)) newId = `f${++counter}`;

  const newFlashcard = {
    id: newId,
    front,
    back,
    requirement_ids: Array.isArray(requirement_ids) ? requirement_ids : [],
  };

  kit.flashcards = [...flashcards, newFlashcard] as any;

  const itemState = ensureItemState(kit as any);
  setEntry(itemState.flashcards, newId, pinned === true ? "pinned" : "edited");

  await kit.save();
  return res.status(201).json({ success: true, kit });
}

export async function deleteFlashcard(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const fid = req.params.fid;

  if (typeof fid !== "string") {
    return res.status(400).json({ success: false, message: "Invalid flashcard id" });
  }

  const flashcards = (kit.flashcards ?? []) as any[];

  if (!flashcards.some((flashcard) => flashcard.id === fid)) {
    return res.status(404).json({ success: false, message: "Flashcard not found" });
  }

  kit.flashcards = flashcards.filter((flashcard) => flashcard.id !== fid) as any;

  const itemState = ensureItemState(kit as any);
  deleteEntry(itemState.flashcards, fid);

  await kit.save();
  return res.json({ success: true, kit });
}

// ---------------------------------------------------------------------------
// Company brief (single-object edit, not a list)
// ---------------------------------------------------------------------------

export async function patchBrief(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { summary, what_they_do } = req.body ?? {};

  const updated = { ...(kit.company_brief as any) };
  if (typeof summary === "string") updated.summary = summary;
  if (typeof what_they_do === "string") updated.what_they_do = what_they_do;

  kit.company_brief = updated as any;

  const itemState = ensureItemState(kit as any);
  itemState.companyBrief = { origin: "edited", updatedAt: new Date() };

  await kit.save();
  return res.json({ success: true, kit });
}

// ---------------------------------------------------------------------------
// Reorder (pure ordering, no LLM)
// ---------------------------------------------------------------------------

export async function reorderQuestions(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { questionIds } = req.body ?? {};

  if (!Array.isArray(questionIds) || !questionIds.every((id) => typeof id === "string")) {
    return res.status(400).json({ success: false, message: "questionIds must be a string[]" });
  }

  const questions = (kit.questions ?? []) as any[];
  const byId = new Map(questions.map((question) => [question.id, question]));

  if (questionIds.length !== questions.length || !questionIds.every((id) => byId.has(id))) {
    return res.status(400).json({
      success: false,
      message: "questionIds must be a permutation of the kit's existing question ids",
    });
  }

  kit.questions = questionIds.map((id) => byId.get(id)) as any;

  await kit.save();
  return res.json({ success: true, kit });
}

// ---------------------------------------------------------------------------
// Regenerate a single section
// ---------------------------------------------------------------------------

export async function regenerateSection(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { section, days } = req.body ?? {};

  if (typeof section !== "string") {
    return res.status(400).json({ success: false, message: "section is required" });
  }

  try {
    if (section === "brief") {
      await regenerateBrief(kit);
    } else if (section === "schedule") {
      regenerateSchedule(kit, Number.isInteger(days) ? days : undefined);
    } else if (section.startsWith("category:")) {
      await regenerateCategory(kit, section.slice("category:".length));
    } else {
      return res.status(400).json({
        success: false,
        message: 'section must be "brief", "schedule", or "category:<name>"',
      });
    }
  } catch (error) {
    if (error instanceof RegenerateError) {
      return res.status(409).json({ success: false, code: error.code, message: error.message });
    }

    console.error("Section regeneration failed:", error);
    return res.status(500).json({ success: false, message: "Regeneration failed" });
  }

  await kit.save();
  return res.json({ success: true, kit });
}

// ---------------------------------------------------------------------------
// Status polling (for generation-in-progress loading states)
// ---------------------------------------------------------------------------

export async function getKitStatus(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  return res.json({
    success: true,
    status: kit.status,
    coverage: kit.coverage,
    updatedAt: kit.updatedAt,
  });
}