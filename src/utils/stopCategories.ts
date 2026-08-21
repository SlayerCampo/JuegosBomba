import type { CategoryInfo, CategoryKey } from '@/types/stop';

export const STOP_CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  nombres:   { label: 'Nombres',   emoji: '👤' },
  apellidos: { label: 'Apellidos', emoji: '🏷️' },
  objetos:   { label: 'Objetos',   emoji: '📦' },
  animales:  { label: 'Animales',  emoji: '🐾' },
  colores:   { label: 'Colores',   emoji: '🎨' },
  ciudad:    { label: 'Ciudad',    emoji: '🏙️' },
  pais:      { label: 'País',      emoji: '🌍' },
  fruta:     { label: 'Fruta',     emoji: '🍎' },
};

export const ALL_CATEGORY_KEYS = Object.keys(STOP_CATEGORIES) as CategoryKey[];

export const STOP_LETTERS = 'ABCDEFGHIJLMNOPRSTUVZ'.split('');
export const TOTAL_ROUNDS = 5;

export const STOP_EMOJIS = ['😎', '🤖', '👽', '👻', '🤡', '🦊', '🐯', '🐶', '🐱', '🐵'];

export function getRandomStopLetter(current: string | null = null): string {
  const pool = current ? STOP_LETTERS.filter((l) => l !== current) : STOP_LETTERS;
  const effective = pool.length > 0 ? pool : STOP_LETTERS;
  return effective[Math.floor(Math.random() * effective.length)];
}

/**
 * Calculates points for a vote result.
 */
export function voteToPoints(vote: 'valid' | 'invalid' | 'repeated'): number {
  if (vote === 'valid') return 100;
  if (vote === 'repeated') return 50;
  return 0;
}
