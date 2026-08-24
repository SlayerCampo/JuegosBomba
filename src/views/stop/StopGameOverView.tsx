import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNetwork } from '@/context/NetworkContext';
import { useStopFlow } from './StopFlow';
import { AdBannerSlot } from '@/components/common/AdBannerSlot';

export function StopGameOverView() {
  const { navigate } = useAppContext();
  const { isHost } = useNetwork();
  const { gameState } = useStopFlow();

  const rankedPlayers = useMemo(() => {
    if (!gameState) return [];
    const sorted = Object.values(gameState.players).sort((a, b) => b.score - a.score);
    return sorted.map(p => {
       const rank = sorted.findIndex(x => x.score === p.score) + 1;
       const isTie = sorted.filter(x => x.score === p.score).length > 1;
       return { ...p, rank, isTie };
    });
  }, [gameState]);

  const handleReplay = () => {
    navigate('stop-config');
  };

  const handleHome = () => {
    navigate('home');
  };

  if (!gameState || rankedPlayers.length === 0) return null;

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

      {/* PODIO TOP 3 */}
      <div className="w-full flex items-end justify-center gap-2 mt-8 mb-6 h-64 min-h-[250px]">
         {/* 2DO LUGAR */}
         {rankedPlayers[1] && (
           <div className="flex flex-col items-center justify-end w-1/3 max-w-[100px] h-[80%]">
             <div className="text-3xl mb-1">{rankedPlayers[1].emoji}</div>
             <div className="font-bold text-sm truncate w-full text-center">{rankedPlayers[1].name}</div>
             <div className="font-black text-xs text-amber-500 mb-2">{rankedPlayers[1].score} pts</div>
             <div className="w-full bg-slate-300 rounded-t-lg shadow-inner flex items-start justify-center pt-2" style={{ height: '60%' }}>
               <span className={`font-black text-slate-500 ${rankedPlayers[1].isTie ? 'text-[10px] uppercase tracking-widest pt-1' : 'text-2xl'}`}>
                 {rankedPlayers[1].isTie ? 'Empate' : rankedPlayers[1].rank}
               </span>
             </div>
           </div>
         )}
         
         {/* 1ER LUGAR */}
         {rankedPlayers[0] && (
           <div className="flex flex-col items-center justify-end w-1/3 max-w-[120px] h-full z-10">
             <div className="text-5xl mb-1">{rankedPlayers[0].emoji}</div>
             <div className="font-bold text-base truncate w-full text-center text-yellow-500">{rankedPlayers[0].name}</div>
             <div className="font-black text-sm text-yellow-500 mb-2">{rankedPlayers[0].score} pts</div>
             <div className="w-full bg-yellow-400 rounded-t-xl shadow-[0_-5px_15px_rgba(251,191,36,0.5)] flex items-start justify-center pt-3" style={{ height: '75%' }}>
               <span className={`font-black text-yellow-700 ${rankedPlayers[0].isTie ? 'text-xs uppercase tracking-widest pt-1' : 'text-4xl'}`}>
                 {rankedPlayers[0].isTie ? 'Empate' : rankedPlayers[0].rank}
               </span>
             </div>
           </div>
         )}

         {/* 3ER LUGAR */}
         {rankedPlayers[2] && (
           <div className="flex flex-col items-center justify-end w-1/3 max-w-[100px] h-[65%]">
             <div className="text-3xl mb-1">{rankedPlayers[2].emoji}</div>
             <div className="font-bold text-sm truncate w-full text-center">{rankedPlayers[2].name}</div>
             <div className="font-black text-xs text-orange-400 mb-2">{rankedPlayers[2].score} pts</div>
             <div className="w-full bg-orange-300 rounded-t-lg shadow-inner flex items-start justify-center pt-2" style={{ height: '50%' }}>
               <span className={`font-black text-orange-600 ${rankedPlayers[2].isTie ? 'text-[10px] uppercase tracking-widest pt-1' : 'text-2xl'}`}>
                 {rankedPlayers[2].isTie ? 'Empate' : rankedPlayers[2].rank}
               </span>
             </div>
           </div>
         )}
      </div>

      {/* RANKING RESTANTE */}
      {rankedPlayers.length > 3 && (
        <div className="w-full flex flex-col gap-3 mt-4">
           {rankedPlayers.slice(3).map((p) => {
              return (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border bg-[var(--color-bg-card)] border-[var(--color-border)]">
                   <div className="flex items-center gap-4">
                      <span className="text-xl font-black min-w-[3rem] text-center text-[var(--color-text-muted)]">
                        {p.isTie ? 'Empate' : `#${p.rank}`}
                      </span>
                      <span className="text-3xl">{p.emoji}</span>
                      <span className="font-bold text-lg text-[var(--color-text-main)]">{p.name}</span>
                   </div>
                   <span className="font-black text-xl text-[var(--color-text-muted)]">{p.score} pts</span>
                </div>
              );
           })}
        </div>
      )}

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
