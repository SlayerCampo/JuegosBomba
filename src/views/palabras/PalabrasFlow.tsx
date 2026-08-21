/**
 * PalabrasFlow — v2.1
 *
 * ── P2P Message Protocol ──────────────────────────────────────────
 *
 *  Lobby:
 *    CLIENT_CONNECTED   host←  peer joined
 *    PROFILE_READY      host←  guest sent their profile
 *    LOBBY_STATE        host→  broadcast updated lobby
 *
 *  Game lifecycle:
 *    START_GAME         host→  full TurnState for turn 1
 *    WORD_VALIDATED     host→  full TurnState after a successful word
 *    BOOM               host→  full TurnState after a timeout / invalid
 *    GAME_OVER          host→  signals navigation to podium
 *
 *  Active-player → host:
 *    WORD_SUBMIT        { word, timestamp }
 *    WORD_SUBMIT_MIRACLE{ word, timestamp }
 *    TIME_OUT           { timestamp }
 *
 *  Mercy (Piedad):
 *    MERCY_ACCEPT       winner→host   winner viewed ad, grant mercy
 *    MERCY_DECLINE      winner→host   winner chose to end the game
 *    MERCY_ROUND_START  host→all      new TurnState for the mercy round
 *
 *  Keystroke spectating:
 *    KEYSTROKE_SYNC     { input, playerId }  live typing relay
 *
 *  Connection:
 *    CLIENT_DISCONNECTED host←  guest closed tab
 *    DISCONNECTED        guest← lost connection to host
 */

import {
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { AppView } from '@/types/appView';
import type { PeerMessage } from '@/types/network';
import type {
  TurnState,
  GameMode,
  LetterMode,
  WordSubmitPayload,
  TimeOutPayload,
} from '@/types/palabras';
import type { PlayerProfile, PalabrasPlayer, PlayerMap } from '@/types/player';
import { NetworkProvider, useNetwork } from '@/context/NetworkContext';
import {
  usePalabrasGameState,
  TRANSITION_OUT_MS,
} from '@/hooks/usePalabrasGameState';
import { useAppContext }  from '@/context/AppContext';
import { useDictionary }  from '@/hooks/useDictionary';
import { normalizeText }  from '@/utils/textUtils';

// Views
import { PalabrasConfigView }    from './PalabrasConfigView';
import { PalabrasLobbyView }     from './PalabrasLobbyView';
import { PalabrasProfileView }   from './PalabrasProfileView';
import { PalabrasCountdownView } from './PalabrasCountdownView';
import { PalabrasGameView }      from './PalabrasGameView';
import { PalabrasGameOverView }  from './PalabrasGameOverView';

// ════════════════════════════════════════════════════════════════
// Flow context
// ════════════════════════════════════════════════════════════════

interface PalabrasFlowContextValue {
  // ── Pre-game ──────────────────────────────────────────────────
  gameMode: GameMode | null;
  setGameMode: (mode: GameMode | null) => void;
  targetRoomCode: string | null;
  setTargetRoomCode: (code: string | null) => void;
  isHostIntent: boolean;
  setIsHostIntent: (isHost: boolean) => void;
  lobbyPlayers: Record<string, PlayerProfile>;
  setLobbyPlayers: Dispatch<SetStateAction<Record<string, PlayerProfile>>>;
  myProfile: { name: string; emoji: string } | null;
  setMyProfile: (p: { name: string; emoji: string } | null) => void;

  letterMode: LetterMode;
  setLetterMode: (mode: LetterMode) => void;

  // ── Game ──────────────────────────────────────────────────────
  gameState: TurnState | null;
  startGameAsHost: (mode: GameMode, letterMode: LetterMode) => void;

  // ── In-turn actions ───────────────────────────────────────────
  submitWord: (word: string, isMiracle?: boolean) => void;
  submitTimeOut: () => void;
  broadcastKeystroke: (input: string) => void;
  remoteInput: string;

  // ── Mercy (Piedad) actions ────────────────────────────────────
  /**
   * Called by the winner after the rewarded ad completes.
   * Triggers the host to build a mercy round and broadcast MERCY_ROUND_START.
   *
   * Implementation note: the caller (PalabrasGameView) is responsible for
   * playing the ad via `playMercyAd()` BEFORE invoking this function.
   * This keeps the ad logic co-located with the UI that drives it.
   */
  requestMercy: () => void;

  /**
   * Called when the winner declines to show mercy.
   * Navigates everyone to the final podium.
   */
  declineMercy: () => void;
}

const PalabrasFlowContext = createContext<PalabrasFlowContextValue | null>(null);

export function usePalabrasFlow() {
  const ctx = useContext(PalabrasFlowContext);
  if (!ctx) throw new Error('usePalabrasFlow must be used within PalabrasFlow');
  return ctx;
}

// ════════════════════════════════════════════════════════════════
// Inner component
// ════════════════════════════════════════════════════════════════

interface PalabrasFlowProps {
  view: AppView;
  handlerRef: React.MutableRefObject<(msg: PeerMessage) => void>;
}

export function PalabrasFlowInner({ view, handlerRef }: PalabrasFlowProps) {
  const { navigate }           = useAppContext();
  const { isHost, send, myId } = useNetwork();
  const { availableLetters, checkWord, markWordUsed, clearUsedWords } = useDictionary();

  const [gameMode,       setGameMode]       = useState<GameMode | null>(null);
  const [targetRoomCode, setTargetRoomCode] = useState<string | null>(null);
  const [isHostIntent,   setIsHostIntent]   = useState(false);
  const [lobbyPlayers,   setLobbyPlayers]   = useState<Record<string, PlayerProfile>>({});
  const [myProfile,      setMyProfile]      = useState<{ name: string; emoji: string } | null>(null);
  const [letterMode,     setLetterMode]     = useState<LetterMode>('por-ronda');
  const [remoteInput,    setRemoteInput]    = useState('');

  const {
    gameState,
    stateRef,
    applyTurnState,
    initGameAsHost,
    hostProcessSubmission,
    hostProcessTimeout,
    hostProcessDisconnect,
    hostProcessMercyAccept,
  } = usePalabrasGameState();

  // ── Broadcast helper ──────────────────────────────────────────────
  /** Sends the result state, clears keystroke display, and handles game-over scheduling. */
  const broadcastResult = useCallback((next: TurnState, type: 'WORD_VALIDATED' | 'BOOM') => {
    send(type, next);
    setRemoteInput('');
    if (next.isGameOver) {
      // Clients are still in TRANSITION_OUT when this timer fires, so giving them
      // TRANSITION_OUT_MS to render the result before we signal the game-over.
      // Mercy logic is handled client-side after TRANSITION_OUT finishes.
      if (next.isFinalMercyRound || next.mercyUsed) {
        // Final game-over: no mercy possible. Navigate after transition.
        setTimeout(() => {
          send('GAME_OVER', next);
          navigate('palabras-gameover');
        }, TRANSITION_OUT_MS);
      }
      // If mercy IS available, we do NOT navigate yet.
      // PalabrasGameView will enter the 'mercy' phase after TRANSITION_OUT,
      // and requestMercy / declineMercy will drive the next transition.
    }
  }, [send, navigate]);

  // ── HOST: Start game ──────────────────────────────────────────────
  const startGameAsHost = useCallback((mode: GameMode, lm: LetterMode) => {
    if (!isHost) return;
    clearUsedWords();

    const players: PlayerMap<PalabrasPlayer> = {};
    Object.values(lobbyPlayers).forEach((p) => {
      players[p.id] = { ...p, lives: 3 };
    });

    const startPayload = initGameAsHost(mode, lm, players, availableLetters);
    send('START_GAME', startPayload);
    navigate('palabras-countdown');
  }, [isHost, lobbyPlayers, availableLetters, initGameAsHost, send, navigate, clearUsedWords]);

  // ── In-turn actions ───────────────────────────────────────────────

  const broadcastKeystroke = useCallback((input: string) => {
    if (!myId) return;
    send('KEYSTROKE_SYNC', { input, playerId: myId });
  }, [send, myId]);

  const submitWord = useCallback((word: string, isMiracle = false) => {
    if (isHost) {
      const next = hostProcessSubmission(word, Date.now(), isMiracle, availableLetters);
      if (!next) return;
      markWordUsed(word);
      broadcastResult(next, 'WORD_VALIDATED');
    } else {
      const payload: WordSubmitPayload = { word, timestamp: Date.now() };
      send(isMiracle ? 'WORD_SUBMIT_MIRACLE' : 'WORD_SUBMIT', payload);
    }
  }, [isHost, hostProcessSubmission, availableLetters, markWordUsed, broadcastResult, send]);

  const submitTimeOut = useCallback(() => {
    if (isHost) {
      const next = hostProcessTimeout(availableLetters);
      if (!next) return;
      broadcastResult(next, 'BOOM');
    } else {
      const payload: TimeOutPayload = { timestamp: Date.now() };
      send('TIME_OUT', payload);
    }
  }, [isHost, hostProcessTimeout, availableLetters, broadcastResult, send]);

  // ── Mercy actions ─────────────────────────────────────────────────

  /**
   * Called by the winner's UI AFTER the rewarded ad has finished playing.
   * (See playMercyAd() in PalabrasGameView for the ad mock.)
   *
   * If the winner IS the host: process directly.
   * If the winner is a guest: send MERCY_ACCEPT to host; host processes + broadcasts.
   */
  const requestMercy = useCallback(() => {
    if (isHost) {
      const next = hostProcessMercyAccept(availableLetters);
      if (!next) return;
      clearUsedWords();
      send('MERCY_ROUND_START', next);
      navigate('palabras-countdown');
    } else {
      send('MERCY_ACCEPT', null);
    }
  }, [isHost, hostProcessMercyAccept, availableLetters, send, navigate, clearUsedWords]);

  const declineMercy = useCallback(() => {
    const state = stateRef.current;
    if (isHost) {
      send('GAME_OVER', state);
      navigate('palabras-gameover');
    } else {
      send('MERCY_DECLINE', null);
    }
  }, [isHost, stateRef, send, navigate]);

  // ── Message handler ───────────────────────────────────────────────
  const handleMessage = useCallback((msg: PeerMessage) => {
    console.log('[PalabrasFlow] ←', msg.type);

    switch (msg.type) {

      case 'CLIENT_CONNECTED': {
        if (isHost) {
          const peerId = msg.payload as string;
          setLobbyPlayers((prev) => {
            send('LOBBY_STATE', prev, peerId);
            return prev;
          });
        }
        break;
      }

      case 'PROFILE_READY': {
        if (isHost) {
          const profile = msg.payload as PlayerProfile;
          setLobbyPlayers((prev) => {
            const next = { ...prev, [profile.id]: profile };
            send('LOBBY_STATE', next);
            return next;
          });
        }
        break;
      }

      case 'LOBBY_STATE': {
        if (!isHost) setLobbyPlayers(msg.payload as Record<string, PlayerProfile>);
        break;
      }

      case 'START_GAME': {
        if (!isHost) {
          clearUsedWords();
          applyTurnState(msg.payload as TurnState);
          navigate('palabras-countdown');
        }
        break;
      }

      case 'WORD_SUBMIT':
      case 'WORD_SUBMIT_MIRACLE': {
        if (!isHost) break;
        const { word, timestamp } = msg.payload as WordSubmitPayload;
        const isMiracle = msg.type === 'WORD_SUBMIT_MIRACLE';
        const state = stateRef.current;
        if (!state) break;

        const normalized = normalizeText(word);
        const required   = normalizeText(state.currentLetter);

        if (!normalized.startsWith(required) || !checkWord(normalized)) {
          const next = hostProcessTimeout(availableLetters);
          if (next) broadcastResult(next, 'BOOM');
          break;
        }

        const next = hostProcessSubmission(word, timestamp, isMiracle, availableLetters);
        if (!next) break;
        markWordUsed(normalized);
        broadcastResult(next, 'WORD_VALIDATED');
        break;
      }

      case 'TIME_OUT': {
        if (!isHost) break;
        const next = hostProcessTimeout(availableLetters);
        if (next) broadcastResult(next, 'BOOM');
        break;
      }

      case 'KEYSTROKE_SYNC': {
        const { input } = msg.payload as { input: string; playerId: string };
        if (isHost) {
          setRemoteInput(input);
          send('KEYSTROKE_SYNC', msg.payload);
        } else {
          setRemoteInput(input);
        }
        break;
      }

      case 'WORD_VALIDATED': {
        if (!isHost) {
          const next = msg.payload as TurnState;
          if (next.lastWord) markWordUsed(next.lastWord);
          applyTurnState(next);
          setRemoteInput('');
        }
        break;
      }

      case 'BOOM': {
        if (!isHost) {
          applyTurnState(msg.payload as TurnState);
          setRemoteInput('');
        }
        break;
      }

      case 'GAME_OVER': {
        // Both host and guest navigate; host already did so via its own timer,
        // this message ensures guests never get stuck on a mercy screen.
        navigate('palabras-gameover');
        break;
      }

      // ── Mercy protocol (host-side) ─────────────────────────────────
      case 'MERCY_ACCEPT': {
        if (!isHost) break;
        // Guest winner viewed the ad and accepted. Host builds the mercy round.
        const next = hostProcessMercyAccept(availableLetters);
        if (!next) break;
        clearUsedWords();
        send('MERCY_ROUND_START', next);
        navigate('palabras-countdown');
        break;
      }

      case 'MERCY_DECLINE': {
        if (!isHost) break;
        // Guest winner chose to end the game.
        send('GAME_OVER', stateRef.current);
        navigate('palabras-gameover');
        break;
      }

      case 'MERCY_ROUND_START': {
        // All non-host clients: apply the new mercy TurnState and start countdown.
        if (!isHost) {
          clearUsedWords();
          applyTurnState(msg.payload as TurnState);
          navigate('palabras-countdown');
        }
        break;
      }

      // ── Disconnections ─────────────────────────────────────────────
      case 'CLIENT_DISCONNECTED': {
        if (!isHost) break;
        const peerId = msg.payload as string;
        setLobbyPlayers((prev) => {
          const next = { ...prev };
          delete next[peerId];
          send('LOBBY_STATE', next);
          return next;
        });
        if (stateRef.current) {
          const next = hostProcessDisconnect(peerId, availableLetters);
          if (next) broadcastResult(next, 'BOOM');
        }
        break;
      }

      case 'DISCONNECTED': {
        if (!isHost) navigate('home');
        break;
      }
    }
  }, [
    isHost, send, navigate,
    applyTurnState, stateRef,
    checkWord, markWordUsed, clearUsedWords,
    hostProcessSubmission, hostProcessTimeout,
    hostProcessDisconnect, hostProcessMercyAccept,
    availableLetters, broadcastResult,
  ]);

  // ── View router ───────────────────────────────────────────────────
  function renderView() {
    switch (view) {
      case 'palabras-config':    return <PalabrasConfigView />;
      case 'palabras-profile':   return <PalabrasProfileView />;
      case 'palabras-lobby':     return <PalabrasLobbyView />;
      case 'palabras-countdown': return <PalabrasCountdownView />;
      case 'palabras-game':      return <PalabrasGameView />;
      case 'palabras-gameover':  return <PalabrasGameOverView />;
      default:                   return null;
    }
  }

  handlerRef.current = handleMessage;

  const contextValue: PalabrasFlowContextValue = {
    gameMode, setGameMode,
    targetRoomCode, setTargetRoomCode,
    isHostIntent, setIsHostIntent,
    lobbyPlayers, setLobbyPlayers,
    myProfile, setMyProfile,
    letterMode, setLetterMode,
    gameState,
    startGameAsHost,
    submitWord,
    submitTimeOut,
    broadcastKeystroke,
    remoteInput,
    requestMercy,
    declineMercy,
  };

  return (
    <PalabrasFlowContext.Provider value={contextValue}>
      {renderView()}
    </PalabrasFlowContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// Outer wrapper — owns NetworkProvider
// ════════════════════════════════════════════════════════════════

export function PalabrasFlow({ view }: { view: AppView }) {
  const handlerRef = useRef<(msg: PeerMessage) => void>(() => {});
  const stableOnMessage = useCallback((msg: PeerMessage) => {
    handlerRef.current(msg);
  }, []);

  return (
    <NetworkProvider onMessage={stableOnMessage}>
      <PalabrasFlowInner view={view} handlerRef={handlerRef} />
    </NetworkProvider>
  );
}
