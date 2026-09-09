import { test } from "node:test";
import assert from "node:assert/strict";

import { findUncovered, coveragePass } from "../backend/src/coverage/coverage-checker.js";

test("findUncovered returns requirements with no linked question", () => {
  const requirements = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];
  const questions = [
    { id: "q1", requirement_ids: ["r1"] },
    { id: "q2", requirement_ids: ["r1", "r3"] },
  ];

  assert.deepEqual(findUncovered(requirements, questions), ["r2"]);
});

test("findUncovered returns [] when every requirement is covered", () => {
  const requirements = [{ id: "r1" }, { id: "r2" }];
  const questions = [
    { id: "q1", requirement_ids: ["r1"] },
    { id: "q2", requirement_ids: ["r2"] },
  ];

  assert.deepEqual(findUncovered(requirements, questions), []);
});

test("coveragePass makes exactly one gap-fill call when one requirement is uncovered", async () => {
  const requirements = [{ id: "r1" }, { id: "r2" }];
  const initialQuestions = [{ id: "q1", requirement_ids: ["r1"] }];

  let callCount = 0;

  const result = await coveragePass(requirements, initialQuestions, async (uncovered, existingCount) => {
    callCount += 1;
    assert.deepEqual(uncovered.map((r) => r.id), ["r2"]);
    return [{ id: `q${existingCount + 1}`, requirement_ids: ["r2"] }];
  });

  assert.equal(callCount, 1);
  assert.deepEqual(result.coverage.uncovered_requirement_ids, []);
  assert.equal(result.coverage.passes, 1);
  assert.equal(result.questions.length, 2);
});

test("coveragePass stops looping once a gap-fill pass adds nothing new", async () => {
  const requirements = [{ id: "r1" }];
  const initialQuestions: { id: string; requirement_ids: string[] }[] = [];

  let callCount = 0;

  const result = await coveragePass(
    requirements,
    initialQuestions,
    async () => {
      callCount += 1;
      return []; // simulates a gap-fill that never manages to cover it
    },
    2
  );

  assert.equal(callCount, 1); // doesn't burn the second pass for no gain
  assert.deepEqual(result.coverage.uncovered_requirement_ids, ["r1"]);
});

test("coveragePass never crashes when the gap-fill generator throws", async () => {
  const requirements = [{ id: "r1" }];
  const initialQuestions: { id: string; requirement_ids: string[] }[] = [];

  const result = await coveragePass(
    requirements,
    initialQuestions,
    async () => {
      throw new Error("LLM unavailable");
    },
    1
  );

  assert.deepEqual(result.coverage.uncovered_requirement_ids, ["r1"]);
  assert.equal(result.coverage.passes, 1);
});