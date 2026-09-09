import { findUncovered } from "../src/coverage/coverage-checker.js";
import { buildSchedule } from "../src/scheduling/schedule-builder.js";

const requirements = [
  { id: "r1", priority: "must" as const },
  { id: "r2", priority: "must" as const },
  { id: "r3", priority: "nice" as const },
];

const questions = [
  { id: "q1", requirement_ids: ["r1"], category: "technical", difficulty: 3 as const },
  { id: "q2", requirement_ids: ["r2"], category: "technical", difficulty: 2 as const },
  { id: "q3", requirement_ids: ["r3"], category: "behavioral", difficulty: 1 as const },
];

console.log("uncovered:", findUncovered(requirements, questions)); // expect []

for (const days of [1, 5, 60]) {
  const schedule = buildSchedule(requirements, questions, days);
  console.log(
    `days=${days} -> days.length=${schedule.days.length}`,
    schedule.days.map((d) => `day${d.day}:${d.minutes}min`).join(", ")
  );
}