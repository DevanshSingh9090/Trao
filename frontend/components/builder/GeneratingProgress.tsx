"use client";

import { useEffect, useState } from "react";

export default function GeneratingProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
      <div
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-black"
        aria-hidden="true"
      />
      <p className="mt-4 font-medium text-zinc-900">Generating your interview kit...</p>
      <p className="mt-1 text-sm text-zinc-500">
        Researching the company, extracting requirements, and writing questions and
        flashcards. This usually takes 1-3 minutes.
      </p>
      <p className="mt-3 text-xs text-zinc-400">Elapsed: {elapsed}s</p>
    </div>
  );
}
