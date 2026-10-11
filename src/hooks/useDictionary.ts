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

export type DictionaryStatus = 'idle' | 'loading' | 'ready' | 'error';

type WorkerMessage =
  | { type: 'CHUNK'; words: string[] }
  | { type: 'PROGRESS'; loaded: number; total: number }
  | { type: 'LOADED'; size: number; letters: string[] }
  | { type: 'LOAD_ERROR'; error: string };

export interface UseDictionaryReturn {
  status: DictionaryStatus;
  progress: number;
  error: string | null;
  availableLetters: string[];
  /** Synchronous O(1) lookup. Returns true while loading (lenient mode). */
  checkWord: (word: string) => { valid: boolean; reason?: 'dictionary-unavailable' | 'not-found' };
  isWordUsed: (word: string) => boolean;
  markWordUsed: (word: string) => void;
  clearUsedWords: () => void;
  retry: () => void;
}

export function useDictionary(): UseDictionaryReturn {
  const [status, setStatus] = useState<DictionaryStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);

  // Main-thread mirror — built from worker chunks
  const dictionaryRef = useRef<Set<string>>(new Set());
  // Per-session used words
  const usedWordsRef = useRef<Set<string>>(new Set());
  const workerRef = useRef<Worker | null>(null);

  const load = useCallback(() => {
    workerRef.current?.terminate();
    const worker = new DictionaryWorker();
    workerRef.current = worker;
    setStatus('loading');
    setProgress(0);
    setError(null);

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;

      if (msg.type === 'CHUNK') {
        // Accumulate chunks into the main-thread Set
        for (const word of msg.words) {
          dictionaryRef.current.add(word);
        }
        return;
      }
      if (msg.type === 'PROGRESS') {
        setProgress(msg.total > 0 ? msg.loaded / msg.total : 0);
        return;
      }

      if (msg.type === 'LOADED') {
        setAvailableLetters(msg.letters);
        setStatus('ready');
        setProgress(1);
        console.log(`[Dictionary] Ready — ${msg.size.toLocaleString()} words.`);
        return;
      }

      if (msg.type === 'LOAD_ERROR') {
        setError(msg.error);
        setStatus('error');
        console.error('[Dictionary] Load error:', msg.error);
      }
    };

    worker.onerror = (e) => {
      setError(e.message);
      setStatus('error');
    };

    worker.postMessage({ type: 'LOAD_FULL' });

    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, []);

  useEffect(() => load(), [load]);

  const checkWord = useCallback((word: string) => {
    if (status !== 'ready') return { valid: false, reason: 'dictionary-unavailable' as const };
    const normalized = normalizeText(word);
    return dictionaryRef.current.has(normalized)
      ? { valid: true }
      : { valid: false, reason: 'not-found' as const };
  }, [status]);

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
    status,
    progress,
    error,
    availableLetters,
    checkWord,
    isWordUsed,
    markWordUsed,
    clearUsedWords,
    retry: load,
  };
}
