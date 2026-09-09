export interface RetrievedPage {
  url: string;
  title: string;
  text: string;
  status: number;
  contentType: string;
}

export interface RankedLink {
  url: string;
  anchorText: string;
  score: number;
}

export interface FetchResult {
  ok: boolean;
  url: string;
  status?: number;
  contentType?: string;
  text?: string;
  error?: string;
}

export interface RetrievalFailure {
  url: string;
  reason: string;
}

export interface InterviewDiscussionResult {
  query: string;
  url: string;
  title: string;
  snippet: string;
}

export interface CompanyResearchResult {
  companyUrl: string;
  companyName: string;        // ADD THIS LINE
  homepage: RetrievedPage | null;
  rankedLinks: RankedLink[];
  pages: RetrievedPage[];
  failures: RetrievalFailure[];
  interviewDiscussions: InterviewDiscussionResult[];
}