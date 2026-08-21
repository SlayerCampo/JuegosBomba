import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useStopFlow } from './StopFlow';
import { useNetwork } from '@/context/NetworkContext';
import { ProfileSetup } from '@/components/lobby/ProfileSetup';
import { ErrorCard } from '@/components/common/ErrorCard';
import type { Emoji } from '@/types/player';

export function StopProfileView() {
  const { navigate } = useAppContext();
  const { isHostIntent, targetRoomCode, setMyProfile } = useStopFlow();
  const { initAsHost, initAsGuest, joinRoom } = useNetwork();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (name: string, emoji: Emoji) => {
    setIsConnecting(true);
    setError(null);
    try {
      setMyProfile({ name, emoji });

      if (isHostIntent) {
        await initAsHost('ST-');
        navigate('stop-lobby');
      } else {
        if (!targetRoomCode) throw new Error('No hay código de sala.');
        await initAsGuest('ST-');
        await joinRoom(targetRoomCode);
        // Navigate after connection is confirmed open
        navigate('stop-lobby');
      }
    } catch (err) {
      console.error('[StopProfile] Connection error:', err);
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
          Elige un nombre y emoji para jugar
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
        onClick={() => navigate('stop-config')}
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
