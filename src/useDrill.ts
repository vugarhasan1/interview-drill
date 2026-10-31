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
  const [round, setRound] = useState(0);
  const startedAt = useRef(Date.now());
  const answerSeconds = useRef(0);

  useEffect(() => setProgress(loadProgress(deck)), [deck]);

  // The queue is frozen while a run is in progress, otherwise grading a question would remove it
  // from under the cursor and the next card would be skipped. Only a restart rebuilds it.
  const queue = useMemo(
    () => buildQueue(questions, loadProgress(deck), mode, cluster),
    [questions, deck, mode, cluster, round],
  );

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [queue]);

  const current = queue[index];

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
  }, [current]);

  // The clock measures the spoken answer, so it stops once the model answer is on screen.
  useEffect(() => {
    if (!current || revealed) return undefined;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [current, revealed]);

  const reveal = useCallback(() => {
    answerSeconds.current = Math.floor((Date.now() - startedAt.current) / 1000);
    setElapsed(answerSeconds.current);
    setRevealed(true);
  }, []);

  const grade = useCallback(
    (value: Grade) => {
      if (!current) return;
      const seconds = answerSeconds.current;
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
    setIndex(position => Math.min(position + 1, queue.length));
  }, [queue]);

  // Walking back keeps the recorded grade: it is for re-reading an answer, not for undoing it.
  const back = useCallback(() => {
    setRevealed(false);
    setIndex(position => Math.max(0, position - 1));
  }, []);

  const restart = useCallback(() => setRound(value => value + 1), []);

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
