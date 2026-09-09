export interface PracticeFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface PracticeLogEntry {
  flashcardId: string;
  confidence: number;
  reviewedAt: Date | string;
}

export interface PracticeCoverage {
  total: number;
  reviewed: string[];
  not_reviewed: string[];
}

/**
 * Design decision (documented in README): confidence-weighted sort rather
 * than spaced-repetition intervals. Simple and defensible for a first pass —
 * never-reviewed cards surface first, then lowest-confidence cards, with
 * least-recently-reviewed as the tiebreak. Pure code, no LLM.
 */
export function pickNextCard(
  flashcards: PracticeFlashcard[],
  practiceLog: PracticeLogEntry[]
): PracticeFlashcard | null {
  if (flashcards.length === 0) return null;

  const latestByCard = new Map<string, PracticeLogEntry>();

  for (const entry of practiceLog) {
    const existing = latestByCard.get(entry.flashcardId);
    if (!existing || new Date(entry.reviewedAt).getTime() > new Date(existing.reviewedAt).getTime()) {
      latestByCard.set(entry.flashcardId, entry);
    }
  }

  const scored = flashcards.map((card) => {
    const latest = latestByCard.get(card.id);
    return {
      card,
      neverReviewed: !latest,
      confidence: latest ? latest.confidence : 0,
      reviewedAtMs: latest ? new Date(latest.reviewedAt).getTime() : 0,
    };
  });

  scored.sort((a, b) => {
    if (a.neverReviewed !== b.neverReviewed) return a.neverReviewed ? -1 : 1;
    if (a.confidence !== b.confidence) return a.confidence - b.confidence;
    return a.reviewedAtMs - b.reviewedAtMs;
  });

  return scored[0]?.card ?? null;
}

/** Pure code — what's been reviewed at least once vs never touched. */
export function practiceCoverage(
  flashcards: PracticeFlashcard[],
  practiceLog: PracticeLogEntry[]
): PracticeCoverage {
  const reviewedIds = new Set(practiceLog.map((entry) => entry.flashcardId));

  return {
    total: flashcards.length,
    reviewed: flashcards.filter((card) => reviewedIds.has(card.id)).map((card) => card.id),
    not_reviewed: flashcards.filter((card) => !reviewedIds.has(card.id)).map((card) => card.id),
  };
}