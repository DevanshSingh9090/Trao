import { researchCompany } from "../retrieval/index.js";
import { extractRoleAndRequirements } from "../extraction/role-extractor.js";
import { generateCompanyBrief } from "../generation/company-brief.js";
import { generateQuestions, generateQuestionsForGaps } from "../generation/question-generator.js";
import type { RequirementWithId } from "../generation/question-generator.js";
import { generateFlashcards } from "../generation/flashcard-generator.js";
import { coveragePass } from "../coverage/index.js";
import { buildSchedule } from "../scheduling/index.js";
import { validateKitStructure } from "../persistence/kit-validator.js";

export interface GenerateKitInput {
  jd: string;
  companyUrl: string;
  days: number;
}

export interface GenerateKitResult {
  kit: Record<string, unknown>;
  researchFailures: { url: string; reason: string }[];
}

export class KitGenerationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "KitGenerationError";
    this.code = code;
  }
}

export async function generateKit(input: GenerateKitInput): Promise<GenerateKitResult> {
  const jd = input.jd?.trim() ?? "";

  if (!jd) {
    throw new KitGenerationError("EMPTY_JD", "Job description text is required");
  }

  // Step 1: research the company site (Phase 2). An unreachable/thin site is
  // recorded honestly in `research.failures` — never aborts the run.
  const research = await researchCompany(input.companyUrl);

  // Step 2: extract role + requirements from the JD alone.
  const extracted = await extractRoleAndRequirements(jd);

  const requirements: RequirementWithId[] = extracted.requirements.map((requirement, index) => ({
    ...requirement,
    id: `r${index + 1}`,
  }));

  // Step 3: generate the company brief from whatever pages were actually retrieved.
  const companyBrief = await generateCompanyBrief(research.pages);

  // Step 4: generate questions, per requirement x relevant category.
  const draftQuestions = await generateQuestions(requirements);

  // Step 5: generate flashcards tied to requirement_ids.
  const flashcards = await generateFlashcards(requirements);

  // Step 6 (Phase 4): deterministic coverage check + up to 2 targeted gap-fill
  // passes. The comparison itself is plain code — the LLM is only called for
  // the specific requirements that ended up with no linked question.
  const coverageResult = await coveragePass(requirements, draftQuestions, (uncovered, existingCount) =>
    generateQuestionsForGaps(uncovered, existingCount)
  );

  // Step 7 (Phase 5): deterministic schedule allocation — no LLM.
  const schedule = buildSchedule(requirements, coverageResult.questions, input.days);

  const kit = {
    source: {
      company: research.companyName,
      company_url: research.companyUrl,
      role: extracted.title,
      location: extracted.location,
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: research.pages.map((page) => page.url),
    },
    company_brief: companyBrief,
    role: {
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements,
    },
    questions: coverageResult.questions,
    flashcards,
    schedule,
    coverage: coverageResult.coverage,
  };

  const validation = validateKitStructure(kit);

  if (!validation.valid) {
    throw new KitGenerationError(
      "INVALID_KIT_STRUCTURE",
      `Generated kit failed structure validation: ${validation.errors.join("; ")}`
    );
  }

  return { kit, researchFailures: research.failures };
}