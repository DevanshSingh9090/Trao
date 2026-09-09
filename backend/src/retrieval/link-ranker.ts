import * as cheerio from "cheerio";

import {
  resolveRelativeUrl,
  isSameOrigin,
} from "./url-security.js";

import type {
  RankedLink,
} from "./types.js";

const KEYWORDS = [
  "career",
  "careers",
  "job",
  "jobs",
  "hiring",
  "join",
  "team",
  "about",
  "engineering",
  "life-at",
  "culture",
  "work-with-us",
];

export function extractAndRankLinks(
  html: string,
  homepageUrl: string,
  homepageText: string,
  limit = Number(
    process.env.MAX_PAGES_PER_CRAWL || 8
  )
): RankedLink[] {
  const $ = cheerio.load(html);

  const unique = new Map<
    string,
    RankedLink
  >();

  $("a[href]").each((_, element) => {
    const href =
      $(element).attr("href") || "";

    const anchorText =
      $(element)
        .text()
        .replace(/\s+/g, " ")
        .trim();

    const resolved =
      resolveRelativeUrl(
        homepageUrl,
        href
      );

    if (!resolved) {
      return;
    }

    if (
      !isSameOrigin(
        homepageUrl,
        resolved
      )
    ) {
      return;
    }

    if (
      resolved.startsWith(
        "mailto:"
      ) ||
      resolved.startsWith(
        "javascript:"
      )
    ) {
      return;
    }

    const score = scoreLink(
      resolved,
      anchorText,
      homepageText
    );

    const existing =
      unique.get(resolved);

    if (
      !existing ||
      score > existing.score
    ) {
      unique.set(resolved, {
        url: resolved,
        anchorText,
        score,
      });
    }
  });

  return [...unique.values()]
    .sort(
      (a, b) => b.score - a.score
    )
    .slice(0, limit);
}

function scoreLink(
  href: string,
  anchorText: string,
  homepageText: string
): number {
  const normalizedHref =
    href.toLowerCase();

  const normalizedAnchor =
    anchorText.toLowerCase();

  const normalizedHomepage =
    homepageText.toLowerCase();

  let score = 0;

  for (const keyword of KEYWORDS) {
    if (
      normalizedHref.includes(keyword)
    ) {
      score += 5;
    }

    if (
      normalizedAnchor.includes(keyword)
    ) {
      score += 4;
    }
  }

  if (
    normalizedHomepage.includes(
      "careers"
    )
  ) {
    score += 1;
  }

  score -= depthPenalty(href);

  return score;
}

function depthPenalty(
  href: string
): number {
  try {
    const url = new URL(href);

    const segments =
      url.pathname
        .split("/")
        .filter(Boolean);

    return Math.min(
      segments.length,
      5
    );
  } catch {
    return 5;
  }
}