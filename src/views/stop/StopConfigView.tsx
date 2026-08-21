import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useStopFlow } from './StopFlow';
import { RoomCodeInput } from '@/components/lobby/RoomCodeInput';

export function StopConfigView() {
  const { navigate } = useAppContext();
  const { setTargetRoomCode, setIsHostIntent } = useStopFlow();

  const [tab, setTab] = useState<'host' | 'join'>('host');

  const handleHost = () => {
    setIsHostIntent(true);
    setTargetRoomCode(null);
    navigate('stop-profile');
  };

  const handleJoin = (code: string) => {
    setIsHostIntent(false);
    setTargetRoomCode(code);
    navigate('stop-profile');
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">🛑</div>
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-primary)' }}>
          STOP Bomba
        </h2>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>
          El clásico juego de categorías
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
          <button
            onClick={handleHost}
            className="w-full flex flex-col items-center justify-center gap-2 text-center border-2
                       transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              padding: '32px 24px',
              borderRadius: '28px',
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-primary)',
              boxShadow: '0 8px 30px var(--color-primary-glow)',
            }}
          >
            <span className="text-3xl">🏠</span>
            <span className="font-black text-xl" style={{ color: 'var(--color-primary)' }}>
              Iniciar Nueva Partida
            </span>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Serás el anfitrión y controlarás el inicio
            </span>
          </button>
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
