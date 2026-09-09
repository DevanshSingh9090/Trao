"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiRequest } from "../../../lib/api-client";
import type {
  Flashcard,
  Kit,
  Question,
  QuestionCategory,
  ResearchFailure,
  User,
} from "../../../lib/kit-types";

import LoadingState from "../../../components/shared/LoadingState";
import ErrorState from "../../../components/shared/ErrorState";
import AppHeader from "../../../components/shared/AppHeader";
import GenerateForm from "../../../components/builder/GenerateForm";
import GeneratingProgress from "../../../components/builder/GeneratingProgress";
import CompanyBriefCard from "../../../components/builder/CompanyBriefCard";
import RoleSummary from "../../../components/builder/RoleSummary";
import QuestionList from "../../../components/builder/QuestionList";
import FlashcardList from "../../../components/builder/FlashcardList";
import ScheduleView from "../../../components/builder/ScheduleView";
import CoverageBanner from "../../../components/builder/CoverageBanner";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Authentication") || error.message.includes("session"))
  );
}

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [researchFailures, setResearchFailures] = useState<ResearchFailure[]>([]);

  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [regeneratingCategory, setRegeneratingCategory] = useState<QuestionCategory | null>(
    null
  );

  const [busyFlashcardId, setBusyFlashcardId] = useState<string | null>(null);
  const [addingFlashcard, setAddingFlashcard] = useState(false);

  const [savingBrief, setSavingBrief] = useState(false);
  const [regeneratingBrief, setRegeneratingBrief] = useState(false);
  const [regeneratingSchedule, setRegeneratingSchedule] = useState(false);

  const [actionError, setActionError] = useState("");

  // Kept as a ref (not state) so optimistic handlers always snapshot the
  // latest kit synchronously before mutating — avoids stale-closure bugs if
  // two optimistic actions fire in quick succession.
  const kitRef = useRef<Kit | null>(null);
  useEffect(() => {
    kitRef.current = kit;
  }, [kit]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchKit = useCallback(async () => {
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}`);
      setKit(result.kit);
      return result.kit;
    } catch (err) {
      if (isAuthError(err)) {
        router.replace("/login");
        return null;
      }
      setLoadError(err instanceof Error ? err.message : "Unable to load kit");
      return null;
    }
  }, [id, router]);

  useEffect(() => {
    async function init() {
      try {
        const me = await apiRequest<{ user: User }>("/api/auth/me");
        setUser(me.user);
      } catch {
        router.replace("/login");
        return;
      }

      await fetchKit();
      setLoading(false);
    }

    init();
  }, [fetchKit, router]);

  // Poll /status while a kit is "generating" (e.g. this page was reloaded mid-generation
  // in another tab, or after our own generate call kicks it off).
  useEffect(() => {
    if (kit?.status !== "generating") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const status = await apiRequest<{ status: string }>(`/api/kits/${id}/status`);
        if (status.status !== "generating") {
          if (pollRef.current) clearInterval(pollRef.current);
          await fetchKit();
        }
      } catch {
        // transient poll failure — keep trying on the next tick
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [kit?.status, id, fetchKit]);

  async function handleGenerate(input: { jd: string; companyUrl: string; days: number }) {
    setGenerating(true);
    setGenerateError("");
    setResearchFailures([]);

    try {
      await apiRequest<{ status: string }>(
        `/api/kits/${id}/generate`,
        { method: "POST", body: JSON.stringify(input) }
      );
      // Backend now responds immediately (202) and runs generation in the
      // background — the /status poll effect above picks up "ready"/"failed"
      // and calls fetchKit() when it's done. Just reflect "generating" now.
      await fetchKit();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
      await fetchKit(); // pick up the persisted "failed" status
    } finally {
      setGenerating(false);
    }
  }

  /**
   * Phase 10: optimistic mutation helper. Applies `optimisticNext` to local
   * state immediately (no round-trip wait), fires the real request in the
   * background, then reconciles with the server's authoritative kit on
   * success — or rolls all the way back to the pre-action snapshot and
   * surfaces `errorFallback` on failure.
   */
  async function runOptimistic(
    optimisticNext: Kit,
    request: () => Promise<{ kit: Kit }>,
    errorFallback: string
  ) {
    const previousKit = kitRef.current;
    if (!previousKit) return;

    setActionError("");
    setKit(optimisticNext);

    try {
      const result = await request();
      setKit(result.kit);
    } catch (err) {
      setKit(previousKit);
      setActionError(err instanceof Error ? err.message : errorFallback);
    }
  }

  // ---------- questions ----------

  function patchQuestion(qid: string, patch: Partial<Question>) {
    const current = kitRef.current;
    if (!current) return;

    const optimistic: Kit = {
      ...current,
      questions: current.questions.map((question) =>
        question.id === qid ? { ...question, ...patch } : question
      ),
      itemState: {
        ...current.itemState,
        questions: {
          ...current.itemState?.questions,
          [qid]: { origin: "edited", updatedAt: new Date().toISOString() },
        },
      },
    };

    setBusyQuestionId(qid);
    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      "Unable to save question — change reverted"
    ).finally(() => setBusyQuestionId(null));
  }

  function deleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    const current = kitRef.current;
    if (!current) return;

    const optimistic: Kit = {
      ...current,
      questions: current.questions.filter((question) => question.id !== qid),
    };

    setBusyQuestionId(qid);
    runOptimistic(
      optimistic,
      () => apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`, { method: "DELETE" }),
      "Unable to delete question — restored"
    ).finally(() => setBusyQuestionId(null));
  }

  function addQuestion(input: {
    prompt: string;
    answer_outline: string;
    category: QuestionCategory;
    difficulty: 1 | 2 | 3;
  }) {
    const current = kitRef.current;
    if (!current) return;

    const tempId = `temp-q-${Date.now()}`;
    const optimisticQuestion: Question = { id: tempId, requirement_ids: [], ...input };

    const optimistic: Kit = {
      ...current,
      questions: [...current.questions, optimisticQuestion],
      itemState: {
        ...current.itemState,
        questions: {
          ...current.itemState?.questions,
          [tempId]: { origin: "pinned", updatedAt: new Date().toISOString() },
        },
      },
    };

    setAddingQuestion(true);
    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions`, {
          method: "POST",
          body: JSON.stringify({ ...input, pinned: true }),
        }),
      "Unable to add question — reverted"
    ).finally(() => setAddingQuestion(false));
  }

  function reorderQuestions(orderedIds: string[]) {
    const current = kitRef.current;
    if (!current) return;

    const byId = new Map(current.questions.map((question) => [question.id, question]));
    const optimisticQuestions = orderedIds
      .map((qid) => byId.get(qid))
      .filter((question): question is Question => Boolean(question));

    // Safety net: if the ids somehow don't line up 1:1, don't silently drop
    // questions from view — fall back to the original order instead.
    if (optimisticQuestions.length !== current.questions.length) return;

    const optimistic: Kit = { ...current, questions: optimisticQuestions };

    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/reorder`, {
          method: "POST",
          body: JSON.stringify({ questionIds: orderedIds }),
        }),
      "Unable to reorder questions — order reverted"
    );
  }

  function regenerateCategory(category: QuestionCategory) {
    // Not optimistic on purpose: this replaces content with fresh LLM output
    // we don't have yet, so there's nothing honest to show until it returns.
    // Phase 10 asks for optimistic edits/reorders, not for fabricating
    // generated content ahead of time.
    setRegeneratingCategory(category);
    setActionError("");
    apiRequest<{ kit: Kit }>(`/api/kits/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ section: `category:${category}` }),
    })
      .then((result) => setKit(result.kit))
      .catch((err) =>
        setActionError(err instanceof Error ? err.message : "Unable to regenerate category")
      )
      .finally(() => setRegeneratingCategory(null));
  }

  // ---------- flashcards ----------

  function patchFlashcard(fid: string, patch: { front?: string; back?: string }) {
    const current = kitRef.current;
    if (!current) return;

    const optimistic: Kit = {
      ...current,
      flashcards: current.flashcards.map((flashcard) =>
        flashcard.id === fid ? { ...flashcard, ...patch } : flashcard
      ),
      itemState: {
        ...current.itemState,
        flashcards: {
          ...current.itemState?.flashcards,
          [fid]: { origin: "edited", updatedAt: new Date().toISOString() },
        },
      },
    };

    setBusyFlashcardId(fid);
    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      "Unable to save flashcard — change reverted"
    ).finally(() => setBusyFlashcardId(null));
  }

  function deleteFlashcard(fid: string) {
    if (!confirm("Delete this flashcard?")) return;
    const current = kitRef.current;
    if (!current) return;

    const optimistic: Kit = {
      ...current,
      flashcards: current.flashcards.filter((flashcard) => flashcard.id !== fid),
    };

    setBusyFlashcardId(fid);
    runOptimistic(
      optimistic,
      () => apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`, { method: "DELETE" }),
      "Unable to delete flashcard — restored"
    ).finally(() => setBusyFlashcardId(null));
  }

  function addFlashcard(input: { front: string; back: string }) {
    const current = kitRef.current;
    if (!current) return;

    const tempId = `temp-f-${Date.now()}`;
    const optimisticFlashcard: Flashcard = { id: tempId, requirement_ids: [], ...input };

    const optimistic: Kit = {
      ...current,
      flashcards: [...current.flashcards, optimisticFlashcard],
      itemState: {
        ...current.itemState,
        flashcards: {
          ...current.itemState?.flashcards,
          [tempId]: { origin: "pinned", updatedAt: new Date().toISOString() },
        },
      },
    };

    setAddingFlashcard(true);
    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards`, {
          method: "POST",
          body: JSON.stringify({ ...input, pinned: true }),
        }),
      "Unable to add flashcard — reverted"
    ).finally(() => setAddingFlashcard(false));
  }

  // ---------- company brief ----------

  function saveBrief(patch: { summary?: string; what_they_do?: string }) {
    const current = kitRef.current;
    if (!current) return;

    const optimistic: Kit = {
      ...current,
      company_brief: { ...current.company_brief, ...patch },
      itemState: {
        ...current.itemState,
        companyBrief: { origin: "edited", updatedAt: new Date().toISOString() },
      },
    };

    setSavingBrief(true);
    runOptimistic(
      optimistic,
      () =>
        apiRequest<{ kit: Kit }>(`/api/kits/${id}/brief`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      "Unable to save brief — change reverted"
    ).finally(() => setSavingBrief(false));
  }

  function regenerateBrief() {
    // Not optimistic — same reasoning as regenerateCategory above.
    setRegeneratingBrief(true);
    setActionError("");
    apiRequest<{ kit: Kit }>(`/api/kits/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ section: "brief" }),
    })
      .then((result) => setKit(result.kit))
      .catch((err) =>
        setActionError(err instanceof Error ? err.message : "Unable to regenerate brief")
      )
      .finally(() => setRegeneratingBrief(false));
  }

  // ---------- schedule ----------

  async function regenerateSchedule(days?: number): Promise<void> {
    // Not optimistic — rebuilding the schedule is pure code, but it depends
    // on the authoritative server-side question set, so there's still a
    // real round trip worth waiting for here.
    setRegeneratingSchedule(true);
    setActionError("");

    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ section: "schedule", days }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to regenerate schedule");
    } finally {
      setRegeneratingSchedule(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading interview kit..." />;
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState message={loadError} />
        <Link href="/kits" className="mt-4 inline-block text-sm font-medium underline">
          Back to kits
        </Link>
      </main>
    );
  }

  if (!kit) return null;

  return (
    <main className="min-h-screen bg-zinc-50">
      <AppHeader user={user} backHref="/kits" backLabel="Back to kits" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {kit.source?.role || "Interview Kit"}
            </h1>
            {kit.source?.company && (
              <p className="mt-1 text-zinc-500">{kit.source.company}</p>
            )}
          </div>

          {kit.status === "ready" && (
            <Link
              href={`/kits/${id}/practice`}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Practice flashcards
            </Link>
          )}
        </div>

        {actionError && (
          <div className="mt-4">
            <ErrorState message={actionError} />
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          {kit.status === "draft" && (
            <GenerateForm
              onSubmit={handleGenerate}
              submitting={generating}
              errorMessage={generateError}
            />
          )}

          {(kit.status === "generating" || generating) && <GeneratingProgress />}

          {kit.status === "failed" && !generating && (
            <div className="space-y-4">
              <ErrorState message="Generation failed. You can try again below." />
              <GenerateForm
                onSubmit={handleGenerate}
                submitting={generating}
                errorMessage={generateError}
                isRetry
              />
            </div>
          )}

          {kit.status === "ready" && !generating && (
            <div className="space-y-6">
              {researchFailures.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">
                    {researchFailures.length} page{researchFailures.length === 1 ? "" : "s"}{" "}
                    couldn&apos;t be researched:
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {researchFailures.map((failure, index) => (
                      <li key={index}>
                        {failure.url} — {failure.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <CoverageBanner
                coverage={kit.coverage}
                requirements={kit.role.requirements}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <CompanyBriefCard
                  brief={kit.company_brief}
                  state={kit.itemState?.companyBrief ?? null}
                  onSave={saveBrief}
                  onRegenerate={regenerateBrief}
                  saving={savingBrief}
                  regenerating={regeneratingBrief}
                />
                <RoleSummary role={kit.role} />
              </div>

              <QuestionList
                questions={kit.questions}
                itemState={kit.itemState?.questions ?? {}}
                busyId={busyQuestionId}
                adding={addingQuestion}
                regeneratingCategory={regeneratingCategory}
                onPatch={patchQuestion}
                onDelete={deleteQuestion}
                onAdd={addQuestion}
                onReorder={reorderQuestions}
                onRegenerateCategory={regenerateCategory}
              />

              <FlashcardList
                flashcards={kit.flashcards}
                itemState={kit.itemState?.flashcards ?? {}}
                busyId={busyFlashcardId}
                adding={addingFlashcard}
                onPatch={patchFlashcard}
                onDelete={deleteFlashcard}
                onAdd={addFlashcard}
              />

              <ScheduleView
                schedule={kit.schedule}
                questions={kit.questions}
                state={kit.itemState?.schedule ?? null}
                onRegenerate={regenerateSchedule}
                regenerating={regeneratingSchedule}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}