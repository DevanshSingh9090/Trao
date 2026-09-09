import * as cheerio from "cheerio";

import {
  waitForHost,
  withBackoff,
} from "./rate-limiter.js";

import type {
  InterviewDiscussionResult,
} from "./types.js";

const SEARCH_HOST =
  "html.duckduckgo.com";

const USER_AGENT =
  process.env.USER_AGENT ||
  "interview-kit-bot/1.0";

export async function searchInterviewDiscussions(
  companyName: string
): Promise<InterviewDiscussionResult[]> {
  if (!companyName.trim()) {
    return [];
  }

  const queries = [
    `"${companyName}" interview process`,
    `"${companyName}" technical interview`,
    `"${companyName}" interview questions`,
  ];

  const results: InterviewDiscussionResult[] = [];

  for (const query of queries) {
    try {
      const queryResults =
        await searchDuckDuckGo(
          query
        );

      results.push(
        ...queryResults
      );
    } catch {
      // Search failure should never
      // abort company research.
    }
  }

  const unique = new Map<
    string,
    InterviewDiscussionResult
  >();

  for (const result of results) {
    if (!unique.has(result.url)) {
      unique.set(
        result.url,
        result
      );
    }
  }

  return [...unique.values()]
    .slice(0, 10);
}

async function searchDuckDuckGo(
  query: string
): Promise<InterviewDiscussionResult[]> {
  await waitForHost(
    SEARCH_HOST
  );

  return withBackoff(
    async () => {
      const url =
        new URL(
          "https://html.duckduckgo.com/html/"
        );

      url.searchParams.set(
        "q",
        query
      );

      const response =
        await fetch(url, {
          headers: {
            "User-Agent":
              USER_AGENT,
            Accept:
              "text/html",
          },
        });

      if (!response.ok) {
        throw new Error(
          `Search failed: HTTP ${response.status}`
        );
      }

      const html =
        await response.text();

      return parseResults(
        html,
        query
      );
    },
    2
  );
}

function parseResults(
  html: string,
  query: string
): InterviewDiscussionResult[] {
  const $ = cheerio.load(html);

  const results: InterviewDiscussionResult[] =
    [];

  $(".result").each((_, element) => {
    const anchor =
      $(element).find(
        ".result__a"
      );

    const url =
      anchor.attr("href");

    const title =
      anchor.text().trim();

    const snippet =
      $(element)
        .find(".result__snippet")
        .text()
        .replace(/\s+/g, " ")
        .trim();

    if (!url || !title) {
      return;
    }

    results.push({
      query,
      url,
      title,
      snippet,
    });
  });

  return results;
}