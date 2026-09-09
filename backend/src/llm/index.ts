import { GeminiClient } from "./gemini-client.js";
import { LLMError } from "./types.js";
import type { LLMClient, LLMGenerateOptions } from "./types.js";

let cachedClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (cachedClient) return cachedClient;

  const provider = process.env.LLM_PROVIDER || "gemini";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!apiKey) throw new Error("LLM_API_KEY is not configured");
  if (!model) throw new Error("LLM_MODEL is not configured");

  switch (provider) {
    case "gemini":
      cachedClient = new GeminiClient(apiKey, model);
      break;
    default:
      throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
  }

  return cachedClient;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (!fenceMatch) {
    return trimmed;
  }

  const capturedContent = fenceMatch[1] ?? "";

  return capturedContent.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GenerateJSONParams {
  system: string;
  user: string;
  maxRepairAttempts?: number;
  temperature?: number;
}

/**
 * Calls the LLM and parses its response as JSON.
 * - Retries with exponential backoff on rate limits (never crashes the run).
 * - If the response isn't valid JSON, sends one "repair" follow-up asking the
 *   model to fix its own output before giving up.
 * Throws LLMError("LLM_INVALID_JSON", ...) if it still can't produce valid JSON.
 */
export async function generateJSON<T>(params: GenerateJSONParams): Promise<T> {
  const client = getLLMClient();
  const maxRepairAttempts = params.maxRepairAttempts ?? 1;
  const maxRateLimitRetries = 3;

  let lastRaw = "";

  for (let repairAttempt = 0; repairAttempt <= maxRepairAttempts; repairAttempt++) {
    const userPrompt =
      repairAttempt === 0
        ? params.user
        : `Your previous response was not valid JSON. Fix it and return ONLY valid JSON, nothing else.\n\nPrevious response:\n${lastRaw}`;

    const options: LLMGenerateOptions = { jsonMode: true };
    if (params.temperature !== undefined) options.temperature = params.temperature;

    let raw: string | null = null;

    for (let rateLimitAttempt = 0; rateLimitAttempt <= maxRateLimitRetries; rateLimitAttempt++) {
      try {
        raw = await client.generate(params.system, userPrompt, options);
        break;
      } catch (error) {
        const isRateLimit = error instanceof LLMError && error.code === "LLM_RATE_LIMITED";

        if (!isRateLimit || rateLimitAttempt === maxRateLimitRetries) {
          throw error;
        }

        await sleep(500 * Math.pow(2, rateLimitAttempt));
      }
    }

    if (raw === null) {
      throw new LLMError("LLM_REQUEST_FAILED", "LLM produced no response");
    }

    lastRaw = raw;

    try {
      return JSON.parse(stripCodeFences(raw)) as T;
    } catch {
      // fall through to the repair retry
    }
  }

  throw new LLMError(
    "LLM_INVALID_JSON",
    "LLM did not return valid JSON after a repair attempt"
  );
}