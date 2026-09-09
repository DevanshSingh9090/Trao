import { test } from "node:test";
import assert from "node:assert/strict";

import { assertSafeUrl } from "../backend/src/retrieval/url-security.js";
import { validateKitStructure } from "../backend/src/persistence/kit-validator.js";

async function expectRejected(url: string) {
  await assert.rejects(() => assertSafeUrl(url));
}

test("Phase 9: invalid URL is rejected before any fetch", async () => {
  await expectRejected("not-a-url");
});

test("Phase 9: non-http protocols are rejected", async () => {
  await expectRejected("file:///etc/passwd");
});

test("Phase 9: private and loopback IPv4 addresses are rejected", async () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/",
    "http://0.0.0.0/",
  ]) {
    await expectRejected(url);
  }
});

test("Phase 9: private and loopback IPv6 addresses are rejected", async () => {
  for (const url of ["http://[::1]/", "http://[fc00::1]/", "http://[fe80::1]/"]) {
    await expectRejected(url);
  }
});

test("Phase 9: URLs containing credentials are rejected", async () => {
  await expectRejected("https://user:password@example.com/");
});

test("Phase 9: structure validator rejects a schedule whose day count differs from days_available", () => {
  const kit: any = {
    source: {
      company: "Acme",
      company_url: "https://example.com",
      role: "Backend Engineer",
      location: "",
      jd_chars: 20,
      researched_at: new Date().toISOString(),
      pages_used: [],
    },
    company_brief: { summary: "", what_they_do: "", sources: [] },
    role: {
      title: "Backend Engineer",
      seniority: "",
      responsibilities: [],
      requirements: [],
    },
    questions: [],
    flashcards: [],
    schedule: { days_available: 5, days: [{ day: 1, focus: "review", question_ids: [], minutes: 0 }] },
    coverage: { uncovered_requirement_ids: [], passes: 0 },
  };

  const result = validateKitStructure(kit);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.includes("days_available")), true);
});
