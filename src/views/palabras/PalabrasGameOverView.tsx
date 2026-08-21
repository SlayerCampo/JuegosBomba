import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNetwork } from '@/context/NetworkContext';
import { usePalabrasFlow } from './PalabrasFlow';
import { AdBannerSlot } from '@/components/common/AdBannerSlot';

export function PalabrasGameOverView() {
  const { navigate } = useAppContext();
  const { isHost } = useNetwork();
  const { gameState } = usePalabrasFlow();

  // Reconstruct podium
  const podium = useMemo(() => {
    if (!gameState) return [];
    
    // Alive players (usually 1, the winner)
    const alive = Object.values(gameState.players).filter(p => p.lives > 0);
    const winnerId = alive.length > 0 ? alive[0].id : null;
    
    const list: string[] = [];
    if (winnerId) list.push(winnerId);
    
    // Add eliminated in order (last eliminated is second place, etc)
    // Wait, eliminationOrder is unshifted in triggerBoom (newest at index 0).
    // So index 0 is 2nd place, index 1 is 3rd place, etc.
    if (gameState.eliminationOrder) {
      gameState.eliminationOrder.forEach(id => {
        if (id !== winnerId && !list.includes(id)) {
          list.push(id);
        }
      });
    }

    // Add anyone else (shouldn't be needed, but fallback)
    Object.keys(gameState.players).forEach(id => {
      if (!list.includes(id)) list.push(id);
    });

    return list.map(id => gameState.players[id]);
  }, [gameState]);

  const medals = ["🏆", "🥈", "🥉", "🏅", "🏅"];

  const handleReplay = () => {
    // Return to lobby
    navigate('palabras-lobby');
  };

  const handleHome = () => {
    navigate('home');
  };

  if (!gameState) return null;

  return (
    <div className="w-full flex flex-col items-center gap-6 h-full animate-slide-up pb-8 overflow-y-auto">
      
      <div className="text-center mt-4">
        <h2 className="text-4xl font-black mb-1" style={{ color: 'var(--color-primary)' }}>
          ¡Juego Terminado!
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Resultados finales
        </p>
      </div>

      {/* WINNER SPOTLIGHT */}
      {podium.length > 0 && (
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl w-full shadow-[0_10px_30px_rgba(251,191,36,0.3)]">
          <span className="text-6xl mb-2">{podium[0].emoji}</span>
          <span className="text-2xl font-black text-white">{podium[0].name}</span>
          <span className="text-white/80 font-bold uppercase tracking-widest mt-1 text-sm">¡Ganador Absoluto!</span>
        </div>
      )}

      {/* RANKING */}
      <div className="w-full flex flex-col gap-3 mt-2">
        <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--color-text-main)' }}>Ranking Final</h3>
        {podium.map((p, index) => {
          if (index === 0) return null; // Skip winner
          return (
            <div key={p.id} className="flex items-center gap-4 bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)]">
              <span className="text-2xl w-8 text-center">{medals[index] || "💀"}</span>
              <span className="text-3xl">{p.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-[var(--color-text-main)]">{p.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Eliminado</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTIONS */}
      <div className="w-full flex flex-col gap-3 mt-4">
        {isHost ? (
          <button
            onClick={handleReplay}
            className="w-full py-4 rounded-2xl font-black text-lg text-white
                       transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
          >
            Volver a Jugar
          </button>
        ) : (
          <p className="text-center text-sm font-bold text-[var(--color-text-muted)] animate-pulse mb-2">
            Esperando a que el anfitrión decida...
          </p>
        )}
        <button
          onClick={handleHome}
          className="w-full py-3 rounded-2xl font-bold border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-main)' }}
        >
          Salir al Menú Principal
        </button>
      </div>

      <div className="mt-4 w-full">
        <AdBannerSlot />
      </div>
    </div>
  );
}
