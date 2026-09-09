import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Trao
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            AI Interview Prep Kit
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-600">
            Turn a job description into a personalised
            interview preparation kit.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800"
            >
              Create account
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}