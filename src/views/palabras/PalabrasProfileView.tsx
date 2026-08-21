import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePalabrasFlow } from './PalabrasFlow';
import { useNetwork } from '@/context/NetworkContext';
import { ProfileSetup } from '@/components/lobby/ProfileSetup';
import { ErrorCard } from '@/components/common/ErrorCard';
import type { Emoji } from '@/types/player';

export function PalabrasProfileView() {
  const { navigate } = useAppContext();
  const { isHostIntent, targetRoomCode, setMyProfile } = usePalabrasFlow();
  const { initAsHost, initAsGuest, joinRoom } = useNetwork();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (name: string, emoji: Emoji) => {
    setIsConnecting(true);
    setError(null);
    try {
      setMyProfile({ name, emoji });
      if (isHostIntent) {
        await initAsHost('WB-');
        // Transition to lobby; the host lobby will wait for players
        navigate('palabras-lobby');
      } else {
        if (!targetRoomCode) throw new Error('No hay código de sala.');
        await initAsGuest('WB-');
        await joinRoom(targetRoomCode);
        // Transition to lobby; the guest lobby will show "esperando al host"
        navigate('palabras-lobby');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-primary)' }}>
          Tu Perfil
        </h2>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>
          ¿Cómo te llamas y qué emoji te representa?
        </p>
      </div>

      <ProfileSetup 
        onConfirm={handleConfirm} 
        isLoading={isConnecting} 
        confirmLabel={isHostIntent ? '🚀 Crear Partida' : '🎮 Unirse a la Partida'}
      />

      {/* Friendly error card */}
      {error && (
        <ErrorCard
          message={error}
          onRetry={() => { setError(null); }}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('palabras-config')}
        disabled={isConnecting}
        className="flex items-center gap-2 font-bold rounded-2xl border-2 transition-all
                   duration-150 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
        style={{
          padding: '14px 28px',
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-card)',
        }}
      >
        ← Volver
      </button>
    </div>
  );
}
