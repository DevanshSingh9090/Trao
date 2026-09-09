"use client";

import { useState } from "react";

import type { ItemStateEntry, Question, QuestionCategory } from "../../lib/kit-types";
import { QUESTION_CATEGORIES } from "../../lib/kit-types";
import OriginBadge from "./OriginBadge";

function QuestionRow({
  question,
  state,
  index,
  total,
  busy,
  onSave,
  onDelete,
  onMove,
}: {
  question: Question;
  state: ItemStateEntry | null;
  index: number;
  total: number;
  busy: boolean;
  onSave: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answer_outline);
  const [category, setCategory] = useState<QuestionCategory>(question.category);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(question.difficulty);

  // Seed local fields from the *current* props right when editing starts
  // (rather than syncing continuously via an effect — an anti-pattern for
  // derived state). This also means if a previous optimistic save got
  // rolled back while this row was closed, reopening Edit correctly shows
  // the reverted, authoritative values instead of stale local state.
  function startEditing() {
    setPrompt(question.prompt);
    setAnswerOutline(question.answer_outline);
    setCategory(question.category);
    setDifficulty(question.difficulty);
    setEditing(true);
  }

  function handleSave() {
    // Optimistic: fire the save and leave edit mode immediately — no
    // round-trip wait. The parent updates the list instantly and reconciles
    // (or rolls back) once the request settles.
    onSave({ prompt, answer_outline: answerOutline, category, difficulty });
    setEditing(false);
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium capitalize text-zinc-600">
            {question.category}
          </span>
          <span className="text-zinc-400">Difficulty {question.difficulty}</span>
          {state && <OriginBadge origin={state.origin} />}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0 || busy}
            aria-label="Move up"
            className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1 || busy}
            aria-label="Move down"
            className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Question prompt"
          />
          <textarea
            rows={2}
            value={answerOutline}
            onChange={(event) => setAnswerOutline(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Answer outline"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as QuestionCategory)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {QUESTION_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value) as 1 | 2 | 3)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value={1}>Difficulty 1</option>
              <option value={2}>Difficulty 2</option>
              <option value={3}>Difficulty 3</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy}
              className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-zinc-900">{question.prompt}</p>
          <p className="mt-1 text-sm text-zinc-500">{question.answer_outline}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={startEditing}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function AddQuestionForm({
  onAdd,
  adding,
}: {
  onAdd: (input: {
    prompt: string;
    answer_outline: string;
    category: QuestionCategory;
    difficulty: 1 | 2 | 3;
  }) => void;
  adding: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [category, setCategory] = useState<QuestionCategory>("technical");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
      >
        + Add a question
      </button>
    );
  }

  function handleAdd() {
    if (!prompt.trim()) return;
    // Optimistic: fire the add and close the form immediately. The new
    // question appears in the list right away; the parent rolls the kit
    // back and surfaces an error if the request ultimately fails.
    onAdd({ prompt, answer_outline: answerOutline, category, difficulty });
    setPrompt("");
    setAnswerOutline("");
    setOpen(false);
  }

  return (
    <div className="rounded-lg border border-zinc-300 p-4">
      <textarea
        rows={2}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Question prompt"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
      />
      <textarea
        rows={2}
        value={answerOutline}
        onChange={(event) => setAnswerOutline(event.target.value)}
        placeholder="Answer outline"
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
      />
      <div className="mt-2 flex gap-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as QuestionCategory)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {QUESTION_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value) as 1 | 2 | 3)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value={1}>Difficulty 1</option>
          <option value={2}>Difficulty 2</option>
          <option value={3}>Difficulty 3</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={adding || !prompt.trim()}
          className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function QuestionList({
  questions,
  itemState,
  busyId,
  adding,
  regeneratingCategory,
  onPatch,
  onDelete,
  onAdd,
  onReorder,
  onRegenerateCategory,
}: {
  questions: Question[];
  itemState: Record<string, ItemStateEntry>;
  busyId: string | null;
  adding: boolean;
  regeneratingCategory: QuestionCategory | null;
  onPatch: (qid: string, patch: Partial<Question>) => void;
  onDelete: (qid: string) => void;
  onAdd: (input: {
    prompt: string;
    answer_outline: string;
    category: QuestionCategory;
    difficulty: 1 | 2 | 3;
  }) => void;
  onReorder: (orderedIds: string[]) => void;
  onRegenerateCategory: (category: QuestionCategory) => void;
}) {
  const [regenTarget, setRegenTarget] = useState<QuestionCategory>("technical");

  function move(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    onReorder(reordered.map((q) => q.id));
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Questions ({questions.length})</h2>

        <div className="flex items-center gap-2">
          <select
            value={regenTarget}
            onChange={(event) => setRegenTarget(event.target.value as QuestionCategory)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
          >
            {QUESTION_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            onClick={() => onRegenerateCategory(regenTarget)}
            disabled={regeneratingCategory !== null}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {regeneratingCategory === regenTarget
              ? "Regenerating..."
              : "Regenerate category"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        Regenerating a category replaces its &quot;generated&quot; questions only — anything you
        edited or added yourself is kept.
      </p>

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No questions yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {questions.map((question, index) => (
            <QuestionRow
              key={question.id}
              question={question}
              state={itemState[question.id] ?? null}
              index={index}
              total={questions.length}
              busy={busyId === question.id}
              onSave={(patch) => onPatch(question.id, patch)}
              onDelete={() => onDelete(question.id)}
              onMove={(direction) => move(index, direction)}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <AddQuestionForm onAdd={onAdd} adding={adding} />
      </div>
    </section>
  );
}