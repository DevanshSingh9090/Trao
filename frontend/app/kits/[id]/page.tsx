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
      const result = await apiRequest<{ kit: Kit; researchFailures?: ResearchFailure[] }>(
        `/api/kits/${id}/generate`,
        { method: "POST", body: JSON.stringify(input) }
      );
      setKit(result.kit);
      setResearchFailures(result.researchFailures || []);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
      await fetchKit(); // pick up the persisted "failed" status
    } finally {
      setGenerating(false);
    }
  }

  // ---------- questions ----------

  async function patchQuestion(qid: string, patch: Partial<Question>) {
    setBusyQuestionId(qid);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to save question");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    setBusyQuestionId(qid);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`, {
        method: "DELETE",
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete question");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function addQuestion(input: {
    prompt: string;
    answer_outline: string;
    category: QuestionCategory;
    difficulty: 1 | 2 | 3;
  }) {
    setAddingQuestion(true);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/questions`, {
        method: "POST",
        body: JSON.stringify({ ...input, pinned: true }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add question");
    } finally {
      setAddingQuestion(false);
    }
  }

  async function reorderQuestions(orderedIds: string[]) {
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/reorder`, {
        method: "POST",
        body: JSON.stringify({ questionIds: orderedIds }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to reorder questions");
    }
  }

  async function regenerateCategory(category: QuestionCategory) {
    setRegeneratingCategory(category);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ section: `category:${category}` }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to regenerate category");
    } finally {
      setRegeneratingCategory(null);
    }
  }

  // ---------- flashcards ----------

  async function patchFlashcard(fid: string, patch: { front?: string; back?: string }) {
    setBusyFlashcardId(fid);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to save flashcard");
    } finally {
      setBusyFlashcardId(null);
    }
  }

  async function deleteFlashcard(fid: string) {
    if (!confirm("Delete this flashcard?")) return;
    setBusyFlashcardId(fid);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`, {
        method: "DELETE",
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete flashcard");
    } finally {
      setBusyFlashcardId(null);
    }
  }

  async function addFlashcard(input: { front: string; back: string }) {
    setAddingFlashcard(true);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/flashcards`, {
        method: "POST",
        body: JSON.stringify({ ...input, pinned: true }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add flashcard");
    } finally {
      setAddingFlashcard(false);
    }
  }

  // ---------- company brief ----------

  async function saveBrief(patch: { summary?: string; what_they_do?: string }) {
    setSavingBrief(true);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/brief`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to save brief");
    } finally {
      setSavingBrief(false);
    }
  }

  async function regenerateBrief() {
    setRegeneratingBrief(true);
    setActionError("");
    try {
      const result = await apiRequest<{ kit: Kit }>(`/api/kits/${id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ section: "brief" }),
      });
      setKit(result.kit);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to regenerate brief");
    } finally {
      setRegeneratingBrief(false);
    }
  }

  // ---------- schedule ----------

  async function regenerateSchedule(days?: number) {
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

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">
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

        <div className="mt-8">
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
