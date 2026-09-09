import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSchedule } from "../backend/src/scheduling/schedule-builder.js";

function makeQuestions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    requirement_ids: [`r${(i % 2) + 1}`],
    category: i % 2 === 0 ? "technical" : "behavioral",
    difficulty: ((i % 3) + 1) as 1 | 2 | 3,
  }));
}

const requirements = [
  { id: "r1", priority: "must" as const },
  { id: "r2", priority: "nice" as const },
];

test("buildSchedule produces exactly the requested number of days", () => {
  for (const days of [1, 5, 60]) {
    const schedule = buildSchedule(requirements, makeQuestions(10), days);
    assert.equal(schedule.days.length, days);
    assert.equal(schedule.days_available, days);
  }
});

test("buildSchedule always uses integer minutes", () => {
  const schedule = buildSchedule(requirements, makeQuestions(7), 5);
  for (const day of schedule.days) {
    assert.equal(Number.isInteger(day.minutes), true);
  }
});

test("buildSchedule handles the 1-day case as a single dense bucket", () => {
  const schedule = buildSchedule(requirements, makeQuestions(10), 1);
  assert.equal(schedule.days.length, 1);
  assert.equal(schedule.days[0]?.question_ids.length, 10);
});

test("buildSchedule handles the 60-day sparse case without leaving days empty", () => {
  const schedule = buildSchedule(requirements, makeQuestions(5), 60);
  assert.equal(schedule.days.length, 60);
  for (const day of schedule.days) {
    assert.equal(day.question_ids.length > 0, true); // review material cycles in
  }
});

test("every must-have requirement's question appears somewhere across the days", () => {
  const questions = [
    { id: "q1", requirement_ids: ["r1"], category: "technical", difficulty: 3 as const },
    { id: "q2", requirement_ids: ["r2"], category: "behavioral", difficulty: 1 as const },
  ];

  const schedule = buildSchedule(requirements, questions, 5);
  const allQuestionIds = schedule.days.flatMap((d) => d.question_ids);

  assert.equal(allQuestionIds.includes("q1"), true);
});

test("buildSchedule doesn't crash with zero questions", () => {
  const schedule = buildSchedule(requirements, [], 5);
  assert.equal(schedule.days.length, 5);
  for (const day of schedule.days) {
    assert.equal(day.minutes, 0);
    assert.deepEqual(day.question_ids, []);
  }
});