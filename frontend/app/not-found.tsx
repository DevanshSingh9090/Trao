import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          That page doesn&apos;t exist, or you may not have access to it.
        </p>
        <Link
          href="/kits"
          className="mt-6 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Back to kits
        </Link>
      </div>
    </main>
  );
}