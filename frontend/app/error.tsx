"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Still log for developers — but the user never sees a blank screen or
    // a raw console stack trace as their only feedback.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-500">
          That wasn&apos;t supposed to happen. You can try again, or head back to your kits.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            onClick={reset}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link
            href="/kits"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Back to kits
          </Link>
        </div>
      </div>
    </main>
  );
}