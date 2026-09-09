import { test } from "node:test";
import assert from "node:assert/strict";

import { validateKitStructure } from "../backend/src/persistence/kit-validator.js";

function validKit() {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.com",
      role: "Backend Engineer",
      location: "",
      jd_chars: 120,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.com"],
    },
    company_brief: { summary: "...", what_they_do: "...", sources: ["https://acme.com"] },
    role: {
      title: "Backend Engineer",
      seniority: "Senior",
      responsibilities: ["Build APIs"],
      requirements: [{ id: "r1", text: "5+ years with Node", kind: "technical", priority: "must" }],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain event loop",
        answer_outline: "...",
        difficulty: 2,
      },
    ],
    flashcards: [{ id: "f1", front: "Node?", back: "JS runtime", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "technical", question_ids: ["q1"], minutes: 20 }] },
    coverage: { uncovered_requirement_ids: [], passes: 0 },
  };
}

test("validateKitStructure accepts a well-formed kit", () => {
  const result = validateKitStructure(validKit());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateKitStructure rejects a kit missing required top-level fields", () => {
  const kit: any = validKit();
  delete kit.coverage;

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((e: string) => e.includes("coverage")), true);
});

test("validateKitStructure rejects a question referencing an unknown requirement id", () => {
  const kit: any = validKit();
  kit.questions[0].requirement_ids = ["r-does-not-exist"];

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((e: string) => e.includes("unknown requirement id")), true);
});

test("validateKitStructure rejects a schedule day referencing an unknown question id", () => {
  const kit: any = validKit();
  kit.schedule.days[0].question_ids = ["q-does-not-exist"];

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((e: string) => e.includes("unknown question id")), true);
});

test("validateKitStructure rejects non-integer minutes", () => {
  const kit: any = validKit();
  kit.schedule.days[0].minutes = 20.5;

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((e: string) => e.includes("minutes")), true);
});

test("validateKitStructure rejects an invalid priority value", () => {
  const kit: any = validKit();
  kit.role.requirements[0].priority = "sometimes";

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
});