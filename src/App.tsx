import { useCallback, useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { ClusterHeatmap } from './ClusterHeatmap';
import { useDrill } from './useDrill';
import { clearProgress, exportProgress } from './storage';
import type { Deck, QuestionSet, QueueMode } from './types';

const DECKS: { id: Deck; label: string; file: string }[] = [
  { id: 'react', label: 'React', file: 'data/react.json' },
  { id: 'javascript', label: 'JavaScript', file: 'data/javascript.json' },
];

const MODES: { id: QueueMode; label: string; hint: string }[] = [
  { id: 'unseen', label: 'Unseen', hint: 'every question once, in order' },
  { id: 'due', label: 'Due', hint: 'scheduled repeats' },
  { id: 'weak', label: 'Weak', hint: 'shaky and unknown' },
  { id: 'mock', label: 'Mock', hint: '10 random, timed' },
  { id: 'all', label: 'All', hint: 'ignore progress' },
];

const TARGET_SECONDS = 90;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function App() {
  const [deck, setDeck] = useState<Deck>('react');
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [mode, setMode] = useState<QueueMode>('unseen');
  const [cluster, setCluster] = useState<string | 'all'>('all');

  useEffect(() => {
    const file = DECKS.find(item => item.id === deck)!.file;
    setSet(null);
    setLoadError(undefined);
    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<QuestionSet>;
      })
      .then(setSet)
      .catch(() =>
        setLoadError(
          'This deck is not bundled with the deployed app. Load the JSON file from your machine below.',
        ),
      );
  }, [deck]);

  const questions = set?.questions ?? [];
  const drill = useDrill({ deck, questions, mode, cluster });
  const { current, revealed, elapsed } = drill;

  const answerHtml = useMemo(
    () => (current ? (marked.parse(current.answer, { async: false }) as string) : ''),
    [current],
  );

  const onFile = useCallback((file: File) => {
    file
      .text()
      .then(text => {
        setSet(JSON.parse(text) as QuestionSet);
        setLoadError(undefined);
      })
      .catch(() => setLoadError('That file is not a question set exported by the parser.'));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (!revealed) drill.reveal();
        return;
      }
      if (!revealed) return;
      if (event.key === '1') drill.grade('known');
      if (event.key === '2') drill.grade('shaky');
      if (event.key === '3') drill.grade('unknown');
      if (event.key === 's') drill.skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drill, revealed]);

  const overtime = elapsed > TARGET_SECONDS;

  return (
    <main>
      <header>
        <h1>Interview drill</h1>
        <div className="deck-switch">
          {DECKS.map(item => (
            <button
              key={item.id}
              className={item.id === deck ? 'active' : ''}
              onClick={() => setDeck(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {loadError ? (
        <section className="notice">
          <p>{loadError}</p>
          <input
            type="file"
            accept="application/json"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </section>
      ) : null}

      {set ? (
        <>
          <section className="controls">
            <div className="modes">
              {MODES.map(item => (
                <button
                  key={item.id}
                  className={item.id === mode ? 'active' : ''}
                  title={item.hint}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <select value={cluster} onChange={event => setCluster(event.target.value)}>
              <option value="all">All clusters ({set.count})</option>
              {set.clusters.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </section>

          {current ? (
            <section className="card">
              <div className="card-head">
                <span className="meta">
                  {current.cluster} · {drill.index + 1}/{drill.queue.length}
                </span>
                <span className={`timer ${overtime ? 'over' : ''}`}>{formatTime(elapsed)}</span>
              </div>

              <h2>{current.question}</h2>

              {revealed ? (
                <>
                  {current.myExample ? (
                    <p className="my-example">
                      <strong>My example:</strong> {current.myExample}
                    </p>
                  ) : null}
                  <div className="answer" dangerouslySetInnerHTML={{ __html: answerHtml }} />
                  <div className="grades">
                    <button onClick={() => drill.grade('known')}>Knew it (1)</button>
                    <button onClick={() => drill.grade('shaky')}>Shaky (2)</button>
                    <button onClick={() => drill.grade('unknown')}>No idea (3)</button>
                    <button className="ghost" onClick={drill.skip}>
                      Skip (s)
                    </button>
                  </div>
                  <a className="source" href={current.source} target="_blank" rel="noreferrer">
                    Original answer on GitHub
                  </a>
                </>
              ) : (
                <div className="grades">
                  <button onClick={drill.reveal}>Show answer (Space)</button>
                  <button className="ghost" onClick={drill.skip}>
                    Skip (s)
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="card empty">
              <h2>{drill.finished ? 'Queue finished' : 'Nothing queued in this mode'}</h2>
              <p>
                {mode === 'unseen'
                  ? 'Every question in this selection has been graded at least once. Try Due or Weak.'
                  : 'Pick another mode or cluster.'}
              </p>
              <button onClick={drill.restart}>Restart queue</button>
            </section>
          )}

          <ClusterHeatmap questions={questions} progress={drill.progress} onPick={setCluster} />

          <footer>
            <button
              className="ghost"
              onClick={() => {
                const blob = new Blob([exportProgress(deck)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `interview-drill-${deck}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export progress
            </button>
            <button
              className="ghost danger"
              onClick={() => {
                if (confirm(`Reset all progress for ${deck}?`)) {
                  clearProgress(deck);
                  drill.setProgress({});
                }
              }}
            >
              Reset progress
            </button>
            <span className="credit">
              Questions from <a href={`https://github.com/${set.source}`}>{set.source}</a>
            </span>
          </footer>
        </>
      ) : null}
    </main>
  );
}
