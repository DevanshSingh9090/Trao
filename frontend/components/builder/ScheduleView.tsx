"use client";

import { useState } from "react";

import type { ItemStateEntry, Question, Schedule } from "../../lib/kit-types";
import OriginBadge from "./OriginBadge";

export default function ScheduleView({
  schedule,
  questions,
  state,
  onRegenerate,
  regenerating,
}: {
  schedule: Schedule;
  questions: Question[];
  state: ItemStateEntry | null;
  onRegenerate: (days?: number) => Promise<void>;
  regenerating: boolean;
}) {
  const [days, setDays] = useState(schedule.days_available);
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          Schedule ({schedule.days_available} day{schedule.days_available === 1 ? "" : "s"})
        </h2>
        <div className="flex items-center gap-2">
          {state && <OriginBadge origin={state.origin} />}
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
          />
          <button
            onClick={() => onRegenerate(days)}
            disabled={regenerating}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {regenerating ? "Rebuilding..." : "Regenerate"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {schedule.days.map((day) => (
          <div key={day.day} className="rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Day {day.day}</span>
              <span className="text-xs text-zinc-400">
                {day.focus} · {day.minutes} min
              </span>
            </div>
            {day.question_ids.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-zinc-600">
                {day.question_ids.map((qid) => {
                  const question = questionById.get(qid);
                  return <li key={qid}>{question ? question.prompt : qid}</li>;
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
