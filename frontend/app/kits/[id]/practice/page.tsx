"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiRequest } from "../../../../lib/api-client";
import type { Flashcard, Kit, User } from "../../../../lib/kit-types";

import LoadingState from "../../../../components/shared/LoadingState";
import ErrorState from "../../../../components/shared/ErrorState";
import EmptyState from "../../../../components/shared/EmptyState";
import AppHeader from "../../../../components/shared/AppHeader";
import FlashcardPractice from "../../../../components/practice/FlashcardPractice";
import PracticeCoverageBar from "../../../../components/practice/PracticeCoverageBar";

interface Coverage {
  total: number;
  reviewed: string[];
  not_reviewed: string[];
}

function isAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Authentication") || error.message.includes("session"))
  );
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [card, setCard] = useState<Flashcard | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadCoverage = useCallback(async () => {
    try {
      const result = await apiRequest<{ coverage: Coverage }>(
        `/api/kits/${id}/practice/coverage`
      );
      setCoverage(result.coverage);
    } catch {
      // non-fatal — coverage bar just won't update this round
    }
  }, [id]);

  const loadNextCard = useCallback(async () => {
    const result = await apiRequest<{ card: Flashcard | null }>(
      `/api/kits/${id}/practice/session/next`,
      { method: "POST" }
    );
    setCard(result.card);
  }, [id]);

  useEffect(() => {
    async function init() {
      try {
        const me = await apiRequest<{ user: User }>("/api/auth/me");
        setUser(me.user);

        const kitResult = await apiRequest<{ kit: Kit }>(`/api/kits/${id}`);
        setKit(kitResult.kit);

        if (kitResult.kit.status !== "ready") {
          setError("This kit isn't ready yet — finish generating it before practicing.");
          setLoading(false);
          return;
        }

        await Promise.all([loadNextCard(), loadCoverage()]);
      } catch (err) {
        if (isAuthError(err)) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to start practice session");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id, router, loadNextCard, loadCoverage]);

  async function handleConfidence(confidence: number) {
    if (!card) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await apiRequest<{ next: Flashcard | null }>(
        `/api/kits/${id}/practice/session/${card.id}`,
        { method: "POST", body: JSON.stringify({ confidence }) }
      );
      setCard(result.next);
      setReviewedCount((count) => count + 1);
      await loadCoverage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record confidence");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Starting practice session..." />;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <AppHeader user={user} backHref={`/kits/${id}`} backLabel="Back to kit" />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold">Practice</h1>
        {kit?.source?.company && (
          <p className="mt-1 text-sm text-zinc-500">{kit.source.company}</p>
        )}

        {error && (
          <div className="mt-4">
            <ErrorState message={error} />
            <Link href={`/kits/${id}`} className="mt-3 inline-block text-sm font-medium underline">
              Back to kit
            </Link>
          </div>
        )}

        {!error && coverage && (
          <div className="mt-6">
            <PracticeCoverageBar total={coverage.total} reviewed={coverage.reviewed.length} />
          </div>
        )}

        <div className="mt-6">
          {!error && card && (
            <FlashcardPractice card={card} onConfidence={handleConfidence} submitting={submitting} />
          )}

          {!error && !card && (
            <EmptyState
              title="No flashcards to practice"
              description="This kit doesn't have any flashcards yet — add some from the builder."
            />
          )}
        </div>

        {reviewedCount > 0 && (
          <p className="mt-4 text-center text-xs text-zinc-400">
            {reviewedCount} card{reviewedCount === 1 ? "" : "s"} reviewed this session
          </p>
        )}
      </div>
    </main>
  );
}
