export interface CoverageRequirement {
  id: string;
}

export interface CoverageQuestion {
  id: string;
  requirement_ids: string[];
}

export interface CoverageInfo {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface CoveragePassResult<Q> {
  questions: Q[];
  coverage: CoverageInfo;
}

/**
 * Pure code, no LLM. A requirement is "covered" if at least one question
 * lists its id in `requirement_ids`.
 */
export function findUncovered<R extends CoverageRequirement, Q extends CoverageQuestion>(
  requirements: R[],
  questions: Q[]
): string[] {
  const coveredIds = new Set<string>();

  for (const question of questions) {
    for (const requirementId of question.requirement_ids ?? []) {
      coveredIds.add(requirementId);
    }
  }

  return requirements.filter((requirement) => !coveredIds.has(requirement.id)).map((requirement) => requirement.id);
}

/**
 * Deterministic gap-fill loop. The comparison (`findUncovered`) is always
 * plain code — `generateMissingQuestionsFn` is the only LLM call, and it is
 * only ever given the specific requirements that ended up uncovered.
 *
 * Design decision (documented in README): maxPasses defaults to 2 — one
 * initial draft pass is assumed to have already happened before this is
 * called, so this function performs at most 2 *additional* targeted
 * gap-fill passes. If a pass comes back with zero new questions (LLM
 * failure or a genuinely unfillable gap), we stop immediately rather than
 * burning the remaining passes for no gain — a kit either gets covered or
 * honestly reports what's still uncovered.
 */
export async function coveragePass<R extends CoverageRequirement, Q extends CoverageQuestion>(
  requirements: R[],
  questions: Q[],
  generateMissingQuestionsFn: (uncovered: R[], existingCount: number) => Promise<Q[]>,
  maxPasses = 2
): Promise<CoveragePassResult<Q>> {
  let currentQuestions = [...questions];
  let passes = 0;

  while (true) {
    const uncoveredIds = findUncovered(requirements, currentQuestions);

    if (uncoveredIds.length === 0 || passes >= maxPasses) {
      break;
    }

    const uncoveredRequirements = requirements.filter((requirement) => uncoveredIds.includes(requirement.id));

    let newQuestions: Q[] = [];
    try {
      newQuestions = await generateMissingQuestionsFn(uncoveredRequirements, currentQuestions.length);
    } catch (error) {
      // Never let a gap-fill failure crash the whole kit — record the gap
      // honestly instead (Section 9: "rate limit hit / LLM failure -> never
      // crash the run").
      console.error("Coverage gap-fill generation failed:", error);
      newQuestions = [];
    }

    passes += 1;

    if (!newQuestions || newQuestions.length === 0) {
      // No forward progress this pass — don't spend the remaining passes.
      break;
    }

    currentQuestions = [...currentQuestions, ...newQuestions];
  }

  return {
    questions: currentQuestions,
    coverage: {
      uncovered_requirement_ids: findUncovered(requirements, currentQuestions),
      passes,
    },
  };
}