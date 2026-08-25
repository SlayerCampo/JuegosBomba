import { useMemo, useEffect, useRef, useState } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { RoomCodeDisplay } from '@/components/lobby/RoomCodeDisplay';
import { PlayerLobbyList } from '@/components/lobby/PlayerLobbyList';
import { AdInlineRectangle } from '@/components/common/AdBannerSlot';
import { useStopFlow } from './StopFlow';
import { STOP_CATEGORIES, type CategoryKey } from '@/types/stop';
import type { PlayerProfile } from '@/types/player';

export function StopLobbyView() {
  const { 
    lobbyPlayers, setLobbyPlayers, myProfile, startGameAsHost, 
    selectedCats, setSelectedCats,
    roundSettings, setRoundSettings,
    customCategories, setCustomCategories
  } = useStopFlow();
  const { roomCode, myId, isHost, send } = useNetwork();
  
  const [newCustomCat, setNewCustomCat] = useState('');

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
      
      <AdInlineRectangle />

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
            Categorías ({selectedCats.length + customCategories.length})
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {customCategories.map((cat, idx) => (
                <button
                  key={`custom-${idx}`}
                  onClick={() => setCustomCategories(customCategories.filter(c => c !== cat))}
                  className="shrink-0 font-black border-2 transition-all duration-200 cursor-pointer flex items-center justify-center whitespace-nowrap bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[0_0_20px_var(--color-primary-glow)] scale-105"
                  style={{ padding: '16px 28px', borderRadius: '24px', gap: '12px', fontSize: '18px' }}
                >
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <span>{cat}</span>
                  <span className="ml-1 text-xs opacity-70">✕</span>
                </button>
            ))}
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
          {(selectedCats.length + customCategories.length) < 3 && (
            <p className="text-red-500 text-base mt-5 font-black animate-pulse text-center">
              ¡Selecciona al menos 3 categorías!
            </p>
          )}

          {/* AJUSTES EXTRA */}
          <div className="w-full flex flex-col gap-6 mt-8 pt-8 border-t border-[var(--color-border)]">
             <p className="font-black uppercase tracking-widest text-center" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>
               Ajustes de Partida
             </p>
             
             <div className="flex flex-col md:flex-row gap-6 w-full justify-around">
               {/* RONDAS */}
               <div className="flex flex-col items-center gap-2 flex-1">
                 <span className="font-bold text-[var(--color-text-main)]">Rondas</span>
                 <div className="flex items-center gap-4 p-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                   <button onClick={() => setRoundSettings(s => ({...s, totalRounds: Math.max(1, s.totalRounds - 1)}))} className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-bg-card-solid)] text-[var(--color-text-main)] shadow-sm font-black text-xl hover:scale-105 hover:border-[var(--color-primary)] active:scale-95 transition-all cursor-pointer">-</button>
                   <span className="text-2xl font-black min-w-[30px] text-center text-[var(--color-primary)]">{roundSettings.totalRounds}</span>
                   <button onClick={() => setRoundSettings(s => ({...s, totalRounds: Math.min(10, s.totalRounds + 1)}))} className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-bg-card-solid)] text-[var(--color-text-main)] shadow-sm font-black text-xl hover:scale-105 hover:border-[var(--color-primary)] active:scale-95 transition-all cursor-pointer">+</button>
                 </div>
               </div>

               {/* TIEMPO */}
               <div className="flex flex-col items-center gap-2 flex-1">
                 <span className="font-bold text-[var(--color-text-main)]">Tiempo Límite</span>
                 <div className="flex items-center gap-4 p-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                   <button onClick={() => setRoundSettings(s => ({...s, roundMinutes: Math.max(1, s.roundMinutes - 1)}))} className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-bg-card-solid)] text-[var(--color-text-main)] shadow-sm font-black text-xl hover:scale-105 hover:border-[var(--color-primary)] active:scale-95 transition-all cursor-pointer">-</button>
                   <span className="text-2xl font-black min-w-[60px] text-center text-[var(--color-primary)]">{roundSettings.roundMinutes} <span className="text-sm">min</span></span>
                   <button onClick={() => setRoundSettings(s => ({...s, roundMinutes: Math.min(10, s.roundMinutes + 1)}))} className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-bg-card-solid)] text-[var(--color-text-main)] shadow-sm font-black text-xl hover:scale-105 hover:border-[var(--color-primary)] active:scale-95 transition-all cursor-pointer">+</button>
                 </div>
               </div>
             </div>

             {/* CATEGORIA EXTRA */}
             <div className="flex flex-col gap-2 mt-4">
                <span className="font-bold text-center text-[var(--color-text-main)]">Categoría Extra <span className="text-sm opacity-50">(Opcional)</span></span>
                <div className="flex w-full gap-2">
                  <input 
                    type="text" 
                    value={newCustomCat}
                    onChange={e => setNewCustomCat(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const trimmed = newCustomCat.trim();
                        if (trimmed && !customCategories.includes(trimmed)) {
                          setCustomCategories([...customCategories, trimmed]);
                          setNewCustomCat('');
                        }
                      }
                    }}
                    placeholder="Ej: Villanos"
                    maxLength={15}
                    className="flex-1 text-center font-bold text-lg p-4 rounded-2xl border-2 outline-none focus:border-[var(--color-primary)] transition-colors"
                    style={{ background: 'var(--color-bg-card-solid)', color: 'var(--color-text-main)', borderColor: 'var(--color-border)' }}
                  />
                  <button 
                    onClick={() => {
                      const trimmed = newCustomCat.trim();
                      if (trimmed && !customCategories.includes(trimmed)) {
                        setCustomCategories([...customCategories, trimmed]);
                        setNewCustomCat('');
                      }
                    }}
                    disabled={!newCustomCat.trim()}
                    className="px-6 rounded-2xl font-black text-white disabled:opacity-50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Añadir
                  </button>
                </div>
                {newCustomCat.trim().length > 0 && (
                  <span className="text-xs text-center text-amber-500 font-bold mt-1">
                     ⚠️ Por favor usa solo UNA palabra corta.
                  </span>
                )}
             </div>
          </div>
        </div>
      )}

      {isHost ? (
        <div className="w-full">
          <button
            onClick={handleStart}
            disabled={players.length < 2 || (selectedCats.length + customCategories.length) < 3}
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
