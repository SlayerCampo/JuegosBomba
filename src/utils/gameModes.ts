import type { GameMode, GameModeConfig } from '@/types/palabras';

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  hardcore: {
    label: 'Hardcore 🔥',
    description: 'Rondas rápidas: 10s, 5s y 2.5s.',
    roundTimes: [10, 5, 2.5],
  },
  normal: {
    label: 'Normal ⚡',
    description: 'Balanceado: 30s, 15s y 7.5s.',
    roundTimes: [30, 15, 7.5],
  },
  easy: {
    label: 'Fácil 🌿',
    description: 'Más relajado: 40s, 20s y 10s.',
    roundTimes: [40, 20, 10],
  },
};

export function getModeConfig(mode: GameMode): GameModeConfig {
  return GAME_MODES[mode];
}

/**
 * Returns the 0-based bucket index for the given round number.
 *
 * Per spec: "After 2 rounds it drops to 15s. After 2 more rounds it drops to 7.5s."
 *   Rounds 1-2  →  bucket 0  (full duration)
 *   Rounds 3-4  →  bucket 1  (half duration)
 *   Rounds 5+   →  bucket 2  (quarter duration)
 *
 * Formula: Math.min( Math.floor((round - 1) / 2),  maxBuckets - 1 )
 */
export function getDifficultyBucketIndex(round: number, maxBuckets = 3): number {
  return Math.min(Math.floor((round - 1) / 2), maxBuckets - 1);
}

/**
 * Returns the turn duration in seconds for the given game mode and round number.
 * Uses the 2-round bucket system defined above.
 */
export function getRoundDuration(mode: GameMode, roundNumber: number): number {
  const config = getModeConfig(mode);
  const index = getDifficultyBucketIndex(roundNumber, config.roundTimes.length);
  return config.roundTimes[index];
}

/**
 * Computes the round number for a given turn count.
 * 1 round = numPlayers × 2 turns (per spec).
 */
export function getRoundNumber(turnCount: number, numPlayers: number): number {
  const turnsPerRound = Math.max(1, numPlayers) * 2;
  return Math.ceil(turnCount / turnsPerRound);
}
