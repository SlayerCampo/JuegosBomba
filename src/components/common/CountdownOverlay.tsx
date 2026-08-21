import { useEffect, useState, useRef } from 'react';

interface CountdownOverlayProps {
  isVisible: boolean;
  onDone: () => void;
  fromCount?: number;
  label?: string;
}

export function CountdownOverlay({ isVisible, onDone, fromCount = 3, label = '¡El juego empieza!' }: CountdownOverlayProps) {
  const [count, setCount] = useState(fromCount);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!isVisible) {
      setCount(fromCount);
      return;
    }

    setCount(fromCount);
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onDoneRef.current(), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, fromCount]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="text-8xl font-black animate-pop-in"
        style={{ color: 'var(--color-primary)', textShadow: '0 0 40px var(--color-primary-glow)' }}
      >
        {count > 0 ? count : '¡YA!'}
      </div>
      <p
        className="mt-6 text-xl font-bold animate-pulse-slow text-center max-w-sm"
        style={{ color: 'white' }}
      >
        {label}
      </p>
    </div>
  );
}
