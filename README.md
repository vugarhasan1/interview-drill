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
question id. Technical terms deliberately stay in English (state, hook, closure, reconciliation,
batching), because that is how they are used in an interview - what needs practising is explaining
them in Azerbaijani, not translating them.

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

The overlay is optional and partial by design: questions without an entry simply show English only.
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

## Licensing of the question banks

- **React** questions come from [sudheerj/reactjs-interview-questions](https://github.com/sudheerj/reactjs-interview-questions),
  MIT licensed (Copyright (c) 2017-Present Sudheer Jonna). Redistributed here under that licence
  with attribution.
- **JavaScript** questions come from [sudheerj/javascript-interview-questions](https://github.com/sudheerj/javascript-interview-questions),
  which currently ships **no licence file**. Without a licence there is no permission to
  redistribute, so `public/data/javascript.json` is gitignored and never deployed. Generate it
  locally with the parser; the app also accepts a JSON file picked from disk, so a deployed build
  can load it without the data leaving the browser. Its Azerbaijani overlay
  (`public/data/az-javascript.json`) is derived from those questions and stays out of the repo for
  the same reason.

The app itself is MIT.
