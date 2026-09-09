import { generateJSON } from "../llm/index.js";
import type { ExtractedRequirement } from "../extraction/role-extractor.js";

export type QuestionCategory =
  | "technical"
  | "behavioral"
  | "domain"
  | "system-design"
  | "company-fit";

export interface GeneratedQuestion {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface RequirementWithId extends ExtractedRequirement {
  id: string;
}

const SYSTEM_PROMPT = `Generate interview questions for the given requirement and category
only. Base every question strictly on the requirement text provided — do not introduce
unrelated technologies or claims. Return ONLY JSON:
[{ "prompt": string, "answer_outline": string, "difficulty": 1 | 2 | 3, "category": string }]`;

/**
 * Design decision: rather than generating every one of the 5 categories for every
 * requirement (mostly irrelevant, and too many LLM calls for the batch CLI's 15-min
 * budget), each requirement's "kind" determines which categories actually apply to it.
 */
function categoriesForRequirement(kind: ExtractedRequirement["kind"]): QuestionCategory[] {
  switch (kind) {
    case "technical":
      return ["technical", "system-design"];
    case "behavioral":
      return ["behavioral", "company-fit"];
    case "domain":
      return ["domain"];
    default:
      return ["technical"];
  }
}

async function generateForRequirementCategory(
  requirement: RequirementWithId,
  category: QuestionCategory
): Promise<GeneratedQuestion[]> {
  const userPrompt = `requirement: "${requirement.text}", category: "${category}"`;

  const results = await generateJSON<
    Array<{
      prompt: string;
      answer_outline: string;
      difficulty: 1 | 2 | 3;
      category: string;
    }>
  >({
    system: SYSTEM_PROMPT,
    user: userPrompt,
  });

  return results.map((result) => ({
    id: "",
    requirement_ids: [requirement.id],
    category,
    prompt: result.prompt,
    answer_outline: result.answer_outline,
    difficulty: result.difficulty,
  }));
}

export async function generateQuestions(
  requirements: RequirementWithId[]
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  let nextId = 1;

  for (const requirement of requirements) {
    for (const category of categoriesForRequirement(requirement.kind)) {
      try {
        const generated = await generateForRequirementCategory(requirement, category);
        for (const question of generated) {
          questions.push({ ...question, id: `q${nextId++}` });
        }
      } catch (error) {
        // One failed requirement/category pair never aborts the whole kit —
        // Phase 4's coverage pass catches and reports the resulting gap.
        console.error(
          `Question generation failed for requirement ${requirement.id} / ${category}:`,
          error
        );
      }
    }
  }

  return questions;
}

/**
 * Used by Phase 7's "regenerate one category" action. Unlike `generateQuestions`,
 * this forces a *specific* category regardless of the requirement's `kind` —
 * regeneration re-targets whatever category the replaced questions were already
 * in, not whatever categories that kind would normally get.
 */
export async function generateQuestionsForCategory(
  requirements: RequirementWithId[],
  category: QuestionCategory
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];

  for (const requirement of requirements) {
    try {
      const generated = await generateForRequirementCategory(requirement, category);
      questions.push(...generated);
    } catch (error) {
      console.error(
        `Category regeneration failed for requirement ${requirement.id} / ${category}:`,
        error
      );
    }
  }

  return questions;
}

/** Used by the Phase 4 coverage pass to target only requirements with no linked question. */
export async function generateQuestionsForGaps(
  requirements: RequirementWithId[],
  existingCount: number
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  let nextId = existingCount + 1;

  for (const requirement of requirements) {
    const [primaryCategory] = categoriesForRequirement(requirement.kind);
    if (!primaryCategory) continue;

    try {
      const generated = await generateForRequirementCategory(requirement, primaryCategory);
      for (const question of generated) {
        questions.push({ ...question, id: `q${nextId++}` });
      }
    } catch (error) {
      console.error(`Gap-fill question generation failed for requirement ${requirement.id}:`, error);
    }
  }

  return questions;
}