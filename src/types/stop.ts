// ================================================================
// STOP BOMBA — Game State Types
// ================================================================

import type { StopPlayer, PlayerMap, PlayerId } from './player';

export const STOP_LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('') as string[];
export const TOTAL_ROUNDS = 5;

// Permitir genéricos para la categoría extra
export type CategoryKey = string;

export interface CategoryInfo {
  label: string;
  emoji: string;
}

export const STOP_CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  nombres: { label: 'Nombres', emoji: '👤' },
  apellidos: { label: 'Apellidos', emoji: '👥' },
  objetos: { label: 'Objetos', emoji: '📦' },
  animales: { label: 'Animales', emoji: '🐶' },
  colores: { label: 'Colores', emoji: '🎨' },
  ciudad: { label: 'Ciudad/Lugar', emoji: '🏙️' },
  pais: { label: 'País', emoji: '🌎' },
  fruta: { label: 'Fruta/Comida', emoji: '🍎' }
};

// Payload sent to all clients to start a round
export interface StopStartGamePayload {
  categories: CategoryKey[];
  letter: string;
  round: number;
  totalRounds: number;
  players: PlayerMap<StopPlayer>;
  roundMinutes: number;
}

export type VoteValue = 'valid' | 'invalid' | 'repeated';

// { voterId: { targetId: VoteValue } }
export type CategoryVotes = Record<PlayerId, Record<PlayerId, VoteValue>>;

// { targetId: { result: VoteValue, points: number } }
export type CategoryResolution = Record<PlayerId, { result: VoteValue; points: number }>;

// allAnswers[round][playerId][categoryKey] = word
export type AllAnswers = Record<number, Record<PlayerId, Record<CategoryKey, string>>>;

export type StopPhase = 'PLAYING' | 'REVIEWING' | 'ROUND_RESULTS';

export interface StopGameState {
  selectedCats: CategoryKey[];
  currentLetter: string;
  currentRound: number;
  totalRounds: number;
  roundMinutes: number;
  players: PlayerMap<StopPlayer>;
  
  // Game Phase
  phase: StopPhase;
  turnEndTime: number; // For PLAYING phase global timer
  
  // Voting Phase State
  allAnswers: Record<string, Record<CategoryKey, string>>; // playerId -> category -> word
  currentReviewCategoryIndex: number;
  categoryVotes: Record<string, Record<string, VoteValue>>; // voterId -> targetId -> vote
  categoryResolutions?: Record<string, { result: VoteValue; points: number }>; // targetId -> result
  isTieWarning: boolean;
  
  // Round Results Phase
  roundPoints?: Record<string, number>; // playerId -> points earned this round
}

// Payload sent to all clients to show a review category
export interface StopReviewCategoryPayload {
  cat: CategoryKey;
  catIndex: number;
  totalCats: number;
  allAnswers: Record<PlayerId, Record<CategoryKey, string>>;
}

// Payload when the host resolves a category
export interface StopCatResolvedPayload {
  resolution?: CategoryResolution;
  removeWarning?: boolean;
}

// Payload for round results
export interface StopRoundResultsPayload {
  roundPoints: Record<PlayerId, number>;
  players: PlayerMap<StopPlayer>;
}

// Payload for STOP trigger
export interface StopTriggerPayload {
  triggeredBy: PlayerId | 'time';
}

export interface StopSubmitAnswersPayload {
  id: PlayerId;
  answers: Record<CategoryKey, string>;
}

// Payload for vote cast by a guest
export interface StopVotePayload {
  voterId: PlayerId;
  targetId: PlayerId;
  vote: VoteValue;
}

export interface StopVotesSyncPayload {
  votes: Record<PlayerId, Record<PlayerId, VoteValue>>;
}

// App-level view enum for STOP flow
export type StopView =
  | 'config'
  | 'lobby'
  | 'profile'
  | 'countdown'
  | 'game'
  | 'review'
  | 'gameover';
