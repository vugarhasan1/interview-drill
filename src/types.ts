export type Grade = 'known' | 'shaky' | 'unknown';

export interface Question {
  id: string;
  number: number;
  cluster: string;
  question: string;
  answer: string;
  myExample?: string;
  source: string;
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
  lastSeen: number;
  /** Epoch ms when the question should come back. */
  due: number;
  /** Last time-to-answer in seconds, useful for spotting slow topics. */
  seconds: number;
}

export type ProgressMap = Record<string, Progress>;

export type Deck = 'react' | 'javascript';

export type QueueMode = 'unseen' | 'due' | 'weak' | 'all' | 'mock';
