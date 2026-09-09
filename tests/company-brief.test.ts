import { test } from "node:test";
import assert from "node:assert/strict";

import { composeSummaryWithDiscussionNote } from "../backend/src/generation/company-brief.js";

test("composeSummaryWithDiscussionNote appends the honest note when no discussions were found", () => {
  const result = composeSummaryWithDiscussionNote("Acme builds developer tools.", false);
  assert.equal(
    result,
    "Acme builds developer tools. No public discussion of this company's interview process was found online."
  );
});

test("composeSummaryWithDiscussionNote leaves the summary untouched when discussions exist", () => {
  const result = composeSummaryWithDiscussionNote("Acme builds developer tools.", true);
  assert.equal(result, "Acme builds developer tools.");
});

test("composeSummaryWithDiscussionNote handles an empty summary honestly (no discussions)", () => {
  const result = composeSummaryWithDiscussionNote("", false);
  assert.equal(
    result,
    "No public discussion of this company's interview process was found online."
  );
});