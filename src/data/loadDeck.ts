import { DECK_SOURCES, parseQuestions } from '../parse/parseQuestions';
import type { DeckKind } from '../parse/clusters';
import { readDeck, readOverlay, saveDeck, saveOverlay } from '../storage/deckCache';
import type { AzOverlay, Deck, QuestionSet } from '../types';

export type DeckOrigin = 'bundled' | 'cache' | 'source' | 'file';

export interface LoadedDeck {
  set: QuestionSet;
  origin: DeckOrigin;
  fetchedAt?: number;
}

const KIND: Record<Deck, DeckKind> = { react: 'react', javascript: 'js' };

/** Where the Azerbaijani overlay of a deck is fetched from, when the user has set one. */
const overlayUrlKey = (deck: Deck) => `interview-drill:az-url:${deck}`;

export const getOverlayUrl = (deck: Deck) => localStorage.getItem(overlayUrlKey(deck)) ?? '';

export const setOverlayUrl = (deck: Deck, url: string) => {
  if (url) localStorage.setItem(overlayUrlKey(deck), url);
  else localStorage.removeItem(overlayUrlKey(deck));
};

const fetchJson = async <T>(url: string): Promise<T | undefined> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

/**
 * The React bank ships with the app (MIT, attributed). The JavaScript bank has no licence, so it is
 * never bundled or deployed: the browser reads it from the source repository and keeps the parsed
 * result on the device.
 */
export const loadDeck = async (deck: Deck): Promise<LoadedDeck | undefined> => {
  const bundled = await fetchJson<QuestionSet>(`data/${deck}.json`);
  if (bundled?.questions?.length) return { set: bundled, origin: 'bundled' };

  const cached = await readDeck(deck).catch(() => undefined);
  if (cached) return { set: cached.set, origin: 'cache', fetchedAt: cached.fetchedAt };

  return undefined;
};

export const fetchDeckFromSource = async (deck: Deck): Promise<LoadedDeck> => {
  const { raw } = DECK_SOURCES[KIND[deck]];
  const response = await fetch(raw);
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

  const set = parseQuestions(await response.text(), KIND[deck]);
  if (!set.questions.length) throw new Error('Nothing parsed out of that README');

  const fetchedAt = Date.now();
  await saveDeck(deck, set, fetchedAt).catch(() => undefined);
  return { set, origin: 'source', fetchedAt };
};

export const loadOverlay = async (deck: Deck): Promise<AzOverlay | undefined> => {
  const local = await fetchJson<AzOverlay>(`data/az-${deck}.json`);
  if (local?.entries) return local;

  const url = getOverlayUrl(deck);
  if (url) {
    const remote = await fetchJson<AzOverlay>(url);
    if (remote?.entries) {
      await saveOverlay(deck, remote, Date.now()).catch(() => undefined);
      return remote;
    }
  }

  const cached = await readOverlay(deck).catch(() => undefined);
  return cached?.overlay;
};
