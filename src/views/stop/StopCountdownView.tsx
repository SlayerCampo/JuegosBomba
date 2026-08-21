import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useStopFlow } from './StopFlow';
import { CountdownOverlay } from '@/components/common/CountdownOverlay';

export function StopCountdownView() {
  const { navigate } = useAppContext();
  const { gameState } = useStopFlow();
  const [isVisible, setIsVisible] = useState(true);
  const [showLetter, setShowLetter] = useState(false);

  useEffect(() => {
    if (!gameState) {
      navigate('home');
    }
  }, [gameState, navigate]);

  const handleDone = () => {
    setIsVisible(false);
    setShowLetter(true);
    
    // Hold letter for 2.5s then go to game
    setTimeout(() => {
      navigate('stop-game');
    }, 2500);
  };

  if (!gameState) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center h-full relative">
      
      {showLetter && (
        <div className="flex flex-col items-center justify-center animate-pop-in">
           <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">
             ¡Esta es la letra! 🎉
           </h2>
           <div className="w-48 h-48 flex items-center justify-center rounded-3xl shadow-2xl"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              <span className="text-8xl font-black text-white" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                {gameState.currentLetter}
              </span>
           </div>
        </div>
      )}

      <CountdownOverlay 
        isVisible={isVisible} 
        onDone={handleDone} 
        fromCount={5} 
        label="¡La letra se revela en..."
      />
    </div>
  );
}
