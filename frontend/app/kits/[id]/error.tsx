"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function KitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Kit builder error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900">This kit couldn&apos;t be displayed</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Something unexpected happened while rendering this kit. Your data is safe — try
        reloading this view.
      </p>

      <div className="mt-6 flex justify-center gap-2">
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
    </main>
  );
}