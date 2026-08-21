import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePalabrasFlow } from './PalabrasFlow';
import { GAME_MODES } from '@/utils/gameModes';
import { RoomCodeInput } from '@/components/lobby/RoomCodeInput';
import type { GameMode } from '@/types/palabras';

/** Chunky right chevron SVG */
function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function PalabrasConfigView() {
  const { navigate } = useAppContext();
  const { setGameMode, setTargetRoomCode, setIsHostIntent } = usePalabrasFlow();

  const [tab, setTab] = useState<'host' | 'join'>('host');

  const handleHost = (mode: GameMode) => {
    setIsHostIntent(true);
    setGameMode(mode);
    setTargetRoomCode(null);
    navigate('palabras-profile');
  };

  const handleJoin = (code: string) => {
    setIsHostIntent(false);
    setGameMode(null);
    setTargetRoomCode(code);
    navigate('palabras-profile');
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">💣</div>
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-primary)' }}>
          Palabras Bomba
        </h2>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Configura tu partida
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex w-full p-1.5 rounded-2xl border-2 gap-1"
        style={{
          background: 'var(--color-bg-card-solid)',
          borderColor: 'var(--color-border)',
        }}
      >
        <button
          onClick={() => setTab('host')}
          className={`flex-1 py-3.5 rounded-xl font-black text-base transition-all duration-200 cursor-pointer ${
            tab === 'host' ? 'shadow-md' : 'opacity-60 hover:opacity-80'
          }`}
          style={{
            background: tab === 'host' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'host' ? 'white' : 'var(--color-text-main)',
          }}
        >
          🚀 Crear Sala
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 py-3.5 rounded-xl font-black text-base transition-all duration-200 cursor-pointer ${
            tab === 'join' ? 'shadow-md' : 'opacity-60 hover:opacity-80'
          }`}
          style={{
            background: tab === 'join' ? 'var(--color-primary)' : 'transparent',
            color: tab === 'join' ? 'white' : 'var(--color-text-main)',
          }}
        >
          🎮 Unirse
        </button>
      </div>

      <div className="w-full">
        {tab === 'host' ? (
          <div className="flex flex-col gap-3">
            <p
              className="text-sm font-bold uppercase tracking-widest text-center mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Selecciona Dificultad
            </p>
            {(Object.entries(GAME_MODES) as [GameMode, typeof GAME_MODES[GameMode]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleHost(key)}
                  className="w-full flex items-center gap-4 text-left border-2 transition-all
                             duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                             hover:border-[var(--color-primary)]"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '24px',
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="flex-1">
                    <span
                      className="block font-black text-lg mb-0.5"
                      style={{ color: 'var(--color-text-main)' }}
                    >
                      {config.label}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {config.description}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'var(--color-primary-glow)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <ChevronRight />
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p
              className="text-sm font-bold uppercase tracking-widest text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Ingresa el código de sala
            </p>
            <RoomCodeInput onJoin={handleJoin} isConnecting={false} error={null} />
          </div>
        )}
      </div>
    </div>
  );
}
