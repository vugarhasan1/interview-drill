import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildQueue, gradeQuestion } from './scheduling';
import { loadProgress, saveProgress } from './storage';
import type { Deck, Grade, ProgressMap, Question, QueueMode } from './types';

export interface UseDrillOptions {
  deck: Deck;
  questions: Question[];
  mode: QueueMode;
  cluster: string | 'all';
}

export const useDrill = ({ deck, questions, mode, cluster }: UseDrillOptions) => {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress(deck));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => setProgress(loadProgress(deck)), [deck]);

  // The queue is frozen while a run is in progress, otherwise grading a question would remove it
  // from under the cursor and the next card would be skipped.
  const queue = useMemo(
    () => buildQueue(questions, loadProgress(deck), mode, cluster),
    [questions, deck, mode, cluster],
  );

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [queue]);

  const current = queue[index];

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    if (!current) return undefined;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [current]);

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    (value: Grade) => {
      if (!current) return;
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      setProgress(previous => {
        const next = {
          ...previous,
          [current.id]: gradeQuestion(previous[current.id], value, seconds),
        };
        saveProgress(deck, next);
        return next;
      });
      setRevealed(false);
      setIndex(position => position + 1);
    },
    [current, deck],
  );

  const skip = useCallback(() => {
    setRevealed(false);
    setIndex(position => position + 1);
  }, []);

  // Walking back keeps the recorded grade: it is for re-reading an answer, not for undoing it.
  const back = useCallback(() => {
    setRevealed(false);
    setIndex(position => Math.max(0, position - 1));
  }, []);

  const restart = useCallback(() => {
    setIndex(0);
    setRevealed(false);
  }, []);

  return {
    progress,
    setProgress,
    queue,
    current,
    index,
    revealed,
    elapsed,
    reveal,
    grade,
    skip,
    back,
    restart,
    finished: queue.length > 0 && index >= queue.length,
  };
};
