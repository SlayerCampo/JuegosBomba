/**
 * PalabrasGameView — v2.1
 *
 * ── Phase machine ──────────────────────────────────────────────────
 *
 *  TRANSITION_OUT (2.5 s)
 *    Displays the previous turn's result. Shared sync-buffer window.
 *    If the game just ended:
 *      → mercy available:  transitions to MERCY phase
 *      → no more mercy:    navigates to the final podium
 *
 *  TRANSITION_IN (3 s)
 *    Shows next player + letter + 3-2-1 countdown.
 *
 *  ACTIVE
 *    Timer running. Input enabled for the active player.
 *
 *  MERCY
 *    Post-game overlay. Winner sees offer; spectators see waiting screen.
 *    Resolved by requestMercy() / declineMercy() from context.
 *
 * ── Mobile keyboard-safe layout ────────────────────────────────────
 *
 *  Goal: ALL game elements (Header, Fuse, Letter, Input, Verify) MUST
 *  be visible in the top ~60% of the screen so the keyboard (bottom 40%)
 *  never covers them.
 *
 *  Strategy:
 *   • The game content div uses compact sizing and minimal gaps so its
 *     total height stays ≤ 350px (fits within 60% of a 580px+ screen).
 *   • `padding-bottom: 58px` on the content div reserves space for the ad banner.
 *   • The ad banner uses `position: fixed; bottom: 0` so it follows the
 *     visual viewport. On Android Chrome the visual viewport shrinks when
 *     the keyboard opens → the banner moves up to sit just above the keyboard.
 *     On iOS Safari, fixed elements don't automatically move with the keyboard;
 *     see the TODO comment in AdBanner for the Visual Viewport API workaround.
 *
 * ── Mercy / Piedad flow ────────────────────────────────────────────
 *
 *  1. isGameOver fires → TRANSITION_OUT plays for 2.5s.
 *  2a. If !mercyUsed && !isFinalMercyRound:
 *       phase → 'mercy' → winner sees MercyOfferOverlay.
 *       Others see MercyWaitingOverlay.
 *  2b. Otherwise: navigate to palabras-gameover.
 *
 *  3. Winner clicks "Dar Piedad":
 *       playMercyAd() → 3s mock delay (replace with real ad SDK).
 *       After ad: requestMercy() → host broadcasts MERCY_ROUND_START.
 *  4. Winner clicks "Terminar Partida":
 *       declineMercy() → host broadcasts GAME_OVER.
 */

import { useEffect, useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAppContext }   from '@/context/AppContext';
import { usePalabrasFlow } from './PalabrasFlow';
import { useNetwork }      from '@/context/NetworkContext';
import { useDictionary }   from '@/hooks/useDictionary';
import { useGameTimer }    from '@/hooks/useGameTimer';
import { normalizeText }   from '@/utils/textUtils';
import type { TurnPhase, TurnResult } from '@/types/palabras';
import type { PalabrasPlayer } from '@/types/player';
import { TRANSITION_OUT_MS, TRANSITION_IN_MS } from '@/hooks/usePalabrasGameState';

// ════════════════════════════════════════════════════════════════
// Ad mock — replace internals with real SDK when ready
// ════════════════════════════════════════════════════════════════

/**
 * Plays a rewarded video ad before granting mercy.
 *
 * @returns A Promise that resolves when the ad has completed (or failed).
 *
 * TODO: Replace the mock body with your real ad SDK call. Examples:
 *
 *   // Google AdSense / Ad Manager (web):
 *   // return new Promise(resolve => window.googletag.pubads().addEventListener('rewardedSlotClosed', resolve));
 *
 *   // IronSource (Cordova / Capacitor):
 *   // return IronSource.showRewardedVideo();
 *
 *   // AdMob (Capacitor plugin):
 *   // await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-xxx/yyy' });
 *   // return AdMob.showRewardVideoAd();
 */
async function playMercyAd(): Promise<void> {
  // MOCK: Simulates a 3-second ad experience.
  // Replace this line with your real ad SDK call.
  return new Promise<void>((resolve) => setTimeout(resolve, 3_000));
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

/** Shows up to 3 hearts. Mercy bonus (lives > 3) renders as "❤️❤️❤️+N". */
function livesDisplay(lives: number): string {
  const BASE = 3;
  if (lives > BASE) {
    return '❤️'.repeat(BASE) + `+${lives - BASE}`;
  }
  const filled = Math.max(0, lives);
  const empty  = Math.max(0, BASE - lives);
  return '❤️'.repeat(filled) + '🖤'.repeat(empty);
}

// ════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════

export function PalabrasGameView() {
  const { navigate } = useAppContext();
  const {
    gameState,
    submitWord,
    submitTimeOut,
    remoteInput,
    broadcastKeystroke,
    requestMercy,
    declineMercy,
  } = usePalabrasFlow();
  const { myId }                               = useNetwork();
  const { checkWord, isWordUsed, markWordUsed } = useDictionary();
  const timer                                  = useGameTimer();

  // ── Local UI state ─────────────────────────────────────────────
  const [phase,          setPhase]          = useState<TurnPhase>('transition_in');
  const [inputVal,       setInputVal]       = useState('');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [countdownNum,   setCountdownNum]   = useState(3);
  const [isAdPlaying,    setIsAdPlaying]    = useState(false);

  const inputRef       = useRef<HTMLInputElement>(null);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSubmittedRef = useRef(false);

  // ── Derivations ────────────────────────────────────────────────
  const myPlayerId   = myId ?? 'host';
  const activePlayer = gameState?.players[gameState.activePlayer];
  const amIActive    = myPlayerId === gameState?.activePlayer;
  const myPlayer     = gameState?.players[myPlayerId];
  const totalPlayers = Object.keys(gameState?.players ?? {}).length;

  // Winner = the last player with lives > 0 when isGameOver
  const winnerId  = gameState?.isGameOver
    ? gameState.playerOrder.find((id) => gameState.players[id].lives > 0)
    : undefined;
  const amIWinner = !!winnerId && winnerId === myPlayerId;
  const winnerPlayer = winnerId ? gameState?.players[winnerId] : undefined;

  const mercyAvailable =
    !!gameState?.isGameOver &&
    !gameState?.mercyUsed &&
    !gameState?.isFinalMercyRound;

  // ════════════════════════════════════════════════════════════════
  // Phase machine
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!gameState) return;

    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
    timer.stop();
    hasSubmittedRef.current = false;

    const { turnStartTime, turnEndTime } = gameState;
    const transitionInAt = turnStartTime - TRANSITION_IN_MS;

    // ── GAME OVER ──────────────────────────────────────────────
    if (gameState.isGameOver) {
      setPhase('transition_out');
      const t = setTimeout(() => {
        if (mercyAvailable) {
          setPhase('mercy');
        } else {
          // isFinalMercyRound or mercyUsed — go straight to podium.
          // PalabrasFlow will also send GAME_OVER; this is a local guard.
          navigate('palabras-gameover');
        }
      }, TRANSITION_OUT_MS);
      phaseTimersRef.current.push(t);
      return;
    }

    // ── Normal turn ────────────────────────────────────────────
    const startActive = () => {
      setPhase('active');
      setInputVal('');
      setErrorMsg('');
      hasSubmittedRef.current = false;
      const durationSec = (turnEndTime - turnStartTime) / 1_000;
      timer.start(turnEndTime, durationSec);
      if (amIActive) setTimeout(() => inputRef.current?.focus(), 80);
    };

    const scheduleCountdownTicks = (offsetMs: number) => {
      for (let n = 3; n >= 1; n--) {
        const delay = offsetMs + (3 - n) * 1_000;
        const t = setTimeout(() => setCountdownNum(n), delay);
        phaseTimersRef.current.push(t);
      }
    };

    const now = Date.now();

    if (now >= turnStartTime) {
      startActive();
    } else if (now >= transitionInAt) {
      setPhase('transition_in');
      setCountdownNum(Math.max(1, Math.ceil((turnStartTime - now) / 1_000)));
      const t = setTimeout(startActive, turnStartTime - now);
      phaseTimersRef.current.push(t);
    } else {
      setPhase('transition_out');
      const t1 = setTimeout(() => {
        setPhase('transition_in');
        setCountdownNum(3);
      }, transitionInAt - now);
      scheduleCountdownTicks(transitionInAt - now);
      const t2 = setTimeout(startActive, turnStartTime - now);
      phaseTimersRef.current.push(t1, t2);
    }

    return () => {
      phaseTimersRef.current.forEach(clearTimeout);
      phaseTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnStartTime, gameState?.isGameOver]);

  // ════════════════════════════════════════════════════════════════
  // Timer expiry — Active Player Authority
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!timer.isExpired || !amIActive || phase !== 'active' || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    timer.stop();

    const word     = normalizeText(inputVal);
    const required = normalizeText(gameState!.currentLetter);
    const isMiracleWord =
      word.length > 0 &&
      word.startsWith(required) &&
      checkWord(word) &&
      !isWordUsed(word);

    if (isMiracleWord) {
      markWordUsed(word);
      submitWord(word, true);
    } else {
      submitTimeOut();
    }

    setPhase('transition_out');
    broadcastKeystroke('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isExpired]);

  // ════════════════════════════════════════════════════════════════
  // Mercy action handlers
  // ════════════════════════════════════════════════════════════════

  const handleMercyAccepted = async () => {
    if (isAdPlaying) return;
    setIsAdPlaying(true);
    try {
      await playMercyAd(); // waits for the ad (mock: 3s)
    } finally {
      setIsAdPlaying(false);
    }
    // After ad completes, tell the host to start the mercy round.
    // requestMercy() in PalabrasFlow sends MERCY_ACCEPT (guest) or
    // directly broadcasts MERCY_ROUND_START (host).
    requestMercy();
  };

  const handleMercyDeclined = () => {
    declineMercy();
  };

  // ════════════════════════════════════════════════════════════════
  // Input handlers
  // ════════════════════════════════════════════════════════════════

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    setErrorMsg('');
    if (amIActive) broadcastKeystroke(val);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!amIActive || phase !== 'active' || !gameState || hasSubmittedRef.current) return;

    const word     = normalizeText(inputVal);
    const required = normalizeText(gameState.currentLetter);

    if (!word)                    { setErrorMsg('Escribe una palabra.');                              return; }
    if (!word.startsWith(required)){ setErrorMsg(`¡Debe empezar con "${gameState.currentLetter}"!`); return; }
    if (isWordUsed(word))          { setErrorMsg('¡Esa palabra ya fue usada!');                       return; }
    if (!checkWord(word))          { setErrorMsg('¡Esa palabra no existe en el diccionario!');        return; }

    hasSubmittedRef.current = true;
    markWordUsed(word);
    setErrorMsg('');
    submitWord(word, false);
    setInputVal('');
    setPhase('transition_out');
    timer.stop();
    broadcastKeystroke('');
  };

  // ── Render guard ────────────────────────────────────────────────
  if (!gameState || !activePlayer || !myPlayer) return null;

  const isTimeLow = timer.timeLeft < 3 && phase === 'active';

  // ════════════════════════════════════════════════════════════════
  // Render
  //
  // Layout contract:
  //  • Outer div: flex column, gap-1, padding-bottom 58px (ad banner reserve)
  //  • All game elements are compact so total height ≤ ~350px.
  //    This keeps everything in the top ~60% of the screen even when the
  //    mobile keyboard (bottom ~40%) is open.
  //  • Ad banner: position:fixed bottom:0 (visual viewport, above keyboard
  //    on Android; see AdBannerPlaceholder comment for iOS note).
  // ════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          GAME CONTENT — all elements must stay in the top 60% of the
          visible viewport so the keyboard never obscures them.
          padding-bottom reserves 58px for the ad banner below.
      ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full flex flex-col gap-1" style={{ paddingBottom: '58px' }}>

        {/* ── PLAYER HEADER ── */}
        {renderHeader({ gameState, myPlayerId, totalPlayers, activePlayer })}

        {/* ── BOMB + FUSE + TIMER ── */}
        <div className="flex flex-col items-center gap-1 py-0.5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Ronda {gameState.round}
            {gameState.isFinalMercyRound && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: 'var(--color-primary)', color: 'white' }}
              >
                ⚡ FINAL
              </span>
            )}
          </p>

          <div
            className={[
              'text-5xl leading-none select-none transition-transform duration-75',
              phase === 'transition_out' && gameState.lastResult === 'boom'
                ? 'scale-150 animate-ping'
                : '',
              isTimeLow ? 'animate-pulse' : '',
            ].join(' ')}
          >
            {phase === 'transition_out' && gameState.lastResult === 'boom' ? '💥' : '💣'}
          </div>

          {/* Fuse bar */}
          <div
            className="w-full max-w-[260px] h-2.5 rounded-full overflow-hidden relative"
            style={{ background: 'rgba(55,65,81,0.6)', boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}
          >
            <div
              className="h-full absolute top-0 left-0"
              style={{
                width: `${(1 - timer.progress) * 100}%`,
                background: isTimeLow
                  ? 'linear-gradient(90deg, #dc2626, #f97316)'
                  : 'linear-gradient(90deg, #ef4444, #fb923c)',
                transition: 'width 100ms linear',
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 text-[9px]"
              style={{
                left: `clamp(0px, calc(${(1 - timer.progress) * 100}% - 9px), calc(100% - 9px))`,
                transition: 'left 100ms linear',
              }}
            >
              ✨
            </div>
          </div>

          <p
            className="text-xl font-black tabular-nums leading-none"
            style={{
              color:      isTimeLow ? '#ef4444' : 'var(--color-text-main)',
              textShadow: isTimeLow ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
            }}
          >
            {phase === 'active' ? `${timer.timeLeft.toFixed(1)}s` : '—'}
          </p>
        </div>

        {/* ── LETTER + INPUT ZONE ── */}
        <div className="w-full flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold">
            Empieza con:{' '}
            <span
              className="text-3xl font-black"
              style={{ color: 'var(--color-primary)' }}
            >
              {gameState.currentLetter}
            </span>
          </p>

          {amIActive ? (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-1.5">
              <input
                ref={inputRef}
                value={inputVal}
                onChange={handleInput}
                disabled={phase !== 'active'}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={phase === 'active' ? 'Escribe aquí...' : '…'}
                className={[
                  'w-full px-4 py-2.5 rounded-xl text-center text-lg font-bold border-2 outline-none',
                  'transition-colors duration-150',
                  errorMsg
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-[var(--color-primary)] bg-[var(--color-bg-card)]',
                ].join(' ')}
              />

              {errorMsg && (
                <p className="text-red-400 text-xs text-center font-bold animate-pulse" style={{ minHeight: '16px' }}>
                  {errorMsg}
                </p>
              )}

              {/* Verify button — always visible, per keyboard-safe-zone spec */}
              <button
                type="submit"
                disabled={phase !== 'active'}
                className="w-full py-2.5 rounded-xl font-black text-white text-base transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                }}
              >
                Verificar ✓
              </button>
            </form>
          ) : (
            /* Spectator view */
            <div
              className="w-full px-4 py-2.5 rounded-xl text-center border min-h-[44px] flex items-center justify-center"
              style={{
                background:  'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              {remoteInput ? (
                <span className="text-lg font-bold tracking-wide">
                  {remoteInput}
                  <span className="animate-pulse opacity-70">|</span>
                </span>
              ) : (
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {activePlayer.name} está escribiendo…
                </span>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            OVERLAYS — fixed position, always above all content
            ════════════════════════════════════════════════════ */}

        {phase === 'transition_out' && gameState.lastResult && (
          <TransitionOutOverlay
            result={gameState.lastResult}
            word={gameState.lastWord}
            playedBy={gameState.lastPlayedBy ? gameState.players[gameState.lastPlayedBy] : undefined}
            loser={gameState.lastLoser ? gameState.players[gameState.lastLoser] : undefined}
          />
        )}

        {phase === 'transition_in' && (
          <TransitionInOverlay
            playerName={activePlayer.name}
            playerEmoji={activePlayer.emoji}
            letter={gameState.currentLetter}
            round={gameState.round}
            countdown={countdownNum}
            amINext={amIActive}
          />
        )}

        {phase === 'mercy' && (
          amIWinner
            ? (
              <MercyOfferOverlay
                winnerPlayer={winnerPlayer!}
                isFinalMercyRound={gameState.isFinalMercyRound ?? false}
                isAdPlaying={isAdPlaying}
                onAccept={handleMercyAccepted}
                onDecline={handleMercyDeclined}
              />
            )
            : (
              <MercyWaitingOverlay
                winnerPlayer={winnerPlayer}
              />
            )
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AD BANNER PLACEHOLDER
          ─────────────────────────────────────────────────────────────
          position: fixed + bottom: 0 anchors the banner to the bottom
          of the VISUAL viewport. On Android Chrome, the visual viewport
          shrinks when the keyboard opens → this banner automatically
          sits flush above the keyboard.

          ⚠️  iOS Safari note: Safari's fixed elements track the LAYOUT
          viewport, not the visual viewport, so this banner may appear
          behind the keyboard on iOS. To fix this, use the Visual Viewport
          API: window.visualViewport.addEventListener('resize', ...) and
          set `bottom` to (window.innerHeight - visualViewport.height)px.
          Implement this if iOS support is a priority.

          TODO: Replace the placeholder content with your real ad unit.
      ───────────────────────────────────────────────────────────── */}
      <AdBannerPlaceholder />
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// Ad Banner Placeholder
// ════════════════════════════════════════════════════════════════

function AdBannerPlaceholder() {
  return (
    <div
      className="ad-banner-placeholder"
      style={{
        position:    'fixed',
        bottom:      0,
        left:        0,
        right:       0,
        zIndex:      30,             // below game overlays (z-50) but above content
        height:      '50px',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        background:  'var(--color-bg-card-solid, rgba(15,15,20,0.97))',
        borderTop:   '1px solid rgba(128,128,128,0.15)',
        boxShadow:   '0 -2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* TODO: Replace with real ad unit (e.g. AdSense, AdMob web, etc.) */}
      <span
        style={{
          fontSize:    '10px',
          letterSpacing: '0.06em',
          opacity:     0.45,
          color:       'var(--color-text-muted)',
          textTransform: 'uppercase',
          fontWeight:  600,
        }}
      >
        📢 Publicidad
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Player header helpers
// ════════════════════════════════════════════════════════════════

interface HeaderProps {
  gameState:    NonNullable<ReturnType<typeof usePalabrasFlow>['gameState']>;
  myPlayerId:   string;
  totalPlayers: number;
  activePlayer: PalabrasPlayer;
}

function renderHeader({ gameState, myPlayerId, totalPlayers, activePlayer }: HeaderProps) {
  const amIActive = myPlayerId === gameState.activePlayer;
  const myPlayer  = gameState.players[myPlayerId];

  if (totalPlayers === 2) {
    const rightId = gameState.playerOrder.find((id) => id !== gameState.activePlayer)!;
    return (
      <TwoPlayerHeader
        left={activePlayer}
        leftIsMe={gameState.activePlayer === myPlayerId}
        right={gameState.players[rightId]}
        rightIsMe={rightId === myPlayerId}
      />
    );
  }

  if (amIActive) return <ActiveSpotlightHeader player={myPlayer} />;
  return (
    <TwoPlayerHeader
      left={activePlayer}
      leftIsMe={false}
      leftTag="🎯"
      right={myPlayer}
      rightIsMe={true}
    />
  );
}

interface TwoPlayerHeaderProps {
  left:      PalabrasPlayer;
  leftIsMe:  boolean;
  leftTag?:  string;
  right:     PalabrasPlayer;
  rightIsMe: boolean;
}

function TwoPlayerHeader({ left, leftIsMe, leftTag, right, rightIsMe }: TwoPlayerHeaderProps) {
  return (
    <div
      className="flex w-full items-center gap-2 px-2.5 py-2 rounded-2xl border"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <PlayerChip player={left}  isMe={leftIsMe}  tag={leftTag} />
      <span className="font-black italic text-xs px-0.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        VS
      </span>
      <PlayerChip player={right} isMe={rightIsMe} />
    </div>
  );
}

function ActiveSpotlightHeader({ player }: { player: PalabrasPlayer }) {
  return (
    <div
      className="flex w-full justify-center px-3 py-2 rounded-2xl border"
      style={{
        background:  'var(--color-bg-card)',
        borderColor: 'var(--color-primary)',
        boxShadow:   '0 0 12px var(--color-primary-glow)',
      }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl leading-none">{player.emoji}</span>
        <span className="font-bold text-xs">
          {player.name}{' '}
          <span style={{ color: 'var(--color-primary)' }}>(Tu turno)</span>
        </span>
        <span className="text-xs">{livesDisplay(player.lives)}</span>
      </div>
    </div>
  );
}

interface PlayerChipProps {
  player: PalabrasPlayer;
  isMe:   boolean;
  tag?:   string;
}

function PlayerChip({ player, isMe, tag }: PlayerChipProps) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <span className="text-xl leading-none">{player.emoji}</span>
      <span className="font-bold text-[11px] truncate w-full text-center mt-0.5">
        {player.name}{tag ? ` ${tag}` : ''}{isMe ? ' (Tú)' : ''}
      </span>
      <span className="text-[11px] mt-0.5">{livesDisplay(player.lives)}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Overlays
// ════════════════════════════════════════════════════════════════

// ── TRANSITION_OUT ─────────────────────────────────────────────────

interface TransitionOutProps {
  result:    TurnResult;
  word?:     string;
  playedBy?: PalabrasPlayer;
  loser?:    PalabrasPlayer;
}

function TransitionOutOverlay({ result, word, playedBy, loser }: TransitionOutProps) {
  type Cfg = { gradient: string; emoji: string; title: string; sub: string };
  const cfg: Cfg = (() => {
    switch (result) {
      case 'success':
        return {
          gradient: 'linear-gradient(135deg, #10b981, #059669)',
          emoji:    '✅',
          title:    `¡${playedBy?.name ?? 'Jugador'} lo logró!`,
          sub:      word ? `"${word}"` : '',
        };
      case 'miracle':
        return {
          gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
          emoji:    '⚡',
          title:    '¡MILAGRO DE ÚLTIMO SEGUNDO!',
          sub:      word ? `${playedBy?.name ?? ''}: "${word}"` : '',
        };
      case 'boom':
        return {
          gradient: 'linear-gradient(135deg, #dc2626, #9f1239)',
          emoji:    '💥',
          title:    `¡${loser?.name ?? 'Jugador'} EXPLOTÓ!`,
          sub:      '¡BOOM! 💣',
        };
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex flex-col items-center gap-4 px-8 py-10 rounded-3xl shadow-2xl max-w-xs w-full mx-4"
        style={{ background: cfg.gradient }}
      >
        <span className="text-8xl animate-bounce">{cfg.emoji}</span>
        <h2 className="text-2xl font-black text-white text-center leading-tight">{cfg.title}</h2>
        {cfg.sub && <p className="text-white/90 font-bold text-lg text-center">{cfg.sub}</p>}
      </div>
    </div>
  );
}

// ── TRANSITION_IN ──────────────────────────────────────────────────

interface TransitionInProps {
  playerName:  string;
  playerEmoji: string;
  letter:      string;
  round:       number;
  countdown:   number;
  amINext:     boolean;
}

function TransitionInOverlay({ playerName, playerEmoji, letter, round, countdown, amINext }: TransitionInProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div className="flex flex-col items-center gap-3 text-center px-6 max-w-xs">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Ronda {round}
        </p>
        <span className="text-7xl">{playerEmoji}</span>
        <h2 className="text-3xl font-black text-white leading-tight">
          {amINext
            ? <>¡Tu turno, <span style={{ color: 'var(--color-primary)' }}>{playerName}</span>!</>
            : <>Turno de <span style={{ color: 'var(--color-primary)' }}>{playerName}</span></>
          }
        </h2>
        <p className="text-white/70 font-semibold text-base">
          Empieza con:{' '}
          <span className="text-5xl font-black" style={{ color: 'var(--color-primary)' }}>
            {letter}
          </span>
        </p>
        <div className="text-8xl font-black tabular-nums animate-bounce" style={{ color: 'var(--color-primary)' }}>
          {countdown}
        </div>
      </div>
    </div>
  );
}

// ── MERCY OFFER (winner sees this) ────────────────────────────────

interface MercyOfferProps {
  winnerPlayer:     PalabrasPlayer;
  isFinalMercyRound: boolean; // unused here but kept for future badge UI
  isAdPlaying:      boolean;
  onAccept:         () => void;
  onDecline:        () => void;
}

function MercyOfferOverlay({ winnerPlayer, isAdPlaying, onAccept, onDecline }: MercyOfferProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="flex flex-col items-center gap-5 p-8 rounded-3xl w-full max-w-xs"
        style={{
          background:  'linear-gradient(160deg, #1e1b4b, #0f172a)',
          border:      '2px solid rgba(139,92,246,0.6)',
          boxShadow:   '0 0 40px rgba(139,92,246,0.25)',
        }}
      >
        {isAdPlaying ? (
          /* ── Ad playing ── */
          <>
            <div className="text-5xl animate-spin">🎬</div>
            <h2 className="text-xl font-black text-white text-center">Cargando anuncio…</h2>
            <p className="text-white/60 text-sm text-center">
              Un momento. La piedad tiene un precio.
            </p>
            {/* Ad progress bar */}
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div
                className="h-full rounded-full animate-pulse"
                style={{ width: '100%', background: 'linear-gradient(90deg, #a78bfa, #6366f1)' }}
              />
            </div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              No cierres la aplicación
            </p>
          </>
        ) : (
          /* ── Mercy offer ── */
          <>
            <span className="text-6xl">🏆</span>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-2xl font-black text-white text-center">
                ¡Ganaste, {winnerPlayer.name}!
              </h2>
              <p className="text-white/70 text-sm text-center leading-snug">
                Eres el último en pie. ¿Muestras piedad a los vencidos?
              </p>
            </div>

            {/* Mercy rules summary */}
            <div
              className="w-full rounded-2xl p-3 flex flex-col gap-1.5"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <p className="text-xs text-white/80 font-semibold text-center">Si das piedad:</p>
              <div className="flex flex-col gap-1 text-xs text-white/60">
                <span>❤️ Derrotados reviven con <strong className="text-white">1 vida</strong></span>
                <span>⚡ Tú obtienes <strong className="text-white">+1 vida extra</strong></span>
                <span>⚠️ Es la <strong className="text-yellow-400">ronda final</strong> — sin más piedad</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={onAccept}
                className="w-full py-3 rounded-2xl font-black text-white text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow:  '0 4px 20px rgba(124,58,237,0.5)',
                }}
              >
                🎬 Dar Piedad (Ver Anuncio)
              </button>
              <button
                onClick={onDecline}
                className="w-full py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
                style={{
                  background:  'rgba(255,255,255,0.06)',
                  color:       'rgba(255,255,255,0.55)',
                  border:      '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Terminar Partida
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── MERCY WAITING (non-winner spectators see this) ─────────────────

interface MercyWaitingProps {
  winnerPlayer?: PalabrasPlayer;
}

function MercyWaitingOverlay({ winnerPlayer }: MercyWaitingProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex flex-col items-center gap-5 text-center max-w-xs">
        <span className="text-6xl animate-pulse">⏳</span>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white">El ganador decide…</h2>
          <p className="text-white/60 text-sm">
            Esperando si te concede una segunda oportunidad
          </p>
        </div>
        {winnerPlayer && (
          <div
            className="flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span className="text-3xl">{winnerPlayer.emoji}</span>
            <span className="font-bold text-white">{winnerPlayer.name}</span>
          </div>
        )}
        <p className="text-[10px] uppercase tracking-widest text-white/30">
          Mantén la pantalla encendida
        </p>
      </div>
    </div>
  );
}
