/**
 * Dictionary Web Worker — runs entirely off the main thread.
 *
 * Messages IN  (from main thread):
 *   { type: 'LOAD_FULL' }   → Load dict, build Set, send words in chunks to main thread
 *   { type: 'LOAD' }        → Load dict, keep Set here only (worker-only mode)
 *   { type: 'CHECK', word } → Check a single word (worker-only mode)
 *
 * Messages OUT (to main thread):
 *   { type: 'CHUNK', words: string[] }            → batch of normalized words
 *   { type: 'LOADED', size, letters }             → loading complete
 *   { type: 'LOAD_ERROR', error }                 → load failed
 *   { type: 'CHECK_RESULT', word, valid }         → result of single word check
 */

let dictionary: Set<string> = new Set();
let availableLetters: string[] = [];
const CHUNK_SIZE = 5000;

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

async function loadDictionary(sendChunks: boolean): Promise<void> {
  const response = await fetch('/index.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const words: string[] = (await response.json()) as string[];

  dictionary = new Set<string>();
  const lettersSet = new Set<string>();
  const chunkBuffer: string[] = [];

  for (const w of words) {
    const normalized = normalizeText(w);
    dictionary.add(normalized);
    if (normalized.length > 0) {
      lettersSet.add(normalized[0].toUpperCase());
    }

    if (sendChunks) {
      chunkBuffer.push(normalized);
      if (chunkBuffer.length >= CHUNK_SIZE) {
        self.postMessage({ type: 'CHUNK', words: [...chunkBuffer] });
        chunkBuffer.length = 0;
      }
    }
  }

  // Flush remaining chunk
  if (sendChunks && chunkBuffer.length > 0) {
    self.postMessage({ type: 'CHUNK', words: chunkBuffer });
  }

  availableLetters = Array.from(lettersSet).sort();
}

self.addEventListener(
  'message',
  async (e: MessageEvent<{ type: string; word?: string }>) => {
    const { type, word } = e.data;

    // ── LOAD_FULL: send all words to main thread via chunks ───
    if (type === 'LOAD_FULL') {
      try {
        await loadDictionary(true);
        self.postMessage({
          type: 'LOADED',
          size: dictionary.size,
          letters: availableLetters,
        });
      } catch (err) {
        self.postMessage({
          type: 'LOAD_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    // ── LOAD: keep Set in worker only (no chunks) ─────────────
    if (type === 'LOAD') {
      try {
        await loadDictionary(false);
        self.postMessage({
          type: 'LOADED',
          size: dictionary.size,
          letters: availableLetters,
        });
      } catch (err) {
        self.postMessage({
          type: 'LOAD_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    // ── CHECK: single word validation ─────────────────────────
    if (type === 'CHECK' && word !== undefined) {
      const normalized = normalizeText(word);
      self.postMessage({
        type: 'CHECK_RESULT',
        word: normalized,
        valid: dictionary.size === 0 || dictionary.has(normalized),
      });
      return;
    }

    // ── GET_LETTERS ───────────────────────────────────────────
    if (type === 'GET_LETTERS') {
      self.postMessage({ type: 'LETTERS_RESULT', letters: availableLetters });
    }
  }
);
