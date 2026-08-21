/**
 * Text normalization utilities (from palabras-game.js: limpiarTexto)
 * Strips accents and whitespace, lowercases — for dictionary lookups.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generates a random letter from the available letters pool.
 * Avoids repeating the current letter if alternatives exist.
 */
export function getRandomLetter(
  availableLetters: string[],
  currentLetter: string | null = null
): string {
  if (availableLetters.length === 0) {
    const fallback = 'ABCDEFGHIJLMNOPQRSTUV'.split('');
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  if (availableLetters.length === 1) return availableLetters[0];
  const pool = currentLetter
    ? availableLetters.filter((l) => l !== currentLetter)
    : availableLetters;
  const effective = pool.length > 0 ? pool : availableLetters;
  return effective[Math.floor(Math.random() * effective.length)];
}

/**
 * Formats seconds for the timer display.
 * Integers are shown without decimal; fractions show one decimal place.
 */
export function formatSeconds(seconds: number): string {
  return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1);
}

/**
 * Generates a short 4-character room code (uppercase alphanumeric).
 */
export function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
