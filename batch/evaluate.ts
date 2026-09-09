import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

// Load credentials from backend/.env regardless of the cwd this is invoked
// from — "reads credentials only from env vars documented in .env.example,
// no extra setup" (Phase 6).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../backend/.env"), quiet: true });

import { generateKit, KitGenerationError } from "../backend/src/pipeline/index.js";

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchError {
  code: string;
  message: string;
}

interface BatchKitEntry {
  id: string;
  status: "ok" | "failed";
  kit: Record<string, unknown> | null;
  error: BatchError | null;
}

interface BatchOutput {
  version: string;
  generated_at: string;
  kits: BatchKitEntry[];
}

/**
 * The mandated command is `npm run evaluate --input <cases.json> --output <kits.json>`.
 * npm itself consumes the `--input`/`--output` flag *names* as its own config
 * keys and only forwards the bare values to this script, in the same order —
 * so `process.argv` ends up as `[..., "cases.json", "kits.json"]` with no
 * flag names at all. This parser supports that (positional fallback) as well
 * as running the file directly with real `--input`/`--output`/`--input=`
 * flags, so the script works both via `npm run evaluate ...` and via
 * `tsx batch/evaluate.ts --input ... --output ...`.
 */
export function parseArgs(argv: string[]): { input?: string; output?: string } {
  let input: string | undefined;
  let output: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--input" || arg === "--output") {
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        if (arg === "--input") input = value;
        else output = value;
        i++;
        continue;
      }
    } else if (arg?.startsWith("--input=")) {
      input = arg.slice("--input=".length);
    } else if (arg?.startsWith("--output=")) {
      output = arg.slice("--output=".length);
    } else if (arg && !arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  // Positional fallback for the npm-consumed-flags case (see comment above).
  // Order matches the mandated command: input first, output second.
  if (input === undefined && positional[0]) input = positional[0];
  if (output === undefined && positional[1]) output = positional[1];

  return { input, output };
}

/**
 * Normalizes any thrown error into the `{ code, message }` shape Appendix B
 * requires. Both `KitGenerationError` (pipeline/validation) and `LLMError`
 * (llm/index.ts) already carry a `.code`, so this is duck-typed rather than
 * checking `instanceof` against every possible error class.
 */
function errorFromUnknown(error: unknown): BatchError {
  if (error && typeof error === "object" && "code" in error && typeof (error as any).code === "string") {
    const message = error instanceof Error ? error.message : String((error as any).message ?? "Unknown error");
    return { code: (error as any).code, message };
  }

  if (error instanceof Error) {
    return { code: "UNKNOWN_ERROR", message: error.message || "Unknown error" };
  }

  return { code: "UNKNOWN_ERROR", message: String(error) };
}

async function processCase(batchCase: BatchCase): Promise<BatchKitEntry> {
  const id = typeof batchCase?.id === "string" && batchCase.id ? batchCase.id : "(missing id)";

  try {
    if (typeof batchCase?.id !== "string" || !batchCase.id) {
      throw new KitGenerationError("INVALID_CASE", "Case is missing a valid string id");
    }

    const days = Number.isInteger(batchCase.days) && batchCase.days > 0 ? batchCase.days : 5;

    const result = await generateKit({
      jd: batchCase.jd ?? "",
      companyUrl: batchCase.company_url ?? "",
      days,
    });

    return { id, status: "ok", kit: result.kit, error: null };
  } catch (error) {
    console.error(`Case "${id}" failed:`, error);
    return { id, status: "failed", kit: null, error: errorFromUnknown(error) };
  }
}

export async function runBatch(inputPath: string, outputPath: string): Promise<BatchOutput> {
  const raw = await readFile(inputPath, "utf-8");
  const cases: unknown = JSON.parse(raw);

  if (!Array.isArray(cases)) {
    throw new Error("Input file must be a JSON array of cases.");
  }

  console.log(`Running ${cases.length} case(s)...`);

  const kits: BatchKitEntry[] = [];

  // Sequential, not parallel. This keeps LLM rate-limit/backoff behavior
  // predictable within the 15-minute budget and keeps console output legible.
  // Design decision (documented in README): each case is processed fully
  // independently — a duplicate `{ jd, company_url }` submitted under two
  // different case ids runs twice with no cross-case caching/dedup. This
  // keeps batch output deterministic per-case and avoids one case's partial
  // failure silently affecting another's result.
  for (const batchCase of cases as BatchCase[]) {
    const id = (batchCase as any)?.id ?? "(unknown)";
    console.log(`  -> case ${id}`);
    const entry = await processCase(batchCase);
    kits.push(entry);
    console.log(`     ${entry.status}${entry.error ? ` (${entry.error.code})` : ""}`);
  }

  const output: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  };

  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");

  const failedCount = kits.filter((k) => k.status === "failed").length;
  console.log(`Wrote ${kits.length} result(s) to ${outputPath}`);
  console.log(`${kits.length - failedCount} ok, ${failedCount} failed.`);

  return output;
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  if (!input || !output) {
    console.error("Usage: npm run evaluate --input <cases.json> --output <kits.json>");
    process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);

  try {
    await runBatch(inputPath, outputPath);
  } catch (error) {
    // Reserved for "couldn't produce any output at all" cases (bad input
    // file, unparseable JSON) — per-case failures never reach here, they're
    // caught in processCase and recorded in the output instead.
    console.error("Fatal batch error:", error);
    process.exitCode = 1;
  }
}

// Only auto-run when this file is executed directly (via `tsx batch/evaluate.ts`
// or `npm run evaluate`) — not when its exports are imported for testing.
const isMain = path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "");
if (isMain) {
  main();
}