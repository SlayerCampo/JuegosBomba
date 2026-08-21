import { useState } from 'react';
import { useStopFlow } from './StopFlow';
import { useNetwork } from '@/context/NetworkContext';
import { STOP_CATEGORIES, type VoteValue } from '@/types/stop';

export function StopReviewView() {
  const { gameState, dispatchLocalMessage } = useStopFlow();
  const { isHost, send, myId } = useNetwork();
  const [clickedVote, setClickedVote] = useState<Record<string, VoteValue>>({});

  if (!gameState) return null;

  const isRoundResults = gameState.phase === 'ROUND_RESULTS';
  const myRealId = myId || 'host';

  const catKey = gameState.selectedCats[gameState.currentReviewCategoryIndex];
  const catInfo = STOP_CATEGORIES[catKey];
  const allAnswers = gameState.allAnswers;

  const handleVote = (targetId: string, vote: VoteValue) => {
    if (gameState.categoryResolutions?.[targetId]) return; // already resolved
    
    // Optimistic UI
    setClickedVote(prev => ({ ...prev, [targetId]: vote }));
    
    send('STOP_VOTE', { voterId: myRealId, targetId, vote });
    if (isHost) {
      dispatchLocalMessage({ type: 'STOP_VOTE', payload: { voterId: myRealId, targetId, vote } });
    }
  };

  const handleNextCategory = () => {
    if (!isHost) return;
    // We send a custom event so the hook can transition
    // Wait, useStopGameState has `hostNextCategoryOrResults`.
    // I need to expose this from StopFlow context.
    const eventObj = new CustomEvent('stop-host-next-category');
    window.dispatchEvent(eventObj);
  };

  const handleNextRound = () => {
    if (!isHost) return;
    const eventObj = new CustomEvent('stop-host-next-round');
    window.dispatchEvent(eventObj);
  };

  return (
    <div className="w-full h-full flex flex-col pt-6 pb-24 overflow-y-auto px-4 relative">
      
      {/* HEADER */}
      <div className="text-center mb-6">
         <h2 className="text-2xl font-black text-[var(--color-text-main)] mb-1">
           {isRoundResults ? 'Resultados de Ronda' : 'Revisión de Respuestas'}
         </h2>
         <p className="text-[var(--color-text-muted)] font-bold">
           Ronda {gameState.currentRound} • Letra <span className="text-[var(--color-primary)]">{gameState.currentLetter}</span>
         </p>
      </div>

      {isRoundResults ? (
        // ROUND RESULTS PHASE
        <div className="flex flex-col gap-4">
           <h3 className="text-xl font-bold text-center text-[var(--color-accent)] mb-4">
             🏅 Puntos de esta ronda
           </h3>
           
           {Object.values(gameState.players)
              .sort((a, b) => b.score - a.score)
              .map(p => {
                 const roundPts = gameState.roundPoints?.[p.id] || 0;
                 return (
                   <div key={p.id} className="flex items-center justify-between bg-[var(--color-bg-card)] p-4 rounded-2xl border border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                         <span className="text-3xl">{p.emoji}</span>
                         <span className="font-bold text-lg">{p.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[var(--color-accent)] font-bold text-sm">+ {roundPts} pts</span>
                         <span className="font-black text-xl">Total: {p.score}</span>
                      </div>
                   </div>
                 );
              })
           }

           {isHost ? (
             <button
               onClick={handleNextRound}
               className="w-full mt-8 py-4 rounded-2xl font-black text-xl text-white bg-[var(--color-primary)] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
             >
               {gameState.currentRound >= gameState.totalRounds ? 'Ver Resultados Finales 🏆' : 'Siguiente Ronda 🔄'}
             </button>
           ) : (
             <p className="text-center text-[var(--color-text-muted)] mt-8 font-bold animate-pulse">
               Esperando al creador...
             </p>
           )}
        </div>
      ) : (
        // REVIEWING PHASE
        <div className="flex flex-col gap-6">
           <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-xl text-white">
              <span className="text-6xl mb-2">{catInfo.emoji}</span>
              <span className="text-2xl font-black">{catInfo.label}</span>
              <span className="opacity-80 text-sm mt-1 font-bold">
                Categoría {gameState.currentReviewCategoryIndex + 1} de {gameState.selectedCats.length}
              </span>
           </div>

           {gameState.isTieWarning && (
             <div className="bg-red-500/20 border-2 border-red-500 p-4 rounded-xl text-center animate-bounce">
                <span className="text-2xl">⚠️</span>
                <p className="font-bold text-red-500">¡Hay un empate en las votaciones! Por favor cambien sus votos para llegar a un consenso.</p>
             </div>
           )}

           <div className="flex flex-col gap-6">
             {Object.values(gameState.players).map(p => {
                const word = allAnswers[p.id]?.[catKey] || '';
                const isEmpty = word.trim().length === 0;
                
                // My vote mapping
                const myVote = clickedVote[p.id] || gameState.categoryVotes[myRealId]?.[p.id];
                const resolution = gameState.categoryResolutions?.[p.id];

                // Badges rendering
                const votesOnTarget = Object.entries(gameState.categoryVotes).map(([vId, vMap]) => ({ voterId: vId, vote: vMap[p.id] }));
                const validBadges = votesOnTarget.filter(v => v.vote === 'valid').map(v => gameState.players[v.voterId]?.emoji).filter(Boolean);
                const repeatedBadges = votesOnTarget.filter(v => v.vote === 'repeated').map(v => gameState.players[v.voterId]?.emoji).filter(Boolean);
                const invalidBadges = votesOnTarget.filter(v => v.vote === 'invalid').map(v => gameState.players[v.voterId]?.emoji).filter(Boolean);

                return (
                  <div key={p.id} className="flex flex-col bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                     
                     <div className="flex items-center justify-between p-4 bg-black/5">
                        <div className="flex items-center gap-2">
                           <span className="text-2xl">{p.emoji}</span>
                           <span className="font-bold">{p.name}</span>
                        </div>
                        <div className={`font-black text-xl truncate max-w-[50%] text-right ${isEmpty ? 'text-red-500 italic' : 'text-[var(--color-text-main)]'}`}>
                           {isEmpty ? '(Vacío)' : word}
                        </div>
                     </div>

                     <div className="p-4">
                        {resolution ? (
                          <div className="flex items-center justify-center gap-2 font-black text-xl animate-pop-in py-2">
                             {resolution.result === 'valid' && <span className="text-green-500">✅ Válida <span className="ml-2 px-3 py-1 bg-green-500/10 rounded-xl">+100</span></span>}
                             {resolution.result === 'repeated' && <span className="text-blue-500">🔁 Repetida <span className="ml-2 px-3 py-1 bg-blue-500/10 rounded-xl">+50</span></span>}
                             {resolution.result === 'invalid' && <span className="text-red-500">❌ Inválida <span className="ml-2 px-3 py-1 bg-red-500/10 rounded-xl">+0</span></span>}
                          </div>
                        ) : isEmpty ? (
                          <div className="text-center text-red-500 font-bold py-3">
                             Automáticamente Inválida
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                             <button 
                               onClick={() => handleVote(p.id, 'valid')}
                               className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border-2 
                                           ${myVote === 'valid' ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-transparent bg-green-500/5 hover:bg-green-500/10'}`}
                             >
                                <span className="text-xl mb-1">✅</span>
                                <span className="text-xs font-bold text-green-500">Válida</span>
                                <div className="flex gap-1 mt-1 text-[10px]">
                                   {validBadges.map((emoji, i) => <span key={`v-${i}`} className="animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>{emoji}</span>)}
                                </div>
                             </button>

                             <button 
                               onClick={() => handleVote(p.id, 'repeated')}
                               className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border-2 
                                           ${myVote === 'repeated' ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-transparent bg-blue-500/5 hover:bg-blue-500/10'}`}
                             >
                                <span className="text-xl mb-1">🔁</span>
                                <span className="text-xs font-bold text-blue-500">Repetida</span>
                                <div className="flex gap-1 mt-1 text-[10px]">
                                   {repeatedBadges.map((emoji, i) => <span key={`r-${i}`} className="animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>{emoji}</span>)}
                                </div>
                             </button>

                             <button 
                               onClick={() => handleVote(p.id, 'invalid')}
                               className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border-2 
                                           ${myVote === 'invalid' ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-transparent bg-red-500/5 hover:bg-red-500/10'}`}
                             >
                                <span className="text-xl mb-1">❌</span>
                                <span className="text-xs font-bold text-red-500">Inválida</span>
                                <div className="flex gap-1 mt-1 text-[10px]">
                                   {invalidBadges.map((emoji, i) => <span key={`i-${i}`} className="animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>{emoji}</span>)}
                                </div>
                             </button>
                          </div>
                        )}
                     </div>

                  </div>
                );
             })}
           </div>
           
           {/* HOST NEXT BUTTON */}
           {isHost && (
             <div className="sticky bottom-4 w-full mt-6 pb-4 animate-slide-up">
               <button
                 onClick={handleNextCategory}
                 disabled={!gameState.categoryResolutions || Object.keys(gameState.categoryResolutions).length === 0 || gameState.isTieWarning}
                 className="w-full py-4 rounded-2xl font-black text-xl text-white transition-all duration-200
                            disabled:opacity-60 disabled:cursor-not-allowed
                            hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                 style={{ 
                   background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                   boxShadow: '0 8px 30px var(--color-primary-glow)'
                 }}
               >
                 {gameState.isTieWarning ? 'Resuelvan el empate ⚠️' :
                  (!gameState.categoryResolutions || Object.keys(gameState.categoryResolutions).length === 0) ? 'Esperando Votos... ⏳' :
                  'Siguiente Categoría ⏭️'}
               </button>
             </div>
           )}
           {!isHost && (!gameState.categoryResolutions || Object.keys(gameState.categoryResolutions).length === 0 || gameState.isTieWarning) && (
             <p className="text-center text-[var(--color-text-muted)] mt-4 font-bold animate-pulse">
               Esperando que todos voten...
             </p>
           )}
           {!isHost && gameState.categoryResolutions && Object.keys(gameState.categoryResolutions).length > 0 && !gameState.isTieWarning && (
             <p className="text-center text-[var(--color-text-muted)] mt-4 font-bold animate-pulse-slow">
               Esperando al anfitrión...
             </p>
           )}

        </div>
      )}
    </div>
  );
}
