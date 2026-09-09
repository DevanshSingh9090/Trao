"use client";

import { useState } from "react";

import type { CompanyBrief, ItemStateEntry } from "../../lib/kit-types";
import OriginBadge from "./OriginBadge";

export default function CompanyBriefCard({
  brief,
  state,
  onSave,
  onRegenerate,
  saving,
  regenerating,
}: {
  brief: CompanyBrief;
  state: ItemStateEntry | null;
  onSave: (patch: { summary?: string; what_they_do?: string }) => Promise<void>;
  onRegenerate: () => Promise<void>;
  saving: boolean;
  regenerating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(brief.summary);
  const [whatTheyDo, setWhatTheyDo] = useState(brief.what_they_do);

  async function handleSave() {
    await onSave({ summary, what_they_do: whatTheyDo });
    setEditing(false);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Company brief</h2>
        <div className="flex items-center gap-2">
          {state && <OriginBadge origin={state.origin} />}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              What they do
            </label>
            <textarea
              rows={2}
              value={whatTheyDo}
              onChange={(event) => setWhatTheyDo(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setSummary(brief.summary);
                setWhatTheyDo(brief.what_they_do);
                setEditing(false);
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-zinc-700">
            {brief.summary || <span className="text-zinc-400">No summary available.</span>}
          </p>
          {brief.what_they_do && (
            <p className="mt-2 text-sm text-zinc-500">{brief.what_they_do}</p>
          )}

          {brief.sources.length > 0 && (
            <p className="mt-3 text-xs text-zinc-400">
              Sources: {brief.sources.join(", ")}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </button>
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
