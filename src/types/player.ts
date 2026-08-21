// ================================================================
// PLAYER TYPES (shared across both game modes)
// ================================================================

export const EMOJIS = ['😎', '🤖', '👽', '👻', '🤡', '🦊', '🐯', '🐶', '🐱', '🐵'] as const;
export type Emoji = (typeof EMOJIS)[number];

export interface PlayerProfile {
  id: string;
  name: string;
  emoji: Emoji;
  isReady: boolean;
}

// Palabras Bomba player — extends profile with lives
export interface PalabrasPlayer extends PlayerProfile {
  lives: number;
}

// STOP Bomba player — extends profile with score
export interface StopPlayer extends PlayerProfile {
  score: number;
}

export type PlayerMap<P extends PlayerProfile = PlayerProfile> = Record<string, P>;

export type PlayerId = string; // 'host' or the PeerJS peer ID
