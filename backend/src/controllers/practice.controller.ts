import type { Response } from "express";
import mongoose from "mongoose";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Kit } from "../models/Kit.js";
import { pickNextCard, practiceCoverage } from "../practice/session-ordering.js";

async function loadOwnedKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return null;
  }

  const kitId = req.params.id;

  if (typeof kitId !== "string" || !mongoose.isValidObjectId(kitId)) {
    res.status(400).json({ success: false, message: "Invalid kit id" });
    return null;
  }

  const kit = await Kit.findOne({
    _id: new mongoose.Types.ObjectId(kitId),
    userId: req.user.id,
  });

  if (!kit) {
    res.status(404).json({ success: false, message: "Kit not found" });
    return null;
  }

  return kit;
}

export async function getNextPracticeCard(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const flashcards = (kit.flashcards ?? []) as any[];
  const practiceLog = (kit.practiceLog ?? []) as any[];

  const next = pickNextCard(flashcards, practiceLog);

  if (!next) {
    return res.json({ success: true, card: null, message: "No flashcards in this kit yet." });
  }

  return res.json({ success: true, card: next });
}

export async function recordPracticeConfidence(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const { cardId } = req.params;
  const { confidence } = req.body ?? {};

  if (![1, 2, 3, 4, 5].includes(confidence)) {
    return res.status(400).json({ success: false, message: "confidence must be an integer 1-5" });
  }

  const flashcards = (kit.flashcards ?? []) as any[];
  if (!flashcards.some((card) => card.id === cardId)) {
    return res.status(404).json({ success: false, message: "Flashcard not found" });
  }

  const practiceLog = [...((kit.practiceLog ?? []) as any[])];
  practiceLog.push({ flashcardId: cardId, confidence, reviewedAt: new Date() });
  kit.practiceLog = practiceLog as any;

  await kit.save();

  const next = pickNextCard(flashcards, kit.practiceLog as any[]);

  return res.json({ success: true, recorded: true, next: next ?? null });
}

export async function getPracticeCoverage(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  const flashcards = (kit.flashcards ?? []) as any[];
  const practiceLog = (kit.practiceLog ?? []) as any[];

  return res.json({ success: true, coverage: practiceCoverage(flashcards, practiceLog) });
}

export async function resetPracticeLog(req: AuthRequest, res: Response) {
  const kit = await loadOwnedKit(req, res);
  if (!kit) return;

  kit.practiceLog = [] as any;
  await kit.save();

  const flashcards = (kit.flashcards ?? []) as any[];
  const next = pickNextCard(flashcards, []);

  return res.json({
    success: true,
    next: next ?? null,
    coverage: practiceCoverage(flashcards, []),
  });
}