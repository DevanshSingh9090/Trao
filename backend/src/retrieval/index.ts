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

  const segments =
    title.split(/[|\-–—]/);
  const firstSegment =
    segments[0] ?? "";

  return firstSegment.trim();
}

function extractDomainName(
  rawUrl: string
): string {
  try {
    const parsedUrl =
      new URL(rawUrl);
    const hostname =
      parsedUrl.hostname ?? "";

    const domainParts =
      hostname
        .replace(/^www\./, "")
        .split(".");
    const firstDomainPart =
      domainParts[0] ?? "";

    return firstDomainPart;
  } catch {
    return "";
  }
}

export {
  crawlCompany,
  searchInterviewDiscussions,
};