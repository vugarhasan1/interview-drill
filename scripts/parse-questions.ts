// Writes the two question banks to public/data from the cached READMEs. The parsing itself lives in
// src/parse so the app can run it on a README fetched straight from GitHub.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DECK_SOURCES, parseQuestions } from '../src/parse/parseQuestions';
import type { DeckKind } from '../src/parse/clusters';

/** Reads the personal examples out of the hand-written card decks, keyed by question text. */
const loadExamples = (paths: string[]): Map<string, string> => {
  const examples = new Map<string, string>();
  for (const path of paths) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const [front, back] = line.split('\t');
      if (!front || !back) continue;
      const match = back.match(/In my code:\s*(.+?)(<br>|$)/i);
      if (match?.[1]) examples.set(front.trim().toLowerCase(), match[1].trim());
    }
  }
  return examples;
};

const dir = './.cache';
const target = './public/data';
const examples = loadExamples([
  '../interview-prep/anki-javascript.tsv',
  '../interview-prep/anki-react.tsv',
]);

for (const [file, kind, out] of [
  ['js-q.md', 'js', 'javascript.json'],
  ['react-q.md', 'react', 'react.json'],
] as const satisfies readonly [string, DeckKind, string][]) {
  const set = parseQuestions(readFileSync(`${dir}/${file}`, 'utf8'), kind, { examples });
  const withExample = set.questions.filter(q => q.myExample).length;
  const shortAnswers = set.questions.filter(q => q.answer.length < 40).length;

  writeFileSync(`${target}/${out}`, JSON.stringify(set, null, 2), 'utf8');

  console.log(
    `${out}: ${set.count} questions, ${set.clusters.length} clusters, ${withExample} with my example, ${shortAnswers} suspiciously short (source ${DECK_SOURCES[kind].repo})`,
  );
}
