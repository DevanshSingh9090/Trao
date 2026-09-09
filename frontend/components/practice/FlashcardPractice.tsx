"use client";

import { useState } from "react";

import type { Flashcard } from "../../lib/kit-types";

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Blanked",
  2: "Shaky",
  3: "OK",
  4: "Good",
  5: "Nailed it",
};

export default function FlashcardPractice({
  card,
  onConfidence,
  submitting,
}: {
  card: Flashcard;
  onConfidence: (confidence: number) => void;
  submitting: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  function handleConfidence(confidence: number) {
    onConfidence(confidence);
    setRevealed(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {revealed ? "Answer" : "Question"}
      </p>

      <p className="mt-4 min-h-[4rem] text-lg font-medium text-zinc-900">
        {revealed ? card.back : card.front}
      </p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-6 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Reveal answer
        </button>
      ) : (
        <div className="mt-6">
          <p className="mb-3 text-sm text-zinc-500">How confident were you?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => handleConfidence(value)}
                disabled={submitting}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-black disabled:opacity-50"
              >
                <span className="text-base">{value}</span>
                <span>{CONFIDENCE_LABELS[value]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
