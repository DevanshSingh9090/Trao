"use client";

import { useEffect, useState } from "react";

// Purely a client-side sense of progress — the backend doesn't stream
// granular stage events, but the pipeline's real order (Phases 2-5) is
// research -> extraction -> question/flashcard generation -> coverage pass
// -> scheduling, so the messages below track that order honestly rather
// than inventing unrelated busywork text.
const STAGES = [
  { atSeconds: 0, message: "Researching the company site..." },
  { atSeconds: 12, message: "Extracting role requirements from the job description..." },
  { atSeconds: 25, message: "Writing interview questions and flashcards..." },
  { atSeconds: 55, message: "Checking every requirement has a matching question..." },
  { atSeconds: 75, message: "Building your day-by-day schedule..." },
];

export default function GeneratingProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStage = [...STAGES].reverse().find((stage) => elapsed >= stage.atSeconds) ?? STAGES[0];
  const stageIndex = STAGES.indexOf(currentStage);

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-black"
        aria-hidden="true"
      />
      <p className="mt-4 font-medium text-zinc-900">Generating your interview kit...</p>
      <p className="mt-1 text-sm text-zinc-500">{currentStage.message}</p>

      <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-1.5">
        {STAGES.map((stage, index) => (
          <span
            key={stage.atSeconds}
            aria-hidden="true"
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= stageIndex ? "bg-black" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Elapsed: {elapsed}s · usually takes 1–3 minutes
      </p>
    </div>
  );
}