import { useMemo, useEffect, useRef } from 'react';
import { usePalabrasFlow } from './PalabrasFlow';
import { useNetwork }      from '@/context/NetworkContext';
import { RoomCodeDisplay } from '@/components/lobby/RoomCodeDisplay';
import { PlayerLobbyList } from '@/components/lobby/PlayerLobbyList';
import type { PlayerProfile } from '@/types/player';
import type { LetterMode }    from '@/types/palabras';

export function PalabrasLobbyView() {
  const {
    isHostIntent,
    gameMode,
    lobbyPlayers, setLobbyPlayers,
    myProfile,
    letterMode, setLetterMode,
    startGameAsHost,
  } = usePalabrasFlow();
  const { roomCode, myId, isHost, send } = useNetwork();

  const broadcastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Broadcast or set my profile once connected.
  // Guests retry a few times to handle the data-channel timing window.
  useEffect(() => {
    if (!myId || !myProfile) return;
    if (lobbyPlayers[myId]) return;

    const profile: PlayerProfile = {
      id:      myId,
      name:    myProfile.name,
      emoji:   myProfile.emoji as any,
      isReady: true,
    };

    if (isHost) {
      setLobbyPlayers((prev) => ({ ...prev, [myId]: profile }));
    } else {
      const sendProfile = (attempt: number) => {
        if (lobbyPlayers[myId]) return;
        console.log(`[PalabrasLobby] GUEST: PROFILE_READY (attempt ${attempt})`);
        send('PROFILE_READY', profile);
      };

      sendProfile(1);
      const t1 = setTimeout(() => sendProfile(2), 600);
      const t2 = setTimeout(() => sendProfile(3), 1800);
      broadcastTimers.current = [t1, t2];
    }

    return () => {
      broadcastTimers.current.forEach(clearTimeout);
      broadcastTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myProfile, isHost]);

  // Cancel retry timers once confirmed in lobby
  useEffect(() => {
    if (myId && lobbyPlayers[myId] && broadcastTimers.current.length > 0) {
      broadcastTimers.current.forEach(clearTimeout);
      broadcastTimers.current = [];
    }
  }, [lobbyPlayers, myId]);

  const players: PlayerProfile[] = useMemo(
    () => Object.values(lobbyPlayers),
    [lobbyPlayers],
  );

  const handleStart = () => {
    if (isHostIntent) {
      startGameAsHost(gameMode ?? 'normal', letterMode);
    }
  };

  // ── Letter mode toggle ─────────────────────────────────────────
  const LetterModeToggle = () => (
    <div className="w-full flex flex-col gap-2">
      <p
        className="text-xs font-bold uppercase tracking-widest text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Modo de Letra
      </p>

      <div
        className="flex w-full p-1 gap-1 rounded-xl border-2"
        style={{
          background:  'var(--color-bg-card-solid)',
          borderColor: 'var(--color-border)',
        }}
      >
        {(
          [
            { value: 'por-ronda', label: '🔤 Modo B — Por Ronda',  desc: 'La letra cambia cada ronda' },
            { value: 'por-turno', label: '🔀 Modo A — Por Turno',  desc: 'La letra cambia cada turno' },
          ] as { value: LetterMode; label: string; desc: string }[]
        ).map(({ value, label }) => {
          const active = letterMode === value;
          return (
            <button
              key={value}
              onClick={() => setLetterMode(value)}
              className={[
                'flex-1 py-2.5 px-1 rounded-lg font-bold text-xs text-center',
                'transition-all duration-200 cursor-pointer',
                active ? 'shadow-md' : 'opacity-60 hover:opacity-85',
              ].join(' ')}
              style={{
                background: active ? 'var(--color-primary)' : 'transparent',
                color:      active ? 'white' : 'var(--color-text-main)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-primary)' }}>
          Sala de Espera
        </h2>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {isHost ? '🎉 Invita a tus amigos' : '⏳ Esperando al anfitrión…'}
        </p>
      </div>

      {isHost && roomCode && (
        <RoomCodeDisplay code={roomCode} gameType="palabras" />
      )}

      <div className="w-full">
        <PlayerLobbyList players={players} myId={myId ?? ''} />
      </div>

      {isHost ? (
        <>
          {/* Letter mode toggle — host only */}
          <LetterModeToggle />

          <button
            onClick={handleStart}
            disabled={players.length < 2}
            className={[
              'w-full font-black text-white transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
            ].join(' ')}
            style={{
              padding:      '24px 32px',
              borderRadius: '32px',
              fontSize:     '22px',
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              boxShadow: '0 8px 30px var(--color-primary-glow)',
            }}
          >
            ¡Comenzar Partida! 🚀
          </button>
        </>
      ) : (
        <p
          className="text-base font-semibold animate-pulse-slow text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ⏳ El anfitrión iniciará la partida pronto…
        </p>
      )}
    </div>
  );
}
