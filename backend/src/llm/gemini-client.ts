import { LLMError } from "./types.js";
import type { LLMClient, LLMGenerateOptions } from "./types.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(
    system: string,
    user: string,
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const url = `${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      throw new LLMError("LLM_RATE_LIMITED", "LLM provider rate limit hit");
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new LLMError(
        "LLM_REQUEST_FAILED",
        `LLM request failed: HTTP ${response.status} ${text}`.trim()
      );
    }

    const data: any = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") ?? "";

    if (!text.trim()) {
      throw new LLMError("LLM_EMPTY_RESPONSE", "LLM returned an empty response");
    }

    return text;
  }
}