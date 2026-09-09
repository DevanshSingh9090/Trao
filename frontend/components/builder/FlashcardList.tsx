"use client";

import { useState } from "react";

import type { Flashcard, ItemStateEntry } from "../../lib/kit-types";
import OriginBadge from "./OriginBadge";

function FlashcardRow({
  flashcard,
  state,
  busy,
  onSave,
  onDelete,
}: {
  flashcard: Flashcard;
  state: ItemStateEntry | null;
  busy: boolean;
  onSave: (patch: { front?: string; back?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);

  async function handleSave() {
    await onSave({ front, back });
    setEditing(false);
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Card {flashcard.id}</span>
        {state && <OriginBadge origin={state.origin} />}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="Front"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <textarea
            rows={2}
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="Back"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
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
          <p className="mt-2 text-sm font-medium text-zinc-900">{flashcard.front}</p>
          <p className="mt-1 text-sm text-zinc-500">{flashcard.back}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setEditing(true)}
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

function AddFlashcardForm({
  onAdd,
  adding,
}: {
  onAdd: (input: { front: string; back: string }) => Promise<void>;
  adding: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
      >
        + Add a flashcard
      </button>
    );
  }

  async function handleAdd() {
    if (!front.trim() || !back.trim()) return;
    await onAdd({ front, back });
    setFront("");
    setBack("");
    setOpen(false);
  }

  return (
    <div className="rounded-lg border border-zinc-300 p-4">
      <input
        value={front}
        onChange={(event) => setFront(event.target.value)}
        placeholder="Front"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
      />
      <textarea
        rows={2}
        value={back}
        onChange={(event) => setBack(event.target.value)}
        placeholder="Back"
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={adding || !front.trim() || !back.trim()}
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

export default function FlashcardList({
  flashcards,
  itemState,
  busyId,
  adding,
  onPatch,
  onDelete,
  onAdd,
}: {
  flashcards: Flashcard[];
  itemState: Record<string, ItemStateEntry>;
  busyId: string | null;
  adding: boolean;
  onPatch: (fid: string, patch: { front?: string; back?: string }) => Promise<void>;
  onDelete: (fid: string) => Promise<void>;
  onAdd: (input: { front: string; back: string }) => Promise<void>;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-semibold">Flashcards ({flashcards.length})</h2>

      {flashcards.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No flashcards yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {flashcards.map((flashcard) => (
            <FlashcardRow
              key={flashcard.id}
              flashcard={flashcard}
              state={itemState[flashcard.id] ?? null}
              busy={busyId === flashcard.id}
              onSave={(patch) => onPatch(flashcard.id, patch)}
              onDelete={() => onDelete(flashcard.id)}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <AddFlashcardForm onAdd={onAdd} adding={adding} />
      </div>
    </section>
  );
}
