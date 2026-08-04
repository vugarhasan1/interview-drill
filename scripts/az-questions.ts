// Generates the Azerbaijani phrasing of question titles from sentence patterns, leaving technical
// terms in English. Hand-written entries always win: this only fills the gaps.
import { readFileSync, writeFileSync } from 'fs';

interface AzEntry {
  question: string;
  gist?: string;
  auto?: true;
}

interface Overlay {
  deck: string;
  note: string;
  entries: Record<string, AzEntry>;
}

const clean = (text: string) =>
  text
    .trim()
    .replace(/\?+$/, '')
    // English articles carry no meaning here and read as noise in Azerbaijani.
    .replace(/^(the|a|an)\s+/i, '')
    .trim();

/** Nouns that appear in "the <noun> of X" titles; translating them removes most of the awkwardness. */
const NOUNS: Record<string, { az: string; plural: boolean }> = {
  advantages: { az: 'üstünlükləri', plural: true },
  benefits: { az: 'üstünlükləri', plural: true },
  limitations: { az: 'məhdudiyyətləri', plural: true },
  drawbacks: { az: 'çatışmazlıqları', plural: true },
  features: { az: 'xüsusiyyətləri', plural: true },
  ways: { az: 'üsulları', plural: true },
  steps: { az: 'addımları', plural: true },
  types: { az: 'növləri', plural: true },
  kinds: { az: 'növləri', plural: true },
  reasons: { az: 'səbəbləri', plural: true },
  rules: { az: 'qaydaları', plural: true },
  methods: { az: 'metodları', plural: true },
  phases: { az: 'mərhələləri', plural: true },
  lifecycle: { az: 'həyat dövrü', plural: false },
  history: { az: 'tarixi', plural: false },
  purpose: { az: 'məqsədi', plural: false },
  role: { az: 'rolu', plural: false },
  syntax: { az: 'sintaksisi', plural: false },
  'use cases': { az: 'istifadə halları', plural: true },
  goal: { az: 'məqsədi', plural: false },
  impact: { az: 'təsiri', plural: false },
  behavior: { az: 'davranışı', plural: false },
  behaviour: { az: 'davranışı', plural: false },
  principles: { az: 'əsas prinsipləri', plural: true },
  downsides: { az: 'çatışmazlıqları', plural: true },
  problems: { az: 'problemləri', plural: true },
  scenarios: { az: 'ssenariləri', plural: true },
  cases: { az: 'halları', plural: true },
  benefit: { az: 'faydası', plural: false },
  advantage: { az: 'üstünlüyü', plural: false },
  reason: { az: 'səbəbi', plural: false },
  meaning: { az: 'mənası', plural: false },
  output: { az: 'nəticəsi', plural: false },
  result: { az: 'nəticəsi', plural: false },
  'mental model': { az: 'iş modeli', plural: false },
  'data flow': { az: 'data axını', plural: false },
  alternatives: { az: 'alternativləri', plural: true },
  options: { az: 'seçimləri', plural: true },
  categories: { az: 'kateqoriyaları', plural: true },
  states: { az: 'vəziyyətləri', plural: true },
  properties: { az: 'xassələri', plural: true },
  parameters: { az: 'parametrləri', plural: true },
  values: { az: 'dəyərləri', plural: true },
};

/** Leading verbs in "How do you X" titles. */
const VERBS: Record<string, string> = {
  create: 'yaradılır',
  use: 'istifadə olunur',
  handle: 'idarə olunur',
  implement: 'tətbiq olunur',
  apply: 'tətbiq olunur',
  optimize: 'optimallaşdırılır',
  test: 'test olunur',
  avoid: 'qarşısı alınır',
  prevent: 'qarşısı alınır',
  fetch: 'çəkilir',
  pass: 'ötürülür',
  update: 'yenilənir',
  add: 'əlavə olunur',
  set: 'təyin olunur',
  define: 'təyin olunur',
  check: 'yoxlanılır',
  compare: 'müqayisə olunur',
  convert: 'çevrilir',
  share: 'paylaşılır',
  memoize: 'memoize olunur',
  validate: 'validasiya olunur',
  debug: 'debug olunur',
  render: 'render olunur',
  install: 'quraşdırılır',
  style: 'stil verilir',
};

const MODIFIERS: Record<string, string> = {
  major: 'əsas',
  main: 'əsas',
  primary: 'əsas',
  possible: 'mümkün',
  common: 'ümumi',
  different: 'fərqli',
  new: 'yeni',
  key: 'əsas',
};

/** "the major features of React" -> "React-in əsas xüsusiyyətləri nələrdir?" */
const nounPhrase = (subject: string): string | undefined => {
  const match = subject.match(/^(.+?)\s+of\s+(.+)$/i);
  if (!match) return undefined;

  const words = match[1]!.trim().toLowerCase().split(/\s+/);
  const noun = NOUNS[words[words.length - 1]!];
  if (!noun) return undefined;

  const modifier = words.length > 1 ? MODIFIERS[words[words.length - 2]!] : undefined;
  const target = clean(match[2]!);

  // Anything left over from the English sentence means the pattern did not really fit.
  if (/\s(of|behind|for|with|to|from|into|about)\s/i.test(target)) return undefined;

  return `${target}-in ${modifier ? `${modifier} ` : ''}${noun.az} ${
    noun.plural ? 'nələrdir' : 'nədir'
  }?`;
};

const scopeSuffix = (subject: string): [string, string] => ['', subject];

/** "How do you create components in React" -> "React-də components necə yaradılır?" */
const verbPhrase = (verb: string, rest: string): string => {
  const az = VERBS[verb.toLowerCase()];
  if (!az) return `${clean(`${verb} ${rest}`)} — bunu necə edirsən?`;
  const [prefix, object] = scopePrefix(clean(rest));
  return `${prefix}${object} necə ${az}?`;
};

/** Suffixes that read better moved to the front in Azerbaijani. */
const scopePrefix = (subject: string): [string, string] => {
  const match = subject.match(/^(.*?)\s+in\s+(React|JavaScript|JS|ES6|Redux)$/i);
  return match ? [`${match[2]}-də `, clean(match[1]!)] : ['', subject];
};

const RULES: { match: RegExp; build: (groups: string[]) => string }[] = [
  {
    match: /^what (?:is|are) the difference(?:s)? between (.+?) and (.+)$/i,
    build: ([a, b]) => `${clean(a!)} ilə ${clean(b!)} arasında fərq nədir?`,
  },
  {
    match: /^what (?:is|are) the (?:purpose|use|usage) of (.+)$/i,
    build: ([subject]) => `${clean(subject!)} nə üçündür?`,
  },
  {
    match: /^what (?:are|is) the (?:possible )?reasons? (?:for|of) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} hansı səbəblərdən yaranır?`,
  },
  {
    match: /^what (?:is|are) (.+)$/i,
    build: ([subject]) => {
      const cleaned = clean(subject!);
      const phrase = nounPhrase(cleaned);
      if (phrase) return phrase;
      const [prefix, rest] = scopePrefix(cleaned);
      return `${prefix}${rest} nədir?`;
    },
  },
  {
    match: /^why (?:do|does|should) (?:we|you|i) (?:need|use) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} niyə lazımdır?`,
  },
  {
    match: /^why (?:is|are) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} niyə belədir?`,
  },
  {
    match: /^how (?:does|do) (.+?) work$/i,
    build: ([subject]) => `${clean(subject!)} necə işləyir?`,
  },
  {
    match: /^how (?:do|would|can) (?:you|we|i) (\w+) (.+)$/i,
    build: ([verb, rest]) => verbPhrase(verb!, rest!),
  },
  {
    match: /^how to (\w+) (.+)$/i,
    build: ([verb, rest]) => verbPhrase(verb!, rest!),
  },
  {
    match: /^when (?:should|do) (?:you|we) (?:use|choose) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} nə vaxt istifadə olunur?`,
  },
  {
    match: /^(?:is|are) (?:it|that) possible to (.+)$/i,
    build: ([action]) => `${clean(action!)} mümkündürmü?`,
  },
  {
    match: /^can (?:you|we) (.+)$/i,
    build: ([action]) => `${clean(action!)} mümkündürmü?`,
  },
  {
    match: /^does (.+)$/i,
    build: ([subject]) => `${clean(subject!)} — belədirmi?`,
  },

  // Forms without an auxiliary verb, which the upstream titles use a lot.
  {
    match: /^how (.+?) works?$/i,
    build: ([subject]) => `${clean(subject!)} necə işləyir?`,
  },
  {
    match: /^how (?:does|do) (.+?) work behind the scenes$/i,
    build: ([subject]) => `${clean(subject!)} arxa planda necə işləyir?`,
  },
  {
    match: /^how (?:is|are) (.+?) different (?:from|to) (.+)$/i,
    build: ([a, b]) => `${clean(a!)} ${clean(b!)}-dən nə ilə fərqlənir?`,
  },
  {
    match: /^how (.+?) (?:is|are) different in (React|JavaScript)$/i,
    build: ([subject, scope]) => `${scope}-də ${clean(subject!)} nə ilə fərqlənir?`,
  },
  {
    match: /^when to use (.+?) over (.+)$/i,
    build: ([a, b]) => `${clean(a!)} ${clean(b!)} yerinə nə vaxt istifadə olunur?`,
  },
  {
    match: /^when to use (.+)$/i,
    build: ([subject]) => `${clean(subject!)} nə vaxt istifadə olunur?`,
  },
  {
    match: /^when (?:do|does) (?:you|we) (?:need to use|need|use) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} nə vaxt lazım olur?`,
  },
  {
    match: /^why (?:react|reactdom|jsx) uses? (.+?) over (.+)$/i,
    build: ([a, b]) => `React niyə ${clean(b!)} yerinə ${clean(a!)} işlədir?`,
  },
  {
    match: /^why (.+?) (?:are|is) better than (.+)$/i,
    build: ([a, b]) => `${clean(a!)} niyə ${clean(b!)}-dən yaxşıdır?`,
  },
  {
    match: /^why (?:can't|cannot) (?:you|we|i) (.+)$/i,
    build: ([action]) => `${clean(action!)} niyə mümkün deyil?`,
  },
  {
    match: /^why (?:should|do) (?:you|we|i)? ?(?:not )?(.+)$/i,
    build: ([action]) => `${clean(action!)} niyə belədir?`,
  },
  {
    match: /^why (.+?) (?:is|are) separated from (.+)$/i,
    build: ([a, b]) => `${clean(a!)} niyə ${clean(b!)}-dən ayrılıb?`,
  },
  {
    match: /^(?:can|should|must|do|does) (?:i|you|we) (.+)$/i,
    build: ([action]) => `${clean(action!)} — bu doğrudur?`,
  },
  {
    match: /^(?:is|are) (?:it|there|hooks) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} — belədirmi?`,
  },
  {
    match: /^what is the history behind (.+)$/i,
    build: ([subject]) => `${clean(subject!).replace(/\s+evolution$/i, '')}-in tarixi nədir?`,
  },
  {
    match: /^give (?:a |an )?(?:simple )?example of (.+)$/i,
    build: ([subject]) => `${clean(subject!)} üçün nümunə göstər`,
  },
  {
    match: /^what will happen (?:by|if|when) (.+)$/i,
    build: ([subject]) => `${clean(subject!)} halında nə baş verir?`,
  },
  {
    match: /^describe about (.+)$/i,
    build: ([subject]) => `${clean(subject!)} barədə danış`,
  },
  {
    match: /^what rules (?:need to be|should be) followed for (.+)$/i,
    build: ([subject]) => `${clean(subject!)} üçün hansı qaydalara tabe olmaq lazımdır?`,
  },
  {
    match: /^what (?:are|is) the (?:core |typical )?(.+?) of (.+)$/i,
    build: ([noun, target]) => {
      const entry = NOUNS[noun!.trim().toLowerCase()];
      if (!entry) return '';
      return `${clean(target!)}-in ${entry.az} ${entry.plural ? 'nələrdir' : 'nədir'}?`;
    },
  },
];

/** English that is allowed to survive: the vocabulary an interview is conducted in anyway. */
const TECH = new Set(
  `react javascript js jsx dom html css node bun vite api url http https json xml svg canvas
   hook hooks state props prop context provider consumer component components element elements
   render rendering reconciliation fiber batching hydration portal fragment suspense transition
   ref refs key keys memo callback effect cleanup dependency array closure closures scope hoisting
   tdz prototype prototypes class classes constructor instance inheritance mixin proxy reflect
   symbol iterator generator promise promises async await microtask macrotask event loop callback
   debounce throttle observer worker service websocket sse fetch xhr ajax cors csrf xss cookie
   storage localstorage sessionstorage indexeddb cache immutability spread destructuring rest
   getter setter descriptor typeof instanceof nan null undefined bigint boolean number string
   object array map set weakmap weakset regexp date intl module modules import export commonjs
   amd umd bundle bundler tree-shaking polyfill transpiler babel webpack rollup eslint prettier
   typescript flow proptypes redux toolkit rtk saga thunk mobx zustand recoil flux store reducer
   action selector immer graphql apollo axios query swr router route link params redirect outlet
   ssr ssg isr rsc next nextjs gatsby remix electron pwa native lifecycle mount unmount update
   props-drilling hoc render-prop controlled uncontrolled virtual shadow real strictmode
   concurrent devtools profiler jest enzyme cypress storybook vitest testing library
   form input validation submit onchange formik yup zod curry recursion arguments unary
   this call apply bind arrow lambda`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Azerbaijani words the templates produce that happen to carry no Azerbaijani-specific letter, so
 * the check below cannot recognise them by their spelling.
 */
const AZ_ASCII = new Set(
  `var bu bir ilk son daha az çox tabe olmaq tarixi baş verir sual cavab hansi hansilar
   nə niyə necə fərq halda halinda zaman kimi ilə üzrə arasinda etmək edir olur alir
   nümunə göstər danış qayda qaydalar lazim lazimdir doğru doğrudur`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * A pattern that matched but left English content words behind produced something like
 * "JavaScript-də possible ways to create objects nədir?". Such a line is worse than showing the
 * question in English, so it is rejected: every word has to be Azerbaijani or a technical term.
 */
const isAzerbaijani = (built: string) => {
  const words = built.toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.every(word => {
    if (/[əğıöşüç]/.test(word)) return true;
    // "React-də", "hook-lar" and plain plurals all have to resolve to a known term.
    const forms = [word, word.split('-')[0]!, word.replace(/e?s$/, '')];
    return forms.some(form => TECH.has(form) || AZ_ASCII.has(form));
  });
};

const azQuestion = (english: string): string | undefined => {
  // Titles that pack two questions ("What is useContext? What are the steps...") only get their
  // first sentence rephrased; the rest would come out as English glued onto Azerbaijani.
  const first = (english.includes('?') ? english.split('?')[0]! : english).trim();

  for (const rule of RULES) {
    const match = first.match(rule.match);
    if (!match) continue;

    const built = rule.build(match.slice(1) as string[]);

    // Leftover English question words mean the pattern mangled the sentence rather than translating
    // it, and an over-long result is the same signal.
    if (/\b(what|how|why|when|which|whether)\b/i.test(built)) return undefined;
    // English connectives surviving into the result mean the sentence was not really rephrased -
    // leaving such a question in English beats showing a mangled Azerbaijani line.
    if (/\s(of|behind|its|their|between|when|while)\s/i.test(built)) return undefined;
    if (built.length > 120) return undefined;
    if (!isAzerbaijani(built)) return undefined;

    return built;
  }
  return undefined;
};

const dir = './public/data';

for (const deck of ['react', 'javascript'] as const) {
  const set = JSON.parse(readFileSync(`${dir}/${deck}.json`, 'utf8')) as {
    questions: { id: string; question: string }[];
  };
  const path = `${dir}/az-${deck}.json`;
  const overlay = JSON.parse(readFileSync(path, 'utf8')) as Overlay;

  let added = 0;
  let skipped = 0;

  for (const question of set.questions) {
    if (overlay.entries[question.id]) continue;
    const az = azQuestion(question.question);
    if (!az) {
      skipped += 1;
      continue;
    }
    overlay.entries[question.id] = { question: az, auto: true };
    added += 1;
  }

  const ordered = Object.fromEntries(
    set.questions.filter(q => overlay.entries[q.id]).map(q => [q.id, overlay.entries[q.id]!]),
  );

  writeFileSync(path, `${JSON.stringify({ ...overlay, entries: ordered }, null, 2)}\n`, 'utf8');

  const total = set.questions.length;
  const covered = Object.keys(ordered).length;
  console.log(
    `${deck}: ${covered}/${total} covered (${Math.round((covered / total) * 100)}%), ${added} generated, ${skipped} left in English`,
  );
}
