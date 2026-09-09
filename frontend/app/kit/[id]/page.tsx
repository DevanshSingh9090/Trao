"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api-client";

import LoadingState from "../../../components/shared/LoadingState";
import ErrorState from "../../../components/shared/ErrorState";

interface Kit {
  _id: string;
  status: string;
  source: Record<string, unknown>;
  company_brief: Record<string, unknown>;
  role: Record<string, unknown>;
  questions: unknown[];
  flashcards: unknown[];
  schedule: Record<string, unknown>;
  coverage: Record<string, unknown>;
}

export default function KitPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [kit, setKit] =
    useState<Kit | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadKit() {
      try {
        const result = await apiRequest<{
          kit: Kit;
        }>(`/api/kits/${id}`);

        setKit(result.kit);
      } catch (error) {
        if (
          error instanceof Error &&
          (
            error.message.includes("Authentication") ||
            error.message.includes("session")
          )
        ) {
          router.replace("/login");
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load kit"
        );
      } finally {
        setLoading(false);
      }
    }

    loadKit();
  }, [id, router]);

  if (loading) {
    return (
      <LoadingState message="Loading interview kit..." />
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState message={error} />

        <Link
          href="/kits"
          className="mt-4 inline-block text-sm font-medium underline"
        >
          Back to kits
        </Link>
      </main>
    );
  }

  if (!kit) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link
            href="/kits"
            className="text-sm font-medium text-zinc-600 hover:text-black"
          >
            ← Back to kits
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Interview Kit
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Status:{" "}
              <span className="font-medium capitalize">
                {kit.status}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">
              Company brief
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Generation will populate this section in Phase 3.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">
              Role
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Requirement extraction will populate this section in Phase 3.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">
              Questions
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Questions will be generated in Phase 3.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">
              Flashcards
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Flashcards will be generated in Phase 3.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}