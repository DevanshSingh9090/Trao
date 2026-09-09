import {
  crawlCompany,
} from "./company-crawler.js";

import {
  searchInterviewDiscussions,
} from "./interview-search.js";

import type {
  CompanyResearchResult,
} from "./types.js";

export async function researchCompany(companyUrl: string): Promise<CompanyResearchResult> {
  const research =
    await crawlCompany(
      companyUrl
    );

  let companyName =
    extractCompanyName(
      research.homepage?.title ||
        ""
    );

  if (!companyName) {
    companyName =
      extractDomainName(
        companyUrl
      );
  }

  const interviewDiscussions =
    await searchInterviewDiscussions(
      companyName
    );

  return {
    ...research,
    companyName,
    interviewDiscussions,
  };
}

function extractCompanyName(
  title: string
): string {
  if (!title) {
    return "";
  }

  return title
    .split(/[|\-–—]/)[0]
    .trim();
}

function extractDomainName(
  rawUrl: string
): string {
  try {
    const hostname =
      new URL(rawUrl).hostname;

    return hostname
      .replace(/^www\./, "")
      .split(".")[0];
  } catch {
    return "";
  }
}

export {
  crawlCompany,
  searchInterviewDiscussions,
};