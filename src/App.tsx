import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClusterHeatmap } from './ClusterHeatmap';
import { renderAnswer } from './renderAnswer';
import { useDrill } from './useDrill';
import { clearProgress, exportProgress } from './storage';
import {
  fetchDeckFromSource,
  getOverlayUrl,
  loadDeck,
  loadOverlay,
  setOverlayUrl,
  type DeckOrigin,
} from './data/loadDeck';
import type { AzOverlay, Deck, QuestionSet, QueueMode } from './types';

const DECKS: { id: Deck; label: string }[] = [
  { id: 'react', label: 'React' },
  { id: 'javascript', label: 'JavaScript' },
];

const MODES: { id: QueueMode; label: string; hint: string }[] = [
  { id: 'unseen', label: 'Unseen', hint: 'every question once, in order' },
  { id: 'due', label: 'Due', hint: 'scheduled repeats' },
  { id: 'weak', label: 'Weak', hint: 'shaky and unknown' },
  { id: 'mock', label: 'Mock', hint: '10 random, timed' },
  { id: 'all', label: 'All', hint: 'ignore progress' },
];

const TARGET_SECONDS = 90;

const withAz = (set: QuestionSet, overlay: AzOverlay | undefined): QuestionSet =>
  overlay
    ? {
        ...set,
        questions: set.questions.map(question => {
          const az = overlay.entries[question.id];
          return az ? { ...question, az } : question;
        }),
      }
    : set;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function App() {
  const [deck, setDeck] = useState<Deck>('react');
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [overlay, setOverlay] = useState<AzOverlay>();
  const [origin, setOrigin] = useState<{ from: DeckOrigin; fetchedAt?: number }>();
  const [loadError, setLoadError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<QueueMode>('unseen');
  const [cluster, setCluster] = useState<string | 'all'>('all');
  const [showAz, setShowAz] = useState(() => localStorage.getItem('interview-drill:az') !== 'off');
  const [azUrl, setAzUrl] = useState('');

  useEffect(() => {
    let active = true;
    setSet(null);
    setOverlay(undefined);
    setOrigin(undefined);
    setLoadError(undefined);
    setCluster('all');
    setAzUrl(getOverlayUrl(deck));

    // The Azerbaijani overlay is optional: a missing or partial one just means fewer gists.
    Promise.all([loadDeck(deck), loadOverlay(deck)]).then(([loaded, az]) => {
      if (!active) return;
      setOverlay(az);
      if (!loaded) {
        setLoadError(
          'Could not read this deck from the source repository. Check the connection and try again; it stays on this device afterwards.',
        );
        return;
      }
      setSet(loaded.set);
      setOrigin({
        from: loaded.origin,
        ...(loaded.fetchedAt ? { fetchedAt: loaded.fetchedAt } : {}),
      });
    });

    return () => {
      active = false;
    };
  }, [deck]);

  const refreshFromSource = useCallback(() => {
    setBusy(true);
    setLoadError(undefined);
    fetchDeckFromSource(deck)
      .then(loaded => {
        setSet(loaded.set);
        setOrigin({
          from: loaded.origin,
          ...(loaded.fetchedAt ? { fetchedAt: loaded.fetchedAt } : {}),
        });
      })
      .catch((error: Error) => setLoadError(`Could not read the questions: ${error.message}`))
      .finally(() => setBusy(false));
  }, [deck]);

  const merged = useMemo(() => (set ? withAz(set, overlay) : null), [set, overlay]);
  const questions = merged?.questions ?? [];
  const drill = useDrill({ deck, questions, mode, cluster });
  const { current, revealed, elapsed } = drill;

  const answerHtml = useMemo(
    () => (current && merged ? renderAnswer(current.answer, merged.source) : ''),
    [current, merged],
  );

  const onFile = useCallback((file: File) => {
    file
      .text()
      .then(text => {
        setSet(JSON.parse(text) as QuestionSet);
        setOrigin({ from: 'file' });
        setLoadError(undefined);
      })
      .catch(() => setLoadError('That file is not a question set exported by the parser.'));
  }, []);

  const applyOverlayUrl = useCallback(() => {
    setOverlayUrl(deck, azUrl.trim());
    loadOverlay(deck).then(setOverlay);
  }, [azUrl, deck]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (!revealed) drill.reveal();
        return;
      }
      if (event.key === 'ArrowLeft') drill.back();
      if (event.key === 's' || event.key === 'ArrowRight') drill.skip();
      if (!revealed) return;
      if (event.key === '1') drill.grade('known');
      if (event.key === '2') drill.grade('shaky');
      if (event.key === '3') drill.grade('unknown');
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
          <button
            className={showAz ? 'active' : ''}
            title="Azərbaycanca sual və qısa izah"
            onClick={() => {
              setShowAz(value => {
                localStorage.setItem('interview-drill:az', value ? 'off' : 'on');
                return !value;
              });
            }}
          >
            AZ
          </button>
        </div>
      </header>

      {!merged && !loadError ? (
        <section className="notice">
          <p>Loading questions…</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="notice">
          <p>{loadError}</p>
          <div className="notice-actions">
            <button className="primary" disabled={busy} onClick={refreshFromSource}>
              {busy ? 'Reading…' : 'Read from GitHub'}
            </button>
            <input
              type="file"
              accept="application/json"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
              }}
            />
          </div>
        </section>
      ) : null}

      {merged ? (
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
              <option value="all">All clusters ({merged.count})</option>
              {merged.clusters.map(name => (
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

              {showAz && current.az ? <p className="az-question">{current.az.question}</p> : null}

              {revealed ? (
                <>
                  {showAz && current.az?.gist ? (
                    <p className="az-gist">
                      <strong>Qısa:</strong> {current.az.gist}
                    </p>
                  ) : null}
                  {current.myExample ? (
                    <p className="my-example">
                      <strong>My example:</strong> {current.myExample}
                    </p>
                  ) : null}
                  <div className="answer" dangerouslySetInnerHTML={{ __html: answerHtml }} />
                  <div className="grades">
                    <button className="grade-known" onClick={() => drill.grade('known')}>
                      Knew it (1)
                    </button>
                    <button className="grade-shaky" onClick={() => drill.grade('shaky')}>
                      Shaky (2)
                    </button>
                    <button className="grade-unknown" onClick={() => drill.grade('unknown')}>
                      No idea (3)
                    </button>
                    <button className="nav" onClick={drill.back} disabled={drill.index === 0}>
                      &larr; Back
                    </button>
                    <button className="nav skip" onClick={drill.skip}>
                      Skip &rarr;
                    </button>
                  </div>
                  <a className="source" href={current.source} target="_blank" rel="noreferrer">
                    Original answer on GitHub
                  </a>
                </>
              ) : (
                <div className="grades">
                  <button className="primary" onClick={drill.reveal}>
                    Show answer (Space)
                  </button>
                  <button className="nav" onClick={drill.back} disabled={drill.index === 0}>
                    &larr; Back
                  </button>
                  <button className="nav skip" onClick={drill.skip}>
                    Skip &rarr;
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
                  drill.restart();
                }
              }}
            >
              Reset progress
            </button>
            <button className="ghost" disabled={busy} onClick={refreshFromSource}>
              {busy ? 'Reading…' : 'Refresh from GitHub'}
            </button>
            <span className="credit">
              Questions by Sudheer Jonna, from{' '}
              <a href={`https://github.com/${merged.source}`}>{merged.source}</a>
              {origin?.fetchedAt
                ? `, read ${new Date(origin.fetchedAt).toLocaleDateString()} and kept on this device`
                : ''}
            </span>
          </footer>

          <section className="notice az-url">
            <label htmlFor="az-url">Azerbaijani overlay URL for this deck</label>
            <div className="notice-actions">
              <input
                id="az-url"
                type="url"
                placeholder="https://gist.githubusercontent.com/..."
                value={azUrl}
                onChange={event => setAzUrl(event.target.value)}
              />
              <button className="ghost" onClick={applyOverlayUrl}>
                Save
              </button>
            </div>
            <p className="hint">
              {overlay
                ? `${Object.keys(overlay.entries).length} entries loaded.`
                : 'Optional. Without it the questions stay in English.'}
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
