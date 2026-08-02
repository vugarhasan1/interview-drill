import type { Deck, ProgressMap } from './types';

const key = (deck: Deck) => `interview-drill:${deck}`;

export const loadProgress = (deck: Deck): ProgressMap => {
  try {
    const raw = localStorage.getItem(key(deck));
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
};

export const saveProgress = (deck: Deck, progress: ProgressMap): void => {
  try {
    localStorage.setItem(key(deck), JSON.stringify(progress));
  } catch {
    // Storage full or blocked: drills still work, only the history is lost.
  }
};

export const clearProgress = (deck: Deck): void => localStorage.removeItem(key(deck));

export const exportProgress = (deck: Deck): string =>
  JSON.stringify(
    { deck, savedAt: new Date().toISOString(), progress: loadProgress(deck) },
    null,
    2,
  );
