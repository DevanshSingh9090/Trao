import { generateJSON } from "../llm/index.js";
import type { RequirementWithId } from "../generation/question-generator.js";

export interface GeneratedFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
}

const SYSTEM_PROMPT = `Generate concise interview-prep flashcards for the given list of
requirements. Base every flashcard strictly on the requirement text provided — do not
invent facts or technologies. Produce 1-2 flashcards per requirement. Return ONLY JSON:
[{ "requirement_id": string, "front": string, "back": string }]`;

export async function generateFlashcards(
  requirements: RequirementWithId[]
): Promise<GeneratedFlashcard[]> {
  if (requirements.length === 0) return [];

  const userPrompt = requirements
    .map((requirement) => `${requirement.id}: ${requirement.text}`)
    .join("\n");

  try {
    const results = await generateJSON<
      Array<{ requirement_id: string; front: string; back: string }>
    >({ system: SYSTEM_PROMPT, user: userPrompt });

    const validIds = new Set(requirements.map((requirement) => requirement.id));

    return results
      .filter((result) => validIds.has(result.requirement_id))
      .map((result, index) => ({
        id: `f${index + 1}`,
        front: result.front,
        back: result.back,
        requirement_ids: [result.requirement_id],
      }));
  } catch (error) {
    console.error("Flashcard generation failed:", error);
    return [];
  }
}