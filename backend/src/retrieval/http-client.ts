import {
  assertSafeUrl,
} from "./url-security.js";

import {
  waitForHost,
  withBackoff,
} from "./rate-limiter.js";

import type {
  FetchResult,
} from "./types.js";

const REQUEST_TIMEOUT_MS = Number(
  process.env.REQUEST_TIMEOUT_MS || 10000
);

const MAX_CONTENT_BYTES = Number(
  process.env.MAX_CONTENT_BYTES || 2_000_000
);

const USER_AGENT =
  process.env.USER_AGENT ||
  "interview-kit-bot/1.0";

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
];

export async function fetchPage(
  rawUrl: string
): Promise<FetchResult> {
  try {
    const url = await assertSafeUrl(rawUrl);

    await waitForHost(url.hostname);

    const result = await withBackoff(
      () => fetchWithTimeout(url)
    );

    return result;
  } catch (error) {
    return {
      ok: false,
      url: rawUrl,
      error:
        error instanceof Error
          ? error.message
          : "Unknown retrieval error",
    };
  }
}

async function fetchWithTimeout(
  url: URL
): Promise<FetchResult> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml",
      },
    });

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get("location");

      return {
        ok: false,
        url: url.href,
        status: response.status,
        error: location
          ? `Redirect skipped: ${location}`
          : "Redirect skipped",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        url: url.href,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    const contentTypeHeader =
      response.headers.get("content-type") || "";

    const contentType =
      contentTypeHeader
        .split(";")[0]
        ?.trim()
        .toLowerCase() || "";

    if (
      !ALLOWED_CONTENT_TYPES.includes(
        contentType
      )
    ) {
      return {
        ok: false,
        url: url.href,
        status: response.status,
        contentType,
        error:
          "Unsupported content type",
      };
    }

    const contentLength =
      Number(
        response.headers.get(
          "content-length"
        ) || 0
      );

    if (
      contentLength >
      MAX_CONTENT_BYTES
    ) {
      return {
        ok: false,
        url: url.href,
        status: response.status,
        contentType,
        error:
          "Response exceeds maximum size",
      };
    }

    const buffer =
      await response.arrayBuffer();

    if (
      buffer.byteLength >
      MAX_CONTENT_BYTES
    ) {
      return {
        ok: false,
        url: url.href,
        status: response.status,
        contentType,
        error:
          "Response exceeds maximum size",
      };
    }

    return {
      ok: true,
      url: url.href,
      status: response.status,
      contentType,
      text: new TextDecoder().decode(
        buffer
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}