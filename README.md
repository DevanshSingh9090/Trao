# Trao — AI Interview Prep Kit

Turns a pasted job description + a company URL into a structured, editable interview prep kit: a company brief, a categorised question bank, flashcards, and a day-by-day study schedule sized to however many days the user has.

**Live app:** https://trao-frontend-jet.vercel.app
**Backend API:** https://trao-tgrz.onrender.com

> Free-tier note: the backend (Render free plan) spins down after inactivity. The first request after idling can take 30–50s to wake up — that's expected, not a bug.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Language | TypeScript, throughout |
| Scraping | `cheerio` (HTML parsing) + native `fetch`/`undici` |
| LLM | Google Gemini (`gemini-3.6-flash`) via a thin custom client — see [LLM provider](#llm-provider) |
| Auth | JWT in an `httpOnly` cookie, `bcryptjs` for password hashing |

All choices match the brief's preferred stack exactly, so no deviation to justify.

---

## Setup

### Local development

```bash
npm install                # installs all three workspaces from the single root lockfile
```

Copy the env templates and fill in your own values:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
At minimum you need a MongoDB connection string (`MONGODB_URI`) and a Gemini API key (`LLM_API_KEY`) — see [`.env.example`](./.env.example) for the full list and what each variable does.

Run both apps together:
```bash
npm run dev                # backend on :4000, frontend on :3000 (concurrently)
```

Run the test suite:
```bash
npm test                   # tsx --test tests/**/*.test.ts
```

Build both workspaces (what Render/Vercel run in production):
```bash
npm run build
```

### Batch entry point

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Reads an array of `{ id, jd, company_url, days }` cases and runs each one through the **exact same pipeline** (`backend/src/pipeline/generate-kit.ts`) the web app calls — not a separate/parallel implementation. Writes a single JSON file shaped as in Appendix B (`{ version, generated_at, kits: [...] }`). A failed case is recorded with `status: "failed"` and an `{code, message}` error; it never aborts the rest of the run. Reads credentials from `.env` at the repo root and falls back to `backend/.env` (documented in `.env.example`) — no extra setup beyond the steps above.

> Note on npm's argument handling: `npm run evaluate -- --input a --output b` is the form the brief specifies, and it works. The parser (`batch/evaluate.ts`) also accepts plain positional args (`npm run evaluate -- a.json b.json`) as a fallback, in case npm's own flag-consuming behaviour ever swallows the `--input`/`--output` names.

### Deployment

- **Frontend (Vercel):** root directory `frontend`, framework Next.js.
- **Backend (Render):** root directory left blank (repo root, since it's an npm workspace), build command `npm install --include=dev && npm run build:backend`, start command `node backend/dist/server.js`.
- **Cross-origin auth:** the frontend and backend live on different domains, so instead of relying on a cross-site cookie (which modern browsers increasingly block by default), `frontend/next.config.ts` rewrites all `/api/*` calls to the Render backend server-side. The browser only ever talks to its own origin; the auth cookie is set for that origin too. This is why `NEXT_PUBLIC_API_BASE_URL` is left unset in production — `frontend/lib/api-client.ts` falls back to relative paths, which resolve through the rewrite.
- Env vars are set directly in each platform's dashboard, never committed. `.env`, `backend/.env`, and `frontend/.env*` are all gitignored; only the `.env.example` files are tracked.

---

## LLM provider

**Google Gemini**, model `gemini-3.6-flash`, chosen for its free-tier request allowance being generous enough to survive a multi-step pipeline (6+ calls per generation) without hitting per-minute limits during normal use. Integration is a small custom client (`backend/src/llm/gemini-client.ts`) behind a provider-agnostic interface (`backend/src/llm/types.ts`) — swapping providers means implementing that interface, not touching the pipeline.

`backend/src/llm/index.ts` wraps every call with:
- Exponential backoff retry on rate-limit responses (never crashes a run over a `429`)
- A single "repair" follow-up if the model's response isn't valid JSON, before giving up and surfacing `LLM_INVALID_JSON`

---

## High-level architecture

```
frontend (Next.js)  →  /api/* rewrite proxy  →  backend (Express)  →  MongoDB
                                                        ↓
                                              pipeline/generate-kit.ts
                                                        ↓
                              retrieval → extraction → generation → coverage → scheduling
                                                        ↓
                                              persistence/kit-validator.ts
```

Backend is organised by concern, each in its own folder under `backend/src/`:

- **`retrieval/`** — company site crawling + public discussion search (network + parsing only, no LLM)
- **`extraction/`** — pulls role/requirements out of the raw JD text (LLM)
- **`generation/`** — company brief, questions, flashcards (LLM)
- **`coverage/`** — deterministic requirement↔question comparison + gap-fill orchestration
- **`scheduling/`** — deterministic day-by-day allocation, no LLM
- **`builder/`** — edit/regenerate logic and the generated/edited/pinned state machine
- **`practice/`** — flashcard session ordering
- **`persistence/`** — kit structure validation before anything is saved
- **`llm/`** — provider client + JSON-mode wrapper with retry/repair

---

## Retrieval approach and sources

Two independent retrieval steps feed the generation stage:

1. **Company site crawl** (`retrieval/company-crawler.ts` + `link-ranker.ts`) — fetches the given `company_url`, extracts and ranks internal links (favouring likely hiring/careers/about paths over a hard-coded list, since paths vary wildly between companies), and crawls up to `MAX_PAGES_PER_CRAWL` of the most promising ones.
2. **Public interview discussion search** (`retrieval/interview-search.ts`) — queries DuckDuckGo's HTML endpoint (`html.duckduckgo.com`) with three targeted phrasings (`"<company>" interview process`, `technical interview`, `interview questions`) and parses the result snippets. Deduplicated by URL, capped at 10 results.

Both respect `robots.txt` (`retrieval/robots.ts`, checked before every fetch) and go through a shared rate limiter (`retrieval/rate-limiter.ts`, per-host minimum delay + exponential backoff) so retrieval never hammers a single host. `url-security.ts` rejects non-http(s) protocols, credentials-in-URL, and private/loopback addresses before any fetch is attempted — the app treats every fetched page as untrusted content to be processed, never as instructions to follow.

An unreachable or thin company site is recorded honestly in `research.failures` / the batch output's `error` field — it never aborts the run, and a company with nothing findable produces an honest, thinner brief rather than an invented one.

---

## Sequencing — research → generation

`pipeline/generate-kit.ts` runs these steps in order, each owning exactly one job:

1. **Research the company** (`retrieval`) — independent of the JD; failure here is recorded, never fatal.
2. **Extract role + requirements from the JD** (`extraction`) — independent of research; each requirement gets a stable `id` (`r1`, `r2`, ...) and a `kind`/`priority` taken from how the posting actually words it (a "required" line vs "bonus points for" line are never treated the same).
3. **Generate the company brief** from whatever pages were retrieved, with an honest "no public discussion found" note guaranteed even if research came back empty.
4. **Generate questions** per requirement/category, with the same research context (retrieved pages + discussion snippets) available so questions can be company-specific without ever treating scraped text as instructions.
5. **Generate flashcards** tied to `requirement_ids`.
6. **Coverage pass** (deterministic comparison + targeted gap-fill) — see below.
7. **Build the schedule** (deterministic, no LLM).
8. **Validate structure** (`persistence/kit-validator.ts`) against the Appendix A shape before the result is ever returned or saved — a kit that doesn't validate never reaches the database.

The two steps the brief calls out as needing to be deterministic — coverage comparison and day allocation — are pure code in this implementation; the model is never asked to judge its own coverage or do arithmetic.

**Coverage/second pass:** `coverage/coverage-checker.ts` compares every requirement against the generated questions with plain code (`findUncovered`). If anything is uncovered, it runs up to **2** additional targeted gap-fill LLM calls — each given only the requirements still missing a question, never the whole set again. If a pass returns zero new questions (LLM failure, or a genuinely unfillable gap), the loop stops immediately rather than spending the remaining passes for no gain. Whatever's still uncovered after that is reported honestly in `coverage.uncovered_requirement_ids` — the kit ships with the gap visible rather than silently patched or fabricated.

---

## Generated / edited / pinned state

Every question, flashcard, the company brief, and the schedule carries an implicit **origin**: `generated`, `edited`, or `pinned` (`backend/src/builder/item-state.ts`). Anything with no explicit entry is implicitly `generated` — a fresh kit doesn't pre-populate state for every item, only editing/pinning/regenerating ever writes one.

This is what makes "regenerate one section without losing edits" actually hold:

- **Brief / schedule** (whole-section regeneration): if its origin isn't `generated` (i.e. the user touched it), regeneration is blocked outright with a clear `*_PROTECTED` error rather than silently overwriting it.
- **Questions, per category** (`builder/regenerate.ts:regenerateCategory`): only the questions in that category still marked `generated` get replaced. Anything `edited`/`pinned` in that same category is kept and merged back into the result. Questions in *other* categories are never touched regardless of origin. Requirements that only had `generated` questions covering them get a fresh targeted LLM call; requirements already covered by a kept edited/pinned question are left alone.
- The frontend surfaces this directly — an `OriginBadge` next to each question/flashcard shows whether it's generated, edited, or pinned, so the state isn't just internal bookkeeping.

Regenerating the brief re-crawls the company site from scratch rather than reusing cached page text, since only page URLs (not raw content) are persisted on the kit — a deliberate size/freshness trade-off, noted under Limitations.

---

## Schedule allocation

Pure code, no LLM (`scheduling/schedule-builder.ts`):

1. Split questions into must-have (linked to a `priority: "must"` requirement) vs nice-to-have, each sorted hardest-first.
2. Concatenate must-have-first, then distribute across the requested number of days in that order — harder, higher-priority material lands earlier rather than the night before.
3. Each day's `minutes` is the sum of a per-question estimate (`10 + difficulty * 5`), and its `focus` label is the most common category among that day's questions.
4. **1-day case:** everything lands in a single dense bucket.
5. **60-day (sparse) case:** once every question has been placed once, any day that's still empty gets a repeat of earlier material as lighter review, rather than being left blank. (The alternative — leaving it explicitly empty with a "review" label and no `question_ids` — is equally defensible; this was the choice made here.)

---

## Edge cases handled

| Case | Behaviour |
|---|---|
| Invalid/unreachable/404 company URL | Recorded as a research failure; kit still generates with an honest, thinner brief |
| No discoverable hiring/about page | Crawler still ranks and fetches whatever's on the site; brief says so if nothing relevant turned up |
| Two-line JD stub | Extraction still runs; a thin description produces a thin (not fabricated) requirement list |
| No public interview discussion found | Company brief includes an explicit "no discussion found" note rather than omitting the section silently |
| Invalid/incomplete LLM JSON | One repair attempt, then a clear `LLM_INVALID_JSON` error rather than a silent bad save |
| LLM rate-limited | Exponential backoff retry, both in the main pipeline and the batch runner |
| Duplicate submission (same JD + company) | Runs independently, no cross-run caching/dedup — deterministic per-request behaviour was prioritised over saving a duplicate call |
| 1-day / 60-day schedule | Explicitly handled (see [Schedule allocation](#schedule-allocation)) |
| SSRF via company URL (private/loopback/credentialed URLs) | Rejected before any fetch, in both the interactive and batch paths (`retrieval/url-security.ts`) |

---

## Key design decisions & trade-offs

- **Async generation, not synchronous request/response.** Generation involves 6+ sequential network/LLM calls and can run well past typical serverless timeouts. `POST /:id/generate` kicks off the pipeline and responds immediately (`202`); the frontend polls `GET /:id/status` until it flips to `ready`/`failed`. Trade-off: the in-memory job isn't durable across a backend process restart — if Render restarts mid-generation, that specific job is lost silently rather than retried. Acceptable for this scope; a production version would move this to a persisted job queue.
- **Confidence-weighted practice ordering, not spaced-repetition intervals** (`practice/session-ordering.ts`). Never-reviewed cards surface first, then lowest-confidence, with least-recently-reviewed as the tiebreak. Simple, deterministic, and defensible; a full SM-2-style interval scheduler was considered out of scope for the time budget.
- **Sequential, not parallel, batch processing.** Keeps LLM rate-limit/backoff behaviour predictable within the 15-minute budget and keeps output ordering/logs legible; the trade-off is wall-clock time on a large batch.
- **Regenerating the brief re-crawls rather than re-using cached text**, since only page URLs are persisted, not raw page content — smaller documents, at the cost of a second crawl if the brief is regenerated.

## Known limitations

- No optional creative feature was added on top of the core spec — time went into the coverage/regeneration state machine and edge-case handling instead.
- The in-memory async generation job isn't crash-safe (see above) — if you see a kit stuck on `"generating"` indefinitely, check the Render logs for a restart around that time.
- No email verification, password reset, or role hierarchy — explicitly out of scope per the brief.
