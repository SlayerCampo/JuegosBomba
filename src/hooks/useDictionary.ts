/**
 * useDictionary — loads the Spanish dictionary via Web Worker
 *
 * Architecture:
 * - The worker fetches /index.json off the main thread.
 * - It sends normalized words in 5000-word CHUNK batches.
 * - We accumulate them into a main-thread Set<string> for O(1) sync lookups.
 * - Once LOADED fires, the Set is complete and checkWord() is fully synchronous.
 *
 * This avoids the UI-blocking 12MB parse AND keeps validation instant (no
 * async worker round-trip per keystroke).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeText } from '@/utils/textUtils';
import DictionaryWorker from '@/utils/dictionary.worker.ts?worker';

type WorkerMessage =
  | { type: 'CHUNK'; words: string[] }
  | { type: 'LOADED'; size: number; letters: string[] }
  | { type: 'LOAD_ERROR'; error: string };

export interface UseDictionaryReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  availableLetters: string[];
  /** Synchronous O(1) lookup. Returns true while loading (lenient mode). */
  checkWord: (word: string) => boolean;
  isWordUsed: (word: string) => boolean;
  markWordUsed: (word: string) => void;
  clearUsedWords: () => void;
}

export function useDictionary(): UseDictionaryReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);

  // Main-thread mirror — built from worker chunks
  const dictionaryRef = useRef<Set<string>>(new Set());
  // Per-session used words
  const usedWordsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const worker = new DictionaryWorker();

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;

      if (msg.type === 'CHUNK') {
        // Accumulate chunks into the main-thread Set
        for (const word of msg.words) {
          dictionaryRef.current.add(word);
        }
        return;
      }

      if (msg.type === 'LOADED') {
        setAvailableLetters(msg.letters);
        setIsLoading(false);
        setIsReady(true);
        console.log(`[Dictionary] Ready — ${msg.size.toLocaleString()} words.`);
        return;
      }

      if (msg.type === 'LOAD_ERROR') {
        setError(msg.error);
        setIsLoading(false);
        console.error('[Dictionary] Load error:', msg.error);
      }
    };

    worker.onerror = (e) => {
      setError(e.message);
      setIsLoading(false);
    };

    // Start loading — worker will stream CHUNK messages then fire LOADED
    worker.postMessage({ type: 'LOAD_FULL' });

    return () => {
      worker.terminate();
    };
  }, []);

  const checkWord = useCallback((word: string): boolean => {
    // While loading: be lenient, let everything through
    if (!isReady) return true;
    const normalized = normalizeText(word);
    return (
      dictionaryRef.current.size === 0 ||
      dictionaryRef.current.has(normalized)
    );
  }, [isReady]);

  const isWordUsed = useCallback((word: string): boolean => {
    return usedWordsRef.current.has(normalizeText(word));
  }, []);

  const markWordUsed = useCallback((word: string) => {
    usedWordsRef.current.add(normalizeText(word));
  }, []);

  const clearUsedWords = useCallback(() => {
    usedWordsRef.current.clear();
  }, []);

  return {
    isLoading,
    isReady,
    error,
    availableLetters,
    checkWord,
    isWordUsed,
    markWordUsed,
    clearUsedWords,
  };
}
