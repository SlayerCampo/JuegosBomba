/**
 * usePalabrasGameState — v2.1
 *
 * HOST-SIDE game logic for Palabras Bomba. All computation is done here;
 * the results are broadcast as full TurnState snapshots by PalabrasFlow.
 *
 * ── Enforced rules ────────────────────────────────────────────────
 *
 *  1. LIVES (3 per player):
 *     `initGameAsHost` forces lives to 3.  Sudden death is achieved through
 *     the normal 3-damage model; players are eliminated at 0 lives.
 *     In the mercy round, defeated players respawn with 1 life;
 *     the winner gains a bonus life (can exceed 3, shown as "3+" in UI).
 *
 *  2. TURNS PER ROUND = numPlayers × 2:
 *     2 players → 4 turns/round.  3 players → 6 turns/round.
 *
 *  3. DIFFICULTY BUCKETS (every 2 rounds):
 *     Rounds 1-2 → [0]  |  Rounds 3-4 → [1]  |  5+ → [2]
 *
 *  4. ACTIVE PLAYER AUTHORITY:
 *     Submission timestamp from client ≤ turnEndTime + grace → accepted.
 *
 *  5. FULL-STATE BROADCASTS:
 *     Every exported function returns a complete TurnState. Never a diff.
 *
 *  6. MERCY (PIEDAD):
 *     `buildMercyRoundState` resets the game with the winner bonus-lifed
 *     and all defeated players at 1 life. Sets isFinalMercyRound = true so
 *     the next game-over goes straight to the podium with no second mercy.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  TurnState,
  GameMode,
  LetterMode,
  TurnResult,
  WordHistoryEntry,
} from '@/types/palabras';
import type { PlayerMap, PalabrasPlayer, PlayerId } from '@/types/player';
import { GAME_MODES } from '@/utils/gameModes';

// ════════════════════════════════════════════════════════════════
// Exported timing constants — consumed by PalabrasFlow & GameView
// ════════════════════════════════════════════════════════════════

/** Duration of the result overlay (TRANSITION_OUT phase), ms. */
export const TRANSITION_OUT_MS = 2_500;

/** Duration of the next-player countdown (TRANSITION_IN phase), ms. */
export const TRANSITION_IN_MS  = 3_000;

/** Clock-skew / RTT grace for Active Player Authority checks, ms. */
const ACTIVE_PLAYER_GRACE_MS   = 1_000;

// ════════════════════════════════════════════════════════════════
// Module-level pure helpers
// ════════════════════════════════════════════════════════════════

const DEFAULT_LETTERS = 'ABCDEFGHIJLMNOPQRSTUV'.split('');

function getTurnDuration(mode: GameMode, round: number): number {
  const config = GAME_MODES[mode] ?? GAME_MODES.normal;
  const idx = Math.min(Math.floor((round - 1) / 2), config.roundTimes.length - 1);
  return config.roundTimes[idx];
}

function getRandomLetter(availableLetters: string[], exclude?: string): string {
  const pool = availableLetters.length > 0 ? availableLetters : DEFAULT_LETTERS;
  let filtered = exclude ? pool.filter((l) => l !== exclude) : pool;
  if (filtered.length === 0) filtered = pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Starting from `fromIndex + 1`, finds the next player with lives > 0. */
function findNextAliveIndex(
  playerOrder: PlayerId[],
  players: PlayerMap<PalabrasPlayer>,
  fromIndex: number,
): number {
  const n = playerOrder.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (players[playerOrder[idx]].lives > 0) return idx;
  }
  return fromIndex;
}

function computeNextLetter(
  state: Pick<TurnState, 'letterMode' | 'currentLetter' | 'round'>,
  nextRound: number,
  availableLetters: string[],
): string {
  if (state.letterMode === 'por-turno' || nextRound > state.round) {
    return getRandomLetter(availableLetters, state.currentLetter);
  }
  return state.currentLetter;
}

/** 1 round = numPlayers × 2 turns. */
function computeRound(turnCount: number, numPlayers: number): number {
  const turnsPerRound = Math.max(1, numPlayers) * 2;
  return Math.ceil(turnCount / turnsPerRound);
}

function addWordToHistory(
  state: TurnState,
  playerId: PlayerId,
  word: string,
): WordHistoryEntry[] {
  const history = state.wordHistory.map((h) => ({ ...h, words: { ...h.words } }));
  let entry = history.find((h) => h.round === state.round && h.letter === state.currentLetter);
  if (!entry) {
    entry = { round: state.round, letter: state.currentLetter, words: {} };
    history.push(entry);
  }
  entry.words[playerId] = word;
  return history;
}

// ════════════════════════════════════════════════════════════════
// Pure state-builder functions (no React, no side effects)
// ════════════════════════════════════════════════════════════════

function buildSuccessState(
  state: TurnState,
  word: string,
  isMiracle: boolean,
  availableLetters: string[],
): TurnState {
  const wordHistory   = addWordToHistory(state, state.activePlayer, word);
  const nextTurnCount = state.turnCount + 1;
  const numPlayers    = state.playerOrder.length;
  const nextRound     = computeRound(nextTurnCount, numPlayers);
  const nextIdx       = findNextAliveIndex(state.playerOrder, state.players, state.activePlayerIndex);
  const nextLetter    = computeNextLetter(state, nextRound, availableLetters);
  const duration      = getTurnDuration(state.mode, nextRound);
  const now           = Date.now();
  const turnStartTime = now + TRANSITION_OUT_MS + TRANSITION_IN_MS;
  const turnEndTime   = turnStartTime + duration * 1_000;
  const result: TurnResult = isMiracle ? 'miracle' : 'success';

  return {
    ...state,                          // preserves mercyUsed, isFinalMercyRound, etc.
    round:             nextRound,
    turnCount:         nextTurnCount,
    currentLetter:     nextLetter,
    activePlayer:      state.playerOrder[nextIdx],
    activePlayerIndex: nextIdx,
    turnStartTime,
    turnEndTime,
    wordHistory,
    isGameOver:   false,
    lastResult:   result,
    lastWord:     word,
    lastPlayedBy: state.activePlayer,
    lastLoser:    undefined,
  };
}

function buildBoomState(
  state: TurnState,
  availableLetters: string[],
): TurnState {
  const loserId = state.activePlayer;

  const players: PlayerMap<PalabrasPlayer> = { ...state.players };
  players[loserId] = {
    ...players[loserId],
    lives: Math.max(0, players[loserId].lives - 1),
  };

  const wordHistory = addWordToHistory(state, loserId, '💥 BOOM');

  const eliminationOrder = [...state.eliminationOrder];
  if (players[loserId].lives === 0 && !eliminationOrder.includes(loserId)) {
    eliminationOrder.unshift(loserId);
  }

  const alivePlayers = state.playerOrder.filter((id) => players[id].lives > 0);
  const isGameOver   = alivePlayers.length <= 1;

  if (isGameOver) {
    return {
      ...state,
      players,
      eliminationOrder,
      wordHistory,
      isGameOver:   true,
      lastResult:   'boom',
      lastLoser:    loserId,
      lastPlayedBy: undefined,
      lastWord:     undefined,
    };
  }

  const nextTurnCount = state.turnCount + 1;
  const numPlayers    = state.playerOrder.length;
  const nextRound     = computeRound(nextTurnCount, numPlayers);
  const nextIdx       = findNextAliveIndex(state.playerOrder, players, state.activePlayerIndex);
  const nextLetter    = computeNextLetter(state, nextRound, availableLetters);
  const duration      = getTurnDuration(state.mode, nextRound);
  const now           = Date.now();
  const turnStartTime = now + TRANSITION_OUT_MS + TRANSITION_IN_MS;
  const turnEndTime   = turnStartTime + duration * 1_000;

  return {
    ...state,
    players,
    eliminationOrder,
    wordHistory,
    round:             nextRound,
    turnCount:         nextTurnCount,
    currentLetter:     nextLetter,
    activePlayer:      state.playerOrder[nextIdx],
    activePlayerIndex: nextIdx,
    turnStartTime,
    turnEndTime,
    isGameOver:   false,
    lastResult:   'boom',
    lastLoser:    loserId,
    lastPlayedBy: undefined,
    lastWord:     undefined,
  };
}

function buildDisconnectState(
  state: TurnState,
  peerId: PlayerId,
  availableLetters: string[],
): TurnState {
  const players: PlayerMap<PalabrasPlayer> = { ...state.players };
  players[peerId] = { ...players[peerId], lives: 0 };

  const eliminationOrder = [...state.eliminationOrder];
  if (!eliminationOrder.includes(peerId)) eliminationOrder.unshift(peerId);

  const alivePlayers = state.playerOrder.filter((id) => players[id].lives > 0);
  const isGameOver   = alivePlayers.length <= 1;

  if (isGameOver) {
    return {
      ...state,
      players,
      eliminationOrder,
      isGameOver:   true,
      lastResult:   'boom',
      lastLoser:    peerId,
      lastPlayedBy: undefined,
      lastWord:     undefined,
    };
  }

  let nextTurnCount   = state.turnCount;
  let nextActiveIndex = state.activePlayerIndex;

  if (state.activePlayer === peerId) {
    nextTurnCount   = state.turnCount + 1;
    nextActiveIndex = findNextAliveIndex(state.playerOrder, players, state.activePlayerIndex);
  }

  const numPlayers    = state.playerOrder.length;
  const nextRound     = computeRound(nextTurnCount, numPlayers);
  const nextLetter    = computeNextLetter(state, nextRound, availableLetters);
  const duration      = getTurnDuration(state.mode, nextRound);
  const now           = Date.now();
  const turnStartTime = now + TRANSITION_OUT_MS + TRANSITION_IN_MS;
  const turnEndTime   = turnStartTime + duration * 1_000;

  return {
    ...state,
    players,
    eliminationOrder,
    turnCount:         nextTurnCount,
    round:             nextRound,
    currentLetter:     nextLetter,
    activePlayer:      state.playerOrder[nextActiveIndex],
    activePlayerIndex: nextActiveIndex,
    turnStartTime,
    turnEndTime,
    isGameOver:   false,
    lastResult:   'boom',
    lastLoser:    peerId,
    lastPlayedBy: undefined,
    lastWord:     undefined,
  };
}

/**
 * MERCY (PIEDAD) round builder.
 *
 * Called by the host after the winner accepts the mercy offer (ad viewed).
 *
 * Respawn rules:
 *  • All defeated players  → lives = 1
 *  • Winner                → lives += 1  (can exceed 3; UI shows as "3+")
 *  • isFinalMercyRound     → true  (disables further mercy)
 *  • mercyUsed             → true
 *  • Resets round, turnCount, eliminationOrder, wordHistory (fresh match)
 */
function buildMercyRoundState(
  state: TurnState,
  availableLetters: string[],
): TurnState {
  // Identify the last survivor (winner)
  const winnerId = state.playerOrder.find((id) => state.players[id].lives > 0);

  const players: PlayerMap<PalabrasPlayer> = {};
  for (const id of state.playerOrder) {
    if (id === winnerId) {
      // Bonus life for the winner — no hard cap, UI handles "3+" display
      players[id] = { ...state.players[id], lives: state.players[id].lives + 1 };
    } else {
      // Defeated players respawn with exactly 1 life
      players[id] = { ...state.players[id], lives: 1 };
    }
  }

  const turnStartTime = Date.now() + TRANSITION_IN_MS;
  const duration      = getTurnDuration(state.mode, 1); // restart from round 1 timing
  const turnEndTime   = turnStartTime + duration * 1_000;

  return {
    ...state,
    players,
    round:             1,
    turnCount:         1,
    currentLetter:     getRandomLetter(availableLetters, state.currentLetter),
    activePlayer:      state.playerOrder[0],
    activePlayerIndex: 0,
    turnStartTime,
    turnEndTime,
    eliminationOrder:  [],
    wordHistory:       [],
    isGameOver:        false,
    isFinalMercyRound: true,
    mercyUsed:         true,
    lastResult:        undefined,
    lastWord:          undefined,
    lastPlayedBy:      undefined,
    lastLoser:         undefined,
  };
}

// ════════════════════════════════════════════════════════════════
// React hook
// ════════════════════════════════════════════════════════════════

export function usePalabrasGameState() {
  const [gameState, setGameState] = useState<TurnState | null>(null);

  const stateRef = useRef<TurnState | null>(null);

  const applyTurnState = useCallback((state: TurnState) => {
    stateRef.current = state;
    setGameState(state);
  }, []);

  // ── HOST: Initialize ─────────────────────────────────────────────
  const initGameAsHost = useCallback(
    (
      mode: GameMode,
      letterMode: LetterMode,
      players: PlayerMap<PalabrasPlayer>,
      availableLetters: string[],
    ): TurnState => {
      const playerOrder = Object.keys(players);

      // RULE: 3 lives per player at match start.
      const readyPlayers: PlayerMap<PalabrasPlayer> = {};
      for (const id of playerOrder) {
        readyPlayers[id] = { ...players[id], lives: 3 };
      }

      const turnStartTime = Date.now() + TRANSITION_IN_MS;
      const duration      = getTurnDuration(mode, 1);
      const turnEndTime   = turnStartTime + duration * 1_000;

      const initial: TurnState = {
        mode,
        letterMode,
        round:             1,
        turnCount:         1,
        currentLetter:     getRandomLetter(availableLetters),
        activePlayer:      playerOrder[0],
        activePlayerIndex: 0,
        playerOrder,
        players:           readyPlayers,
        turnStartTime,
        turnEndTime,
        wordHistory:       [],
        eliminationOrder:  [],
        isGameOver:        false,
        mercyUsed:         false,
        isFinalMercyRound: false,
      };

      applyTurnState(initial);
      return initial;
    },
    [applyTurnState],
  );

  // ── HOST: Process a valid word submission ─────────────────────────
  const hostProcessSubmission = useCallback(
    (
      word: string,
      timestamp: number,
      isMiracle: boolean,
      availableLetters: string[],
    ): TurnState | null => {
      const state = stateRef.current;
      if (!state) return null;

      if (timestamp > state.turnEndTime + ACTIVE_PLAYER_GRACE_MS) {
        const next = buildBoomState(state, availableLetters);
        applyTurnState(next);
        return next;
      }

      const next = buildSuccessState(state, word, isMiracle, availableLetters);
      applyTurnState(next);
      return next;
    },
    [applyTurnState],
  );

  // ── HOST: Process a timer expiry ──────────────────────────────────
  const hostProcessTimeout = useCallback(
    (availableLetters: string[]): TurnState | null => {
      const state = stateRef.current;
      if (!state) return null;
      const next = buildBoomState(state, availableLetters);
      applyTurnState(next);
      return next;
    },
    [applyTurnState],
  );

  // ── HOST: Handle disconnection mid-game ───────────────────────────
  const hostProcessDisconnect = useCallback(
    (peerId: PlayerId, availableLetters: string[]): TurnState | null => {
      const state = stateRef.current;
      if (!state || !state.players[peerId]) return null;
      const next = buildDisconnectState(state, peerId, availableLetters);
      applyTurnState(next);
      return next;
    },
    [applyTurnState],
  );

  // ── HOST: Accept mercy offer and build the mercy round ───────────
  /**
   * Called after the winner has viewed the rewarded ad.
   * Returns a fresh TurnState with isFinalMercyRound = true and respawned lives.
   */
  const hostProcessMercyAccept = useCallback(
    (availableLetters: string[]): TurnState | null => {
      const state = stateRef.current;
      if (!state) return null;
      const next = buildMercyRoundState(state, availableLetters);
      applyTurnState(next);
      return next;
    },
    [applyTurnState],
  );

  return {
    gameState,
    stateRef,
    applyTurnState,
    initGameAsHost,
    hostProcessSubmission,
    hostProcessTimeout,
    hostProcessDisconnect,
    hostProcessMercyAccept,
  };
}
