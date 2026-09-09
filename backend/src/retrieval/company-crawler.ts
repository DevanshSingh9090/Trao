import {
  fetchPage,
} from "./http-client.js";

import {
  cleanHtml,
} from "./html-cleaner.js";

import {
  extractAndRankLinks,
} from "./link-ranker.js";

import {
  isAllowedByRobots,
} from "./robots.js";

import {
  assertSafeUrl,
} from "./url-security.js";

import type {
  CompanyResearchResult,
  RetrievedPage,
  RetrievalFailure,
} from "./types.js";

export async function crawlCompany(
  companyUrl: string
): Promise<CompanyResearchResult> {
  const failures: RetrievalFailure[] = [];

  let safeUrl: URL;

  try {
    safeUrl =
      await assertSafeUrl(
        companyUrl
      );
  } catch (error) {
    return {
      companyUrl,
      homepage: null,
      rankedLinks: [],
      pages: [],
      failures: [
        {
          url: companyUrl,
          reason:
            error instanceof Error
              ? error.message
              : "Invalid URL",
        },
      ],
      interviewDiscussions: [],
    };
  }

  const homepageAllowed =
    await isAllowedByRobots(
      safeUrl.href
    );

  if (!homepageAllowed) {
    return {
      companyUrl,
      homepage: null,
      rankedLinks: [],
      pages: [],
      failures: [
        {
          url: safeUrl.href,
          reason:
            "Blocked by robots.txt",
        },
      ],
      interviewDiscussions: [],
    };
  }

  const homepageResult =
    await fetchPage(
      safeUrl.href
    );

  if (
    !homepageResult.ok ||
    !homepageResult.text
  ) {
    return {
      companyUrl,
      homepage: null,
      rankedLinks: [],
      pages: [],
      failures: [
        {
          url: safeUrl.href,
          reason:
            homepageResult.error ||
            "Homepage could not be retrieved",
        },
      ],
      interviewDiscussions: [],
    };
  }

  const cleanedHomepage =
    cleanHtml(
      homepageResult.text
    );

  const homepage: RetrievedPage =
    {
      url: safeUrl.href,
      title:
        cleanedHomepage.title,
      text:
        cleanedHomepage.text,
      status:
        homepageResult.status || 200,
      contentType:
        homepageResult.contentType ||
        "text/html",
    };

  const rankedLinks =
    extractAndRankLinks(
      homepageResult.text,
      safeUrl.href,
      cleanedHomepage.text
    );

  const pages: RetrievedPage[] = [
    homepage,
  ];

  for (const link of rankedLinks) {
    if (
      pages.length >=
      Number(
        process.env.MAX_PAGES_PER_CRAWL ||
          8
      )
    ) {
      break;
    }

    const allowed =
      await isAllowedByRobots(
        link.url
      );

    if (!allowed) {
      failures.push({
        url: link.url,
        reason:
          "Blocked by robots.txt",
      });

      continue;
    }

    const result =
      await fetchPage(
        link.url
      );

    if (
      !result.ok ||
      !result.text
    ) {
      failures.push({
        url: link.url,
        reason:
          result.error ||
          "Page could not be retrieved",
      });

      continue;
    }

    const cleaned =
      cleanHtml(
        result.text
      );

    if (
      cleaned.text.length < 100
    ) {
      failures.push({
        url: link.url,
        reason:
          "Page returned insufficient usable text",
      });

      continue;
    }

    pages.push({
      url: link.url,
      title: cleaned.title,
      text: cleaned.text,
      status:
        result.status || 200,
      contentType:
        result.contentType ||
        "text/html",
    });
  }

  return {
    companyUrl: safeUrl.href,
    homepage,
    rankedLinks,
    pages,
    failures,
    interviewDiscussions: [],
  };
}