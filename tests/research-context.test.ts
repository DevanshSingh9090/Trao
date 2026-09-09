import { test } from "node:test";
import assert from "node:assert/strict";

import { buildResearchContext } from "../backend/src/generation/question-generator.js";

test("Phase 3: question-generation research context includes retrieved company pages", () => {
  const context = buildResearchContext({
    pages: [
      {
        url: "https://acme.example/careers",
        title: "Careers",
        text: "Acme uses TypeScript and builds distributed systems.",
        status: 200,
        contentType: "text/html",
      },
    ],
  });

  assert.match(context, /Acme uses TypeScript/);
  assert.match(context, /untrusted source data/i);
});

test("Phase 3: question-generation research context includes public interview discussions", () => {
  const context = buildResearchContext({
    interviewDiscussions: [
      {
        query: "Acme interview process",
        url: "https://example.com/review",
        title: "Acme interview review",
        snippet: "Candidates reported a technical screen.",
      },
    ],
  });

  assert.match(context, /technical screen/);
  assert.match(context, /PUBLIC INTERVIEW DISCUSSION EXCERPTS/);
});
