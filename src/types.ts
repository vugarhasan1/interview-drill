export type Grade = 'known' | 'shaky' | 'unknown';

/** Azerbaijani phrasing kept in a separate overlay file, so the upstream data stays untouched. */
export interface AzEntry {
  question: string;
  /** Only the hand-written entries carry a gist; generated ones rephrase the question alone. */
  gist?: string;
  auto?: true;
}

export interface AzOverlay {
  deck: Deck;
  entries: Record<string, AzEntry>;
}

export interface Question {
  id: string;
  number: number;
  cluster: string;
  question: string;
  answer: string;
  myExample?: string;
  source: string;
  az?: AzEntry;
}

export interface QuestionSet {
  source: string;
  count: number;
  clusters: string[];
  questions: Question[];
}

export interface Progress {
  grade: Grade;
  /** Number of times the question has been graded. */
  seen: number;
  /** Consecutive "known" grades; absent on progress saved before it was tracked. */
  streak?: number;
  lastSeen: number;
  /** Epoch ms when the question should come back. */
  due: number;
  /** Last time-to-answer in seconds, useful for spotting slow topics. */
  seconds: number;
}

export type ProgressMap = Record<string, Progress>;

export type Deck = 'react' | 'javascript';

export type QueueMode = 'unseen' | 'due' | 'weak' | 'all' | 'mock';
