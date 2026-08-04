import type { Question, QuestionSet } from '../types';
import { clusterOf, type DeckKind } from './clusters';

export const DECK_SOURCES: Record<DeckKind, { repo: string; raw: string }> = {
  js: {
    repo: 'sudheerj/javascript-interview-questions',
    raw: 'https://raw.githubusercontent.com/sudheerj/javascript-interview-questions/master/README.md',
  },
  react: {
    repo: 'sudheerj/reactjs-interview-questions',
    raw: 'https://raw.githubusercontent.com/sudheerj/reactjs-interview-questions/master/README.md',
  },
};

/**
 * Ids come from the question text, not from the numbering in the README: markdown renumbers list
 * items, so the same number appears on several questions and an overlay keyed by it lands on the
 * wrong card.
 */
const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const anchorOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

interface ParseOptions {
  /** Personal examples keyed by the lower-cased question text. */
  examples?: Map<string, string>;
}

export const parseQuestions = (
  markdown: string,
  kind: DeckKind,
  { examples }: ParseOptions = {},
): QuestionSet => {
  const { repo } = DECK_SOURCES[kind];
  const questions: Question[] = [];
  let current: { number: number; question: string; body: string[] } | undefined;

  const flush = () => {
    if (!current) return;
    const answer = current.body
      .join('\n')
      .replace(/\*\*\[⬆ Back to Top\]\([^)]*\)\*\*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (answer) {
      const example = examples?.get(current.question.toLowerCase());
      questions.push({
        id: `${kind === 'js' ? 'js' : 'react'}-${slugOf(current.question)}`,
        number: current.number,
        cluster: clusterOf(current.question, kind),
        question: current.question,
        answer,
        ...(example ? { myExample: example } : {}),
        source: `https://github.com/${repo}#${anchorOf(current.question)}`,
      });
    }
    current = undefined;
  };

  for (const line of markdown.split('\n')) {
    // Questions are numbered list items holding an h3: "12. ### What is JSX?"
    const heading = line.match(/^\s*(\d+)\.\s+###\s+(.+?)\s*$/);
    if (heading) {
      flush();
      current = {
        number: Number(heading[1]),
        question: heading[2]!.replace(/\s+/g, ' '),
        body: [],
      };
      continue;
    }
    if (current) current.body.push(line.replace(/^ {0,4}/, ''));
  }
  flush();

  // The table of contents repeats the numbering, so duplicates are dropped by question text.
  const seen = new Set<string>();
  const unique = questions.filter(item => {
    const key = item.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    source: repo,
    count: unique.length,
    clusters: [...new Set(unique.map(q => q.cluster))],
    questions: unique,
  };
};
