import { useMemo, useEffect, useRef } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { RoomCodeDisplay } from '@/components/lobby/RoomCodeDisplay';
import { PlayerLobbyList } from '@/components/lobby/PlayerLobbyList';
import { useStopFlow } from './StopFlow';
import { STOP_CATEGORIES, type CategoryKey } from '@/types/stop';
import type { PlayerProfile } from '@/types/player';

export function StopLobbyView() {
  const { lobbyPlayers, setLobbyPlayers, myProfile, startGameAsHost, selectedCats, setSelectedCats } = useStopFlow();
  const { roomCode, myId, isHost, send } = useNetwork();

  // Track how many times we've tried to broadcast our profile.
  // We retry a few times with increasing delays to handle the case where the
  // WebRTC data channel opens just as we mount this view.
  const broadcastAttempts = useRef(0);
  const broadcastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!myId || !myProfile) return;
    if (lobbyPlayers[myId]) return; // Already registered — don't re-send

    const profile: PlayerProfile = {
      id: myId,
      name: myProfile.name,
      emoji: myProfile.emoji as any,
      isReady: true,
    };

    if (isHost) {
      // Host adds itself directly to local state
      console.log('[StopLobby] HOST: adding own profile to lobby', profile);
      setLobbyPlayers(prev => ({ ...prev, [myId]: profile }));
    } else {
      // Guest must broadcast to host.
      // We send immediately AND retry after 500ms and 1500ms to handle
      // the timing window where the data channel opens just as we mount.
      const sendProfile = (attempt: number) => {
        if (lobbyPlayers[myId]) {
          console.log('[StopLobby] GUEST: profile already in lobby, skipping attempt', attempt);
          return;
        }
        console.log(`[StopLobby] GUEST: sending PROFILE_READY (attempt ${attempt}):`, profile);
        send('PROFILE_READY', profile);
      };

      // Immediate
      sendProfile(1);
      broadcastAttempts.current = 1;

      // Retry at 600ms
      const t1 = setTimeout(() => { sendProfile(2); }, 600);
      // Retry at 1800ms (last resort)
      const t2 = setTimeout(() => { sendProfile(3); }, 1800);

      broadcastTimers.current = [t1, t2];
    }

    return () => {
      // Clean up retry timers
      broadcastTimers.current.forEach(clearTimeout);
      broadcastTimers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myProfile, isHost]);
  // Intentionally NOT including lobbyPlayers or send in deps to avoid re-triggering.
  // The ref guard (broadcastAttempts / lobbyPlayers[myId] check inside) handles idempotency.

  // Stop retrying once we appear in the lobby list
  useEffect(() => {
    if (myId && lobbyPlayers[myId] && broadcastTimers.current.length > 0) {
      console.log('[StopLobby] Profile confirmed in lobby — clearing retry timers');
      broadcastTimers.current.forEach(clearTimeout);
      broadcastTimers.current = [];
    }
  }, [lobbyPlayers, myId]);

  const players: PlayerProfile[] = useMemo(() => {
    return Object.values(lobbyPlayers);
  }, [lobbyPlayers]);

  const handleStart = () => {
    if (isHost) startGameAsHost();
  };

  const toggleCat = (cat: CategoryKey) => {
    const next = selectedCats.includes(cat)
      ? selectedCats.filter(c => c !== cat)
      : [...selectedCats, cat];
    setSelectedCats(next);
  };

  console.log('[StopLobby] render — isHost:', isHost, 'players:', players.map(p => p.name));

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      <div className="text-center">
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-primary)' }}>
          Sala de Espera
        </h2>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {isHost ? '🎉 Invita a tus amigos' : '⏳ Esperando al anfitrión...'}
        </p>
      </div>

      {isHost && roomCode && (
        <RoomCodeDisplay code={roomCode} gameType="stop" />
      )}

      <div className="w-full">
        <PlayerLobbyList players={players} myId={myId ?? ''} />
      </div>

      {isHost && (
        <div
          className="w-full flex flex-col items-center rounded-[32px] border-2 shadow-md"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            padding: '32px',
          }}
        >
          <p
            className="font-black mb-5 uppercase tracking-widest text-center"
            style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}
          >
            Categorías ({selectedCats.length})
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.keys(STOP_CATEGORIES).map(k => {
              const cat = k as CategoryKey;
              const info = STOP_CATEGORIES[cat];
              const isSel = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className={`shrink-0 font-black border-2 transition-all duration-200 cursor-pointer
                    flex items-center justify-center whitespace-nowrap ${
                      isSel
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[0_0_20px_var(--color-primary-glow)] scale-105'
                        : 'bg-transparent border-[var(--color-border)] opacity-60 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                  style={{ padding: '16px 28px', borderRadius: '24px', gap: '12px', fontSize: '18px' }}
                >
                  <span style={{ fontSize: '24px' }}>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
          {selectedCats.length < 3 && (
            <p className="text-red-500 text-base mt-5 font-black animate-pulse text-center">
              ¡Selecciona al menos 3 categorías!
            </p>
          )}
        </div>
      )}

      {isHost ? (
        <div className="w-full">
          <button
            onClick={handleStart}
            disabled={players.length < 2 || selectedCats.length < 3}
            className="w-full font-black text-white transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            style={{
              padding: '24px 32px',
              borderRadius: '32px',
              fontSize: '22px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              boxShadow: '0 8px 30px var(--color-primary-glow)',
            }}
          >
            ¡Comenzar Partida! 🚀
          </button>
        </div>
      ) : (
        <p className="text-base font-semibold animate-pulse-slow text-center" style={{ color: 'var(--color-text-muted)' }}>
          ⏳ El anfitrión iniciará la partida pronto...
        </p>
      )}
    </div>
  );
}
