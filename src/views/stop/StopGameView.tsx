import { useState, useEffect, useMemo } from 'react';
import { useStopFlow } from './StopFlow';
import { useNetwork } from '@/context/NetworkContext';
import { useGameTimer } from '@/hooks/useGameTimer';
import { STOP_CATEGORIES, type CategoryKey } from '@/types/stop';
import { escapeHTML } from '@/utils/textUtils';

export function StopGameView() {
  const { gameState, stopTriggeredBy, dispatchLocalMessage } = useStopFlow();
  const { isHost, send, myId } = useNetwork();
  const { timeLeft, start, stop, isExpired } = useGameTimer();

  const [answers, setAnswers] = useState<Record<CategoryKey, string>>({} as any);

  // Initialize answers object
  useEffect(() => {
    if (gameState) {
      const initial: any = {};
      gameState.selectedCats.forEach(cat => {
        initial[cat] = '';
      });
      setAnswers(initial);
      
      const duration = (gameState.turnEndTime - Date.now()) / 1000;
      start(gameState.turnEndTime, duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentRound]); // Reset inputs on new round

  // Auto-submit on time out or STOP triggered
  useEffect(() => {
    if (isExpired || stopTriggeredBy) {
      stop();
      
      const safeAnswers: Record<CategoryKey, string> = {} as any;
      Object.keys(answers).forEach(k => {
         safeAnswers[k as CategoryKey] = escapeHTML(answers[k as CategoryKey]);
      });

      if (!isHost) {
        send('STOP_SUBMIT_ANSWERS', { id: myId, answers: safeAnswers });
      } else {
        // If host, we simulate sending to ourselves via the flow
        dispatchLocalMessage({ type: 'STOP_SUBMIT_ANSWERS', payload: { id: myId, answers: safeAnswers } });
      }
    }
  }, [isExpired, stopTriggeredBy, stop, send, myId, isHost, answers, dispatchLocalMessage]);

  // Cheat Detector: If user minimizes or switches tabs while playing
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && gameState?.phase === 'PLAYING' && !stopTriggeredBy && !isExpired) {
        const triggerId = myId || 'host';
        send('STOP_CHEAT_DETECTED', triggerId);
        if (isHost) {
          dispatchLocalMessage({ type: 'STOP_CHEAT_DETECTED', payload: triggerId });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    // Also detect window blur just in case
    window.addEventListener('blur', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
    };
  }, [gameState?.phase, isExpired, stopTriggeredBy, myId, isHost, send, dispatchLocalMessage]);

  const handleInputChange = (cat: CategoryKey, val: string) => {
    setAnswers(prev => ({ ...prev, [cat]: val }));
  };

  const handleStopClick = () => {
    if (stopTriggeredBy) return;
    const triggerId = myId || 'host';
    send('STOP_TRIGGER', { triggeredBy: triggerId });
    if (isHost) {
      dispatchLocalMessage({ type: 'STOP_TRIGGER', payload: { triggeredBy: triggerId } });
    }
  };

  const allFilled = useMemo(() => {
    if (!gameState) return false;
    return gameState.selectedCats.every(cat => (answers[cat] || '').trim().length > 0);
  }, [gameState, answers]);

  if (!gameState) return null;

  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  const isDanger = timeLeft <= 10;

  return (
    <div className="flex-1 w-full flex flex-col items-center relative pt-4 pb-24 overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full flex justify-between items-center mb-8 px-2 md:px-6">
         <div className="flex flex-col items-center">
           <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-1">Ronda</span>
           <span className="text-3xl font-black text-[var(--color-text-main)]">{gameState.currentRound}/{gameState.totalRounds}</span>
         </div>

         <div className="flex flex-col items-center">
           <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              {gameState.currentLetter}
           </div>
         </div>

         <div className="flex flex-col items-center">
           <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-1">Tiempo</span>
           <span className={`text-3xl font-black ${isDanger ? 'text-red-500 animate-pulse' : 'text-[var(--color-text-main)]'}`}>
             {m}:{s.toString().padStart(2, '0')}
           </span>
         </div>
      </div>

      {/* INPUTS GRID */}
      <div className="w-full flex-1 overflow-y-auto px-2 md:px-6 flex flex-col gap-5 pb-16">
         {gameState.selectedCats.map(cat => {
            const info = STOP_CATEGORIES[cat] || { label: `EXTRAS: ${cat.toUpperCase()}`, emoji: '⭐' };
            const val = answers[cat] || '';
            const hasValue = val.trim().length > 0;
            return (
              <div key={cat} className="flex flex-col gap-2 relative group">
                 <label className="text-base font-bold flex items-center gap-2 text-[var(--color-text-main)] ml-2">
                   <span className="text-xl">{info.emoji}</span> {info.label}
                 </label>
                 <div className="relative w-full">
                   <input
                     type="text"
                     value={val}
                     onChange={(e) => handleInputChange(cat, e.target.value)}
                     disabled={!!stopTriggeredBy || isExpired}
                     placeholder={`${info.label} con ${gameState.currentLetter}...`}
                     className={`w-full p-4 md:p-5 text-lg rounded-2xl font-bold bg-[var(--color-bg-card)] border-2 transition-all duration-200 outline-none text-center
                                 ${hasValue ? 'border-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary-glow)]' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'}`}
                   />
                   {hasValue && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)] animate-pop-in">
                       ✅
                     </div>
                   )}
                 </div>
              </div>
            );
         })}

           {/* STOP BUTTON */}
           <div className="mt-8 mb-4 w-full">
              <button
                onClick={handleStopClick}
                disabled={!allFilled || !!stopTriggeredBy || isExpired}
                className="w-full py-5 rounded-[2rem] font-black text-2xl text-white transition-all duration-200 flex items-center justify-center gap-3 relative overflow-hidden group
                           disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed
                           hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-danger), #991b1b)',
                  boxShadow: '0 8px 25px rgba(239,68,68,0.3)',
                  border: 'none'
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-3xl relative z-10">🛑</span> 
                <span className="relative z-10">¡STOP BOMBA!</span>
              </button>
           </div>
        </div>

        {/* OVERLAY */}
        {(stopTriggeredBy || isExpired) && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-8 text-center w-full h-full">
             <h2 className="text-[5rem] md:text-[8rem] font-black text-red-500 mb-6 animate-pop-in leading-none" style={{ textShadow: '0 0 40px rgba(239,68,68,0.8)' }}>¡BOOM!</h2>
             <p className="text-2xl md:text-3xl text-white font-bold mb-8">
               {stopTriggeredBy === (myId || 'host') ? '¡Detuviste el juego!' : 
                stopTriggeredBy === 'time' ? '¡Se acabó el tiempo!' : 
                '¡Alguien detuvo el juego!'}
             </p>
             <p className="text-lg md:text-xl text-[var(--color-primary)] animate-pulse-slow font-bold max-w-sm mx-auto">
               Tus respuestas han sido enviadas. Pasando a votar...
             </p>
          </div>
        )}
    </div>
  );
}
