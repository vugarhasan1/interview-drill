// Turns the two interview-question READMEs into JSON: one record per question with its full
// answer, a study cluster and, where one exists, the personal example from the hand-written cards.
import { existsSync, readFileSync, writeFileSync } from 'fs';

interface Question {
  id: string;
  number: number;
  cluster: string;
  question: string;
  answer: string;
  myExample?: string;
  source: string;
}

const CLUSTERS: Record<'js' | 'react', { cluster: string; match: RegExp }[]> = {
  js: [
    { cluster: 'Async: event loop, promises, async/await', match: /promise|async|await|event loop|microtask|settimeout|setinterval|callback|generator|iterator|abort|fetch\b|xhr|ajax|debounc|throttl|requestanimationframe|idle/i },
    { cluster: 'Scope, hoisting, TDZ, closures', match: /scope|hoist|temporal dead|closure|iife|let keyword|\bvar\b|\bconst\b|block|garbage|memory leak/i },
    { cluster: 'this, call/apply/bind, functions', match: /\bthis\b|call.*apply.*bind|arrow function|lambda|first class|higher order|unary|curry|pure function|arguments object|rest parameter|default parameter|recursion|new\.target/i },
    { cluster: 'Objects, prototypes, classes, inheritance', match: /prototype|inherit|class|constructor|instanceof|object\.(create|assign|freeze|seal|defineproperty|entries|keys|values)|getter|setter|mixin|proxy|reflect|symbol|descriptor|shallow|deep (copy|clone)|optional chaining/i },
    { cluster: 'Types, coercion, equality', match: /coercion|== and ===|typeof|\bnan\b|null|undefined|falsy|truthy|primitive|parseint|parsefloat|isnan|bigint|string method|template literal|unicode|type conversion|equality/i },
    { cluster: 'Arrays, objects, immutability, data', match: /array|\bmap\b|\bset\b|weakmap|weakset|slice|splice|reduce|filter|foreach|sort|flat|json|destructur|immutab|spread|iterable|entries/i },
    { cluster: 'Modules, tooling, patterns', match: /module|import|export|commonjs|amd|umd|bundl|tree shak|polyfill|transpil|babel|strict mode|singleton|observer|design pattern|memoization|debug|lint|minif/i },
    { cluster: 'Errors, testing, quality', match: /error|try.*catch|throw|finally|exception|unit test|\btest\b|assert|jasmine|jest|mocha/i },
    { cluster: 'Browser: DOM, storage, network, security', match: /\bdom\b|event (bubbl|captur|delegat|propagat|listener)|storage|cookie|indexeddb|session|cors|csrf|xss|clickjack|https|service worker|web worker|websocket|sse|postmessage|history api|location|navigator|geolocation|notification|clipboard|observer|shadow dom|custom element|canvas|svg/i },
    { cluster: 'Performance, misc APIs', match: /performance|optimi|lazy|preload|prefetch|cache|memory|profil|animation|intl|\bdate\b|time zone|regex|regular expression|encode|decode|uuid|random|\bmath\b/i },
    // Broad catch-all for plain language questions that no specific rule claimed.
    { cluster: 'Language basics and syntax', match: /javascript|function|variable|operator|statement|expression|keyword|syntax|difference between|what is|how do you/i },
  ],
  react: [
    { cluster: 'Hooks: rules, deps, useEffect, memo', match: /hook|useeffect|usestate|usememo|usecallback|useref|usereducer|usecontext|useimperativehandle|uselayouteffect|useid|usetransition|usedeferred|usesyncexternalstore|stale|dependency array/i },
    { cluster: 'Rendering model: VDOM, reconciliation, keys, Fiber', match: /virtual dom|reconcil|diff|fiber|key prop|"key"|re-?render|batch|strictmode|concurrent|transition|suspense|hydrat|portal|fragment|element vs component|createelement|render (method|phase)|commit/i },
    { cluster: 'Components, props, state, composition', match: /component|props|\bstate\b|lifting state|children|\bhoc\b|higher-?order|render prop|controlled|uncontrolled|pure component|\bmemo\b|forwardref|context|prop.?types|default props|composition/i },
    { cluster: 'State management, data fetching', match: /redux|toolkit|\brtk\b|saga|thunk|mobx|zustand|recoil|flux|store|reducer|action|selector|immer|query|swr|apollo|graphql|axios|fetch data|cache/i },
    { cluster: 'Forms and validation', match: /form|input|validation|formik|react-?hook-?form|yup|zod|onchange|submit/i },
    { cluster: 'Performance and bundling', match: /performance|optimi|lazy|code split|dynamic import|bundle|memoiz|virtualiz|windowing|profiler|tree shak|preload|web vitals/i },
    // `history` alone also matches "the history behind React", so it is only a routing signal
    // together with the API or hook name.
    { cluster: 'Routing', match: /router|route|navigat|\blink\b|history api|usehistory|browser history|params|redirect|outlet/i },
    { cluster: 'Errors, testing, tooling', match: /error boundary|error handling|test|jest|enzyme|react testing library|cypress|storybook|eslint|devtools|debug|typescript|flow/i },
    { cluster: 'SSR, Next.js, ecosystem', match: /server-?side|\bssr\b|\bssg\b|\bisr\b|next\.?js|gatsby|remix|hydration|streaming|\brsc\b|server component|native|electron|\bpwa\b/i },
    { cluster: 'Styling and accessibility', match: /style|\bcss\b|styled|emotion|tailwind|theme|class(name)?|accessib|aria|i18n|internationali|localiz/i },
    // Broad catch-all so plain "What is React?" style questions still land in a useful bucket.
    { cluster: 'React fundamentals and ecosystem', match: /react|jsx|\bdom\b|library|framework|version|feature|advantage|limitation|create|install|why|what is/i },
  ],
};

const clusterOf = (title: string, kind: 'js' | 'react') =>
  CLUSTERS[kind].find(rule => rule.match.test(title))?.cluster ?? 'Other / trivia';

const anchorOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

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

const parse = (path: string, kind: 'js' | 'react', repo: string, examples: Map<string, string>) => {
  const readme = readFileSync(path, 'utf8');
  const lines = readme.split('\n');

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
      const prefix = kind === 'js' ? 'js' : 'react';
      const example = examples.get(current.question.toLowerCase());
      questions.push({
        id: `${prefix}-${String(current.number).padStart(3, '0')}`,
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

  for (const line of lines) {
    // Questions are numbered list items holding an h3: "12. ### What is JSX?"
    const heading = line.match(/^\s*(\d+)\.\s+###\s+(.+?)\s*$/);
    if (heading) {
      flush();
      current = { number: Number(heading[1]), question: heading[2]!.replace(/\s+/g, ' '), body: [] };
      continue;
    }
    if (current) current.body.push(line.replace(/^ {0,4}/, ''));
  }
  flush();

  // The TOC repeats the numbering, so renumber sequentially and drop duplicates by question text.
  const seen = new Set<string>();
  const unique = questions.filter(item => {
    const key = item.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
};

const dir = './.cache';
const target = './public/data';
const examples = loadExamples(['../interview-prep/anki-javascript.tsv', '../interview-prep/anki-react.tsv']);

for (const [file, kind, repo, out] of [
  ['js-q.md', 'js', 'sudheerj/javascript-interview-questions', 'javascript.json'],
  ['react-q.md', 'react', 'sudheerj/reactjs-interview-questions', 'react.json'],
] as const) {
  const questions = parse(`${dir}/${file}`, kind, repo, examples);
  const clusters = [...new Set(questions.map(q => q.cluster))];
  const withExample = questions.filter(q => q.myExample).length;
  const shortAnswers = questions.filter(q => q.answer.length < 40).length;

  writeFileSync(
    `${target}/${out}`,
    JSON.stringify({ source: repo, count: questions.length, clusters, questions }, null, 2),
    'utf8',
  );

  console.log(
    `${out}: ${questions.length} questions, ${clusters.length} clusters, ${withExample} with my example, ${shortAnswers} suspiciously short`,
  );
}
