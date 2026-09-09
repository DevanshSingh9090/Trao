import { generateCompanyBrief } from "../generation/company-brief.js";
import { generateQuestionsForCategory } from "../generation/question-generator.js";
import type { QuestionCategory } from "../generation/question-generator.js";
import { buildSchedule } from "../scheduling/index.js";
import { findUncovered } from "../coverage/index.js";
import { researchCompany } from "../retrieval/index.js";
import { ensureItemState, getOrigin, setEntry, deleteEntry } from "./item-state.js";
import type { IKit } from "../models/Kit.js";

export const VALID_CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioral",
  "domain",
  "system-design",
  "company-fit",
];

export class RegenerateError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RegenerateError";
    this.code = code;
  }
}

/** Returns a fresh-id generator that continues numbering past whatever ids already exist. */
function makeIdGenerator(existingIds: string[], prefix: string): () => string {
  let max = 0;

  for (const id of existingIds) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }

  let counter = max;
  return () => `${prefix}${++counter}`;
}

/**
 * Regenerates the company brief by re-researching the company site from
 * scratch (the kit only persists page URLs, not raw page text, so a fresh
 * brief means a fresh crawl — documented trade-off in the README).
 * Skipped entirely if the user already edited/pinned the brief.
 */
export async function regenerateBrief(kit: IKit): Promise<void> {
  const itemState = ensureItemState(kit as any);

  if (itemState.companyBrief && itemState.companyBrief.origin !== "generated") {
    throw new RegenerateError(
      "BRIEF_PROTECTED",
      "The company brief was edited/pinned and is protected from regeneration."
    );
  }

  const companyUrl = (kit.source as any)?.company_url as string | undefined;

  if (!companyUrl) {
    throw new RegenerateError("MISSING_COMPANY_URL", "Kit has no company_url to re-research.");
  }

  const research = await researchCompany(companyUrl);
  const brief = await generateCompanyBrief(research.pages);

  kit.company_brief = brief as any;
  kit.source = { ...(kit.source as any), pages_used: research.pages.map((page) => page.url) } as any;
  itemState.companyBrief = { origin: "generated", updatedAt: new Date() };
}

/**
 * Rebuilds the schedule deterministically from the kit's current
 * requirements + questions (pure code, no LLM). Skipped if the schedule was
 * edited/pinned directly.
 */
export function regenerateSchedule(kit: IKit, daysOverride?: number): void {
  const itemState = ensureItemState(kit as any);

  if (itemState.schedule && itemState.schedule.origin !== "generated") {
    throw new RegenerateError(
      "SCHEDULE_PROTECTED",
      "The schedule was edited/pinned and is protected from regeneration."
    );
  }

  const requirements = ((kit.role as any)?.requirements ?? []) as Array<{
    id: string;
    priority?: "must" | "nice";
  }>;
  const questions = (kit.questions ?? []) as any[];
  const daysAvailable = daysOverride ?? (kit.schedule as any)?.days_available ?? 5;

  kit.schedule = buildSchedule(requirements, questions, daysAvailable) as any;
  itemState.schedule = { origin: "generated", updatedAt: new Date() };
}

/**
 * Regenerates one question category. Only questions in that category whose
 * itemState is still "generated" get replaced; "edited"/"pinned" questions
 * in the same category are kept and merged back in. Questions in *other*
 * categories are never touched, regardless of their origin.
 */
export async function regenerateCategory(kit: IKit, category: string): Promise<void> {
  if (!VALID_CATEGORIES.includes(category as QuestionCategory)) {
    throw new RegenerateError("INVALID_CATEGORY", `"${category}" is not a valid question category.`);
  }

  const itemState = ensureItemState(kit as any);
  const allQuestions = [...((kit.questions ?? []) as any[])];
  const requirements = ((kit.role as any)?.requirements ?? []) as any[];

  const inCategory = allQuestions.filter((question) => question.category === category);
  const outsideCategory = allQuestions.filter((question) => question.category !== category);

  const kept = inCategory.filter((question) => getOrigin(itemState.questions, question.id) !== "generated");
  const toReplace = inCategory.filter((question) => getOrigin(itemState.questions, question.id) === "generated");

  const requirementIdsToRegenerate = new Set<string>();
  for (const question of toReplace) {
    for (const requirementId of question.requirement_ids ?? []) requirementIdsToRegenerate.add(requirementId);
  }

  for (const question of toReplace) deleteEntry(itemState.questions, question.id);

  const requirementsToRegenerate = requirements.filter((requirement) =>
    requirementIdsToRegenerate.has(requirement.id)
  );

  const freshQuestions =
    requirementsToRegenerate.length > 0
      ? await generateQuestionsForCategory(requirementsToRegenerate, category as QuestionCategory)
      : [];

  const makeId = makeIdGenerator(allQuestions.map((question) => question.id), "q");
  const idedFreshQuestions = freshQuestions.map((question) => ({ ...question, id: makeId() }));

  for (const question of idedFreshQuestions) {
    setEntry(itemState.questions, question.id, "generated");
  }

  kit.questions = [...outsideCategory, ...kept, ...idedFreshQuestions] as any;

  // Pure-code recompute. Regeneration itself never triggers another LLM
  // gap-fill pass — if this leaves a requirement uncovered it's surfaced
  // honestly in `coverage`, not silently patched; closing it is a full
  // re-generation, which already runs the real coverage pass (Phase 4).
  kit.coverage = {
    uncovered_requirement_ids: findUncovered(requirements, kit.questions as any[]),
    passes: (kit.coverage as any)?.passes ?? 0,
  } as any;
}