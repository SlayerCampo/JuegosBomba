import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePalabrasFlow } from './PalabrasFlow';
import { CountdownOverlay } from '@/components/common/CountdownOverlay';

export function PalabrasCountdownView() {
  const { navigate } = useAppContext();
  const { gameState } = usePalabrasFlow();
  const [isVisible, setIsVisible] = useState(true);

  // If we don't have a game state yet, something is wrong, go back to home
  useEffect(() => {
    if (!gameState) {
      navigate('home');
    }
  }, [gameState, navigate]);

  const handleDone = () => {
    setIsVisible(false);
    navigate('palabras-game');
  };

  if (!gameState) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Background visual just to look nice before the game view pops in */}
      <div className="opacity-50 animate-pulse-slow">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
          Preparando la Bomba...
        </h2>
      </div>

      <CountdownOverlay 
        isVisible={isVisible} 
        onDone={handleDone} 
        fromCount={3} 
      />
    </div>
  );
}
