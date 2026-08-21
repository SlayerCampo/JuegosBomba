// ================================================================
// PALABRAS BOMBA — Game State Types
// ================================================================

import type { PalabrasPlayer, PlayerMap, PlayerId } from './player';

export type GameMode = 'easy' | 'normal' | 'hardcore';
export type LetterMode = 'por-ronda' | 'por-turno';

// ── State machine ────────────────────────────────────────────────

/**
 * The five phases of every turn.
 * All clients derive their UI exclusively from this value — no loose boolean flags.
 *
 *  TRANSITION_OUT  →  shows the previous turn's result (2.5s sync-buffer window)
 *  TRANSITION_IN   →  shows "Turno de X" + 3-2-1 countdown (3s)
 *  ACTIVE          →  timer running, input enabled
 *  MERCY           →  post-game-over: winner decides whether to grant piedad
 *  GAME_OVER       →  navigation to final podium (only reached after mercy resolves)
 */
export type TurnPhase = 'transition_out' | 'transition_in' | 'active' | 'mercy' | 'game_over';

/** Outcome of the most recently completed turn. Drives the TRANSITION_OUT overlay. */
export type TurnResult = 'success' | 'miracle' | 'boom';

// ── Config ────────────────────────────────────────────────────────

export interface GameModeConfig {
  label: string;
  description: string;
  /**
   * Per-difficulty-bucket time limits (seconds).
   * Bucket 0 → rounds 1-2  |  Bucket 1 → rounds 3-4  |  Bucket 2 → rounds 5+
   */
  roundTimes: [number, number, number];
}

// ── History ───────────────────────────────────────────────────────

/** One entry per (round, letter) combination in the word history. */
export interface WordHistoryEntry {
  round: number;
  letter: string;
  words: Record<PlayerId, string>;
}

// ── Authoritative game state ──────────────────────────────────────

/**
 * The single authoritative state for a Palabras Bomba session.
 *
 * Design principles:
 *  • Every turn transition broadcasts a FULL TurnState — never a diff.
 *    This makes desync impossible; applying a new state is always safe.
 *  • `turnStartTime` and `turnEndTime` are absolute epoch timestamps so every
 *    client derives the same phase schedule without clock-sync messages.
 *  • `lastResult` / `lastWord` / `lastPlayedBy` / `lastLoser` give the
 *    TRANSITION_OUT overlay all the data it needs without extra messages.
 *  • `mercyUsed` / `isFinalMercyRound` control the Piedad endgame flow.
 */
export interface TurnState {
  mode: GameMode;
  letterMode: LetterMode;
  round: number;
  turnCount: number;
  currentLetter: string;
  activePlayer: PlayerId;
  activePlayerIndex: number;
  playerOrder: PlayerId[];
  players: PlayerMap<PalabrasPlayer>;

  /** Absolute epoch ms when the ACTIVE phase begins (timer starts ticking). */
  turnStartTime: number;
  /** Absolute epoch ms when the timer expires. */
  turnEndTime: number;

  wordHistory: WordHistoryEntry[];
  eliminationOrder: PlayerId[];

  /** True once ≤ 1 player remains alive. Triggers game-over / mercy flow. */
  isGameOver?: boolean;

  // ── Mercy (Piedad) fields ────────────────────────────────────────
  /**
   * True once the mercy round has been used.
   * Carried forward on every TurnState spread so the winner cannot be
   * offered mercy a second time during the same session.
   */
  mercyUsed?: boolean;

  /**
   * Set to `true` when mercy is accepted and the game resumes.
   * When this flag is true and the game ends again, the podium is shown
   * immediately — no further mercy is possible.
   */
  isFinalMercyRound?: boolean;

  // ── Previous-turn metadata (drives TRANSITION_OUT overlay) ──────
  lastResult?: TurnResult;
  lastWord?: string;
  /** Who successfully played the last word (success / miracle). */
  lastPlayedBy?: PlayerId;
  /** Who lost their life last turn (boom). */
  lastLoser?: PlayerId;
}

// ── Backward-compatible alias ─────────────────────────────────────

/**
 * All existing views reading `gameState: PalabrasGameState` continue
 * to compile without changes — TurnState is a strict superset.
 */
export type PalabrasGameState = TurnState;

// ── Wire payloads ─────────────────────────────────────────────────

/** Sent by the active client for WORD_SUBMIT / WORD_SUBMIT_MIRACLE. */
export interface WordSubmitPayload {
  word: string;
  /**
   * `Date.now()` on the active client at the moment of submission.
   * The host uses this for the Active Player Authority check:
   * if timestamp ≤ turnEndTime + grace, the word is accepted even if the
   * host receives it slightly after its own deadline.
   */
  timestamp: number;
}

/** Sent by the active client for TIME_OUT. */
export interface TimeOutPayload {
  timestamp: number;
}

// ── Legacy aliases (kept for any lingering type references) ────────
export type StartGamePayload     = TurnState;
export type WordValidatedPayload = TurnState;
export type BoomPayload          = TurnState;

// ── View routing ──────────────────────────────────────────────────
export type PalabrasView =
  | 'config'
  | 'lobby'
  | 'profile'
  | 'countdown'
  | 'game'
  | 'gameover';
