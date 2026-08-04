import type { AzOverlay, Deck, QuestionSet } from '../types';

const DB_NAME = 'interview-drill';
const STORE = 'decks';

interface CachedDeck {
  set: QuestionSet;
  fetchedAt: number;
}

interface CachedOverlay {
  overlay: AzOverlay;
  fetchedAt: number;
}

// A question bank is a megabyte of JSON, which is too much for localStorage, so it lands in
// IndexedDB. Only two keys per deck are ever stored, hence no schema beyond a single store.
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const put = async (key: string, value: unknown) => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const get = async <T>(key: string): Promise<T | undefined> => {
  const db = await open();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
};

export const saveDeck = (deck: Deck, set: QuestionSet, fetchedAt: number) =>
  put(`deck:${deck}`, { set, fetchedAt } satisfies CachedDeck);

export const readDeck = (deck: Deck) => get<CachedDeck>(`deck:${deck}`);

export const saveOverlay = (deck: Deck, overlay: AzOverlay, fetchedAt: number) =>
  put(`az:${deck}`, { overlay, fetchedAt } satisfies CachedOverlay);

export const readOverlay = (deck: Deck) => get<CachedOverlay>(`az:${deck}`);
