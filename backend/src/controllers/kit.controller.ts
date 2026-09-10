import type { Response } from "express";
import mongoose from "mongoose";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Kit } from "../models/Kit.js";
import { generateKit } from "../pipeline/index.js";

export async function listKits(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const kits = await Kit.find({
    userId: req.user.id,
  })
    .sort({
      updatedAt: -1,
    })
    .lean();

  return res.json({
    success: true,
    kits,
  });
}

export async function getKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const rawKitId = req.params.id;

  if (Array.isArray(rawKitId) || typeof rawKitId !== "string" || !mongoose.isValidObjectId(rawKitId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid kit id",
    });
  }

  const kit = await Kit.findOne({
    _id: new mongoose.Types.ObjectId(rawKitId),
    userId: req.user.id,
  });

  if (!kit) {
    return res.status(404).json({
      success: false,
      message: "Kit not found",
    });
  }

  return res.json({
    success: true,
    kit,
  });
}

export async function deleteKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const rawKitId = req.params.id;

  if (Array.isArray(rawKitId) || typeof rawKitId !== "string" || !mongoose.isValidObjectId(rawKitId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid kit id",
    });
  }

  const kit = await Kit.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(rawKitId),
    userId: req.user.id,
  });

  if (!kit) {
    return res.status(404).json({
      success: false,
      message: "Kit not found",
    });
  }

  return res.json({ success: true });
}

export async function createDraftKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const kit = await Kit.create({
    userId: req.user.id,
    status: "draft",
  });

  return res.status(201).json({
    success: true,
    kit,
  });
}

export async function generateKitForKit(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const rawKitId = req.params.id;

  if (Array.isArray(rawKitId) || typeof rawKitId !== "string" || !mongoose.isValidObjectId(rawKitId)) {
    return res.status(400).json({ success: false, message: "Invalid kit id" });
  }

  const { jd, companyUrl, days } = req.body;

  if (typeof jd !== "string" || !jd.trim()) {
    return res.status(400).json({ success: false, message: "jd is required" });
  }

  if (typeof companyUrl !== "string" || !companyUrl.trim()) {
    return res.status(400).json({ success: false, message: "companyUrl is required" });
  }

  const daysAvailable = Number.isInteger(days) && days > 0 ? days : 5;

  const kit = await Kit.findOne({
    _id: new mongoose.Types.ObjectId(rawKitId),
    userId: req.user.id,
  });

  if (!kit) {
    return res.status(404).json({ success: false, message: "Kit not found" });
  }


  // Design decision (Phase 9 edge case: "same description + company submitted
  // twice"): every generation targets one specific Kit document, created as its
  // own draft beforehand. Submitting the same JD + company_url twice just means
  // two independent Kit documents with two independent runs — there is no
  // cross-kit caching or dedup. This mirrors the same choice made in
  // batch/evaluate.ts for the batch CLI, documented there too.
  kit.status = "generating";
  await kit.save();

  // Fire-and-forget: don't block this request on the full pipeline (it can
  // take well over a minute with scraping + multiple LLM calls). Persist the
  // result to Mongo when it's done; the frontend picks it up via /status
  // polling instead of waiting on this response. This also matters because
  // requests routed through Vercel's rewrite proxy are capped at ~10s.
  generateKit({ jd, companyUrl, days: daysAvailable })
    .then(async (result) => {
      kit.source = result.kit.source as any;
      kit.company_brief = result.kit.company_brief as any;
      kit.role = result.kit.role as any;
      kit.questions = result.kit.questions as any;
      kit.flashcards = result.kit.flashcards as any;
      kit.schedule = result.kit.schedule as any;
      kit.coverage = result.kit.coverage as any;
      kit.status = "ready";
      await kit.save();
    })
    .catch(async (error) => {
      kit.status = "failed";
      await kit.save();
      console.error("Kit generation failed:", error);
    });

  return res.status(202).json({ success: true, status: "generating" });
}