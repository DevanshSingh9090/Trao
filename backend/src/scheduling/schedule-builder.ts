export interface ScheduleRequirement {
  id: string;
  priority?: "must" | "nice";
}

export interface ScheduleQuestion {
  id: string;
  requirement_ids: string[];
  category: string;
  difficulty: 1 | 2 | 3;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

function estimateMinutes(question: ScheduleQuestion): number {
  return 10 + question.difficulty * 5;
}

function dominantFocus<Q extends ScheduleQuestion>(bucket: Q[]): string {
  if (bucket.length === 0) return "Review";

  const counts = new Map<string, number>();

  for (const question of bucket) {
    counts.set(question.category, (counts.get(question.category) || 0) + 1);
  }

  let bestCategory = bucket[0]!.category;
  let bestCount = 0;

  for (const [category, count] of counts) {
    if (count > bestCount) {
      bestCategory = category;
      bestCount = count;
    }
  }

  return bestCategory;
}

/**
 * Pure allocation — no LLM. Handles the 1-day (single dense bucket) and 60-day
 * (sparse — questions run out before days do) extremes explicitly.
 *
 * Design decision for the sparse/60-day case: once every question has been
 * placed once, remaining empty days get lighter *review* of earlier material
 * (question ids repeat) rather than being left blank. This is documented as a
 * deliberate choice — the alternative (leaving days marked "review" with no
 * question_ids) is equally valid.
 */
export function buildSchedule<
  R extends ScheduleRequirement,
  Q extends ScheduleQuestion
>(requirements: R[], questions: Q[], daysAvailable: number): Schedule {
  const safeDays = Math.max(1, Math.floor(daysAvailable) || 1);

  const mustRequirementIds = new Set(
    requirements
      .filter((requirement) => requirement.priority === "must")
      .map((requirement) => requirement.id)
  );

  const isMustQuestion = (question: Q) =>
    question.requirement_ids.some((id) => mustRequirementIds.has(id));

  const byDifficultyDesc = (a: Q, b: Q) => b.difficulty - a.difficulty;

  const mustQuestions = questions.filter(isMustQuestion).sort(byDifficultyDesc);
  const niceQuestions = questions.filter((question) => !isMustQuestion(question)).sort(byDifficultyDesc);

  const ordered = [...mustQuestions, ...niceQuestions];

  const buckets: Q[][] = Array.from({ length: safeDays }, (): Q[] => []);

  if (ordered.length === 0) {
    // No questions at all (e.g. a totally failed generation) — still return
    // the right number of days rather than crashing.
    return {
      days_available: safeDays,
      days: buckets.map((_, index) => ({
        day: index + 1,
        focus: "Review",
        question_ids: [],
        minutes: 0,
      })),
    };
  }

  ordered.forEach((question, index) => {
    const dayIndex = Math.min(Math.floor((index * safeDays) / ordered.length), safeDays - 1);
    buckets[dayIndex]!.push(question);
  });

  // 60-day case: cycle lighter review material into any day that ended up empty.
  buckets.forEach((bucket, index) => {
    if (bucket.length === 0) {
      bucket.push(ordered[index % ordered.length]!);
    }
  });

  const days: ScheduleDay[] = buckets.map((bucket, index) => ({
    day: index + 1,
    focus: dominantFocus(bucket),
    question_ids: bucket.map((question) => question.id),
    minutes: Math.round(bucket.reduce((total, question) => total + estimateMinutes(question), 0)),
  }));

  return { days_available: safeDays, days };
}