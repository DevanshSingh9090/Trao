export type KitStatus = "draft" | "generating" | "ready" | "failed";

export type QuestionCategory =
  | "technical"
  | "behavioral"
  | "domain"
  | "system-design"
  | "company-fit";

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioral",
  "domain",
  "system-design",
  "company-fit",
];

export type RequirementKind = "technical" | "behavioral" | "domain";
export type RequirementPriority = "must" | "nice";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export type ItemOrigin = "generated" | "edited" | "pinned";

export interface ItemStateEntry {
  origin: ItemOrigin;
  updatedAt: string;
}

export interface KitItemState {
  questions: Record<string, ItemStateEntry>;
  flashcards: Record<string, ItemStateEntry>;
  companyBrief: ItemStateEntry | null;
  schedule: ItemStateEntry | null;
}

export interface PracticeLogEntry {
  flashcardId: string;
  confidence: number;
  reviewedAt: string;
}

export interface Kit {
  _id: string;
  status: KitStatus;
  source: KitSource;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
  itemState: KitItemState;
  practiceLog: PracticeLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFailure {
  url: string;
  reason: string;
}

export interface User {
  id: string;
  email?: string;
}
