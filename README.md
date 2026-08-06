# Interview drill

Flashcard-style drill over the React and JavaScript interview question banks, built to practise the
interview format rather than to read answers: one question at a time, a timer, then a self-grade
that doubles as the triage.

```bash
bun install
bun run dev
```

## How it works

| Mode   | Queue                                                      |
| ------ | ---------------------------------------------------------- |
| Unseen | every question once, in source order - the first full pass |
| Due    | questions whose scheduled repeat has arrived               |
| Weak   | everything graded shaky or unknown                         |
| Mock   | 10 random questions, interview tempo                       |
| All    | ignores progress                                           |

Grading sets the next appearance: **Knew it** 5 days and growing, **Shaky** 1 day, **No idea**
10 minutes. Progress lives in `localStorage` per deck and can be exported as JSON.

Keyboard: `Space` reveals, `1` knew it, `2` shaky, `3` no idea, `s` skip.

The timer counts up and turns red past 90 seconds, which is roughly the length of a good spoken
answer. The last answer time is stored per question, so slow topics stand out even when the grade
is "knew it".

Coverage table at the bottom is the heatmap: click a cluster name to drill only that cluster.

## Answer format to practise

1. definition in one sentence
2. why it matters
3. an example from your own work
4. the trade-off or the gotcha

Beats 3 and 4 are what separate levels in an interview. Questions that have a personal example
attached show it above the model answer.

## Azerbaijani overlay

`public/data/az-*.json` adds an Azerbaijani phrasing of the question and a one-line gist, keyed by
question id. Technical terms stay in English (state, hook, closure, reconciliation, batching),
because that is how they come up in an interview. What needs practising is explaining them in
Azerbaijani, not translating the vocabulary.

```json
{
  "deck": "react",
  "entries": {
    "react-how-do-reactive-dependencies-in-the-useeffect-dependency-arr": {
      "question": "useEffect-in dependency array-i nə üçündür?",
      "gist": "Effekt həmin dəyərlərdən biri dəyişdikdə yenidən işləyir..."
    }
  }
}
```

The overlay is optional and partial: questions without an entry just show English.
The `AZ` button in the header hides it, and the choice is remembered.

An overlay that isn't shipped with the app can be pointed at by URL. There's a field under the
footer; paste a raw gist URL, it's kept in localStorage and the fetched overlay goes to IndexedDB,
so it survives being offline.

## Data

Two ways in, and both end up with the same records, same ids:

1. `public/data/*.json`, generated locally by the parser:

```bash
# put the upstream READMEs in ./.cache first
bun run scripts/parse-questions.ts
```

2. Read from the source repository at runtime. "Read from GitHub" fetches the upstream README over
   CORS, parses it in the browser with the same code as the script, and stores the result in
   IndexedDB. Nothing about it lives in this repo or in the deployed build.

Each record: `id`, `number`, `cluster`, `question`, `answer` (markdown), `source`, and optionally
`myExample`. Ids come from the question text, not from the numbering in the README, which repeats
itself and would attach progress and overlays to the wrong card.

## Deploy

Vite copies the whole of `public/` into `dist/`, gitignored files included. That is fine locally and
a licence problem anywhere else, so **deploy from git, not from this machine**: push the repo, point
Vercel at it, and let it build. Then the only decks in the build are the ones git tracks.

No configuration is needed - no router, so no SPA rewrite, and Vercel detects Vite on its own.
`.vercelignore` repeats the data exclusions so that a `vercel` CLI deploy cannot leak them either.

On a deployed build: the React deck is there immediately; the JavaScript deck arrives through
"Read from GitHub" once and then lives in IndexedDB; the Azerbaijani overlay for it comes from the
gist URL pasted under the footer. All three survive going offline.

## Licensing of the question banks

- **React** questions come from [sudheerj/reactjs-interview-questions](https://github.com/sudheerj/reactjs-interview-questions),
  MIT licensed (Copyright (c) 2017-Present Sudheer Jonna). Redistributed here under that licence
  with attribution.
- **JavaScript** questions come from [sudheerj/javascript-interview-questions](https://github.com/sudheerj/javascript-interview-questions),
  which currently ships **no licence file**. Without a licence there is no permission to
  redistribute, so `public/data/javascript.json` is gitignored and never deployed. On a deployed
  build the browser reads that README from the source repository itself and keeps the parsed result
  on the device, which is the same thing as opening the page and reading it. Locally the parser or a
  JSON file picked from disk work too. Its Azerbaijani overlay (`public/data/az-javascript.json`) is
  derived from those questions, so it stays out of the repo for the same reason and is loaded from a
  URL instead.

The app itself is MIT.
