import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNetwork } from '@/context/NetworkContext';
import { useStopFlow } from './StopFlow';
import { AdBannerSlot } from '@/components/common/AdBannerSlot';

export function StopGameOverView() {
  const { navigate } = useAppContext();
  const { isHost, myId } = useNetwork();
  const { gameState } = useStopFlow();

  const sortedPlayers = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.players).sort((a, b) => b.score - a.score);
  }, [gameState]);

  const handleReplay = () => {
    navigate('stop-config');
  };

  const handleHome = () => {
    navigate('home');
  };

  if (!gameState || sortedPlayers.length === 0) return null;

  const winner = sortedPlayers[0];
  const isMeWinner = winner.id === (myId || 'host');

  return (
    <div className="w-full h-full flex flex-col items-center pt-8 pb-24 overflow-y-auto px-4 gap-6 animate-slide-up">
      
      <div className="text-center">
        <h2 className="text-4xl font-black mb-1" style={{ color: 'var(--color-primary)' }}>
          ¡Juego Terminado!
        </h2>
        <p className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
          Resultados Finales
        </p>
      </div>

      {/* WINNER SPOTLIGHT */}
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl w-full shadow-[0_10px_30px_rgba(251,191,36,0.3)] text-white text-center">
         <span className="text-6xl mb-4">{isMeWinner ? '🏆' : '😔'}</span>
         <span className="text-2xl font-black mb-2">
            {isMeWinner ? `¡Ganaste con ${winner.score} pts!` : `¡${winner.name} ganó con ${winner.score} pts!`}
         </span>
         <span className="text-white/80 font-bold uppercase tracking-widest text-sm">
           Mejor Jugador
         </span>
      </div>

      {/* RANKING TABLE */}
      <div className="w-full flex flex-col gap-3 mt-4">
         {sortedPlayers.map((p, idx) => {
            const isWinnerRow = idx === 0;
            const position = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            
            return (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border
                                          ${isWinnerRow ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'}`}>
                 <div className="flex items-center gap-4">
                    <span className="text-2xl w-8 text-center">{position}</span>
                    <span className="text-3xl">{p.emoji}</span>
                    <span className={`font-bold text-lg ${isWinnerRow ? 'text-yellow-500' : 'text-[var(--color-text-main)]'}`}>{p.name}</span>
                 </div>
                 <span className="font-black text-xl">{p.score} pts</span>
              </div>
            );
         })}
      </div>

      {/* ACTIONS */}
      <div className="w-full flex flex-col gap-3 mt-8">
        {isHost ? (
          <button
            onClick={handleReplay}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
          >
            Nueva Partida 🔄
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
